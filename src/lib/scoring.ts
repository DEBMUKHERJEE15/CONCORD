import {
  TravelerProfile,
  HotelOffer,
  TransportOffer,
  ActivityOffer,
  DiningPackageOffer,
  TripSetup,
} from "../types";

export interface ComputedItineraryMetrics {
  hotelTotalINR: number;
  transportTotalINR: number;
  activitiesTotalINR: number;
  diningTotalINR: number;
  grandTotalINR: number;
  costPerPersonINR: number;
  remainingBudgetINR: number;
  nightsCount: number;
  roomCount: number;
  averageTransitMinutesPerDay: number;
  totalActivityCount: number;
  comfortScoreAvg: number;
  dailyPaceRating: "relaxed" | "moderate" | "packed";
}

export function computeNightsCount(depDate: string, retDate: string): number {
  const d1 = new Date(depDate);
  const d2 = new Date(retDate);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays); // minimum 1 night
}

export function calculateItineraryCostsAndMetrics(
  trip: TripSetup,
  hotel: HotelOffer,
  transport: TransportOffer,
  activities: ActivityOffer[],
  dining: DiningPackageOffer
): ComputedItineraryMetrics {
  const nightsCount = computeNightsCount(trip.departureDate, trip.returnDate);
  const roomCount = trip.roomCount ? Math.max(1, trip.roomCount) : Math.ceil(trip.travelerCount / 2); // user-specified or 2 persons per room standard

  let hotelTotalINR = hotel.pricePerNightINR * nightsCount * roomCount;
  if (hotel.liveOffer && hotel.liveOffer.totalStayPrice > 0) {
    hotelTotalINR = Math.round(hotel.liveOffer.totalStayPrice);
  }
  const transportTotalINR = transport.totalCostINR;
  const activitiesTotalINR = activities.reduce((sum, act) => sum + (act.costPerPersonINR * trip.travelerCount), 0);
  const diningTotalINR = dining.costPerPersonINR * trip.travelerCount;

  const grandTotalINR = hotelTotalINR + transportTotalINR + activitiesTotalINR + diningTotalINR;
  const costPerPersonINR = Math.round(grandTotalINR / trip.travelerCount);
  const remainingBudgetINR = trip.sharedBudgetINR - grandTotalINR;

  const averageTransitMinutesPerDay = transport.averageTransitMinutesPerDay;
  const totalActivityCount = activities.length;

  const comfortScoreAvg = Number((
    (hotel.comfortScore * 0.5) +
    (transport.comfortRating * 0.3) +
    (dining.comfortRating * 0.2)
  ).toFixed(1));

  let dailyPaceRating: "relaxed" | "moderate" | "packed" = "moderate";
  if (totalActivityCount <= 2 && averageTransitMinutesPerDay <= 60) {
    dailyPaceRating = "relaxed";
  } else if (totalActivityCount >= 4 || averageTransitMinutesPerDay > 90) {
    dailyPaceRating = "packed";
  }

  return {
    hotelTotalINR,
    transportTotalINR,
    activitiesTotalINR,
    diningTotalINR,
    grandTotalINR,
    costPerPersonINR,
    remainingBudgetINR,
    nightsCount,
    roomCount,
    averageTransitMinutesPerDay,
    totalActivityCount,
    comfortScoreAvg,
    dailyPaceRating,
  };
}

export function computeTravelerSatisfaction(
  traveler: TravelerProfile,
  trip: TripSetup,
  hotel: HotelOffer,
  transport: TransportOffer,
  activities: ActivityOffer[],
  dining: DiningPackageOffer,
  metrics: ComputedItineraryMetrics
): {
  totalScore: number;
  costSatisfaction: number;
  comfortSatisfaction: number;
  activitySatisfaction: number;
  transitSatisfaction: number;
  status: "meets_minimum" | "below_minimum";
  comments: string;
  factorHighlights?: string[];
} {
  const targetPerPersonBudget = trip.sharedBudgetINR / trip.travelerCount;
  const costRatio = metrics.costPerPersonINR / targetPerPersonBudget;

  // 1. Cost Satisfaction (0 to 100)
  let costSatisfaction: number;
  if (costRatio <= 0.8) {
    costSatisfaction = 96; // Under budget significantly
  } else if (costRatio <= 1.0) {
    costSatisfaction = Math.round(96 - (costRatio - 0.8) * 100); // 76 - 96
  } else {
    // Over budget penalty
    costSatisfaction = Math.max(10, Math.round(76 - (costRatio - 1.0) * 250));
  }
  // Budget Guardian extra sensitivity
  if (traveler.role === "budget_guardian") {
    if (metrics.remainingBudgetINR >= 15000) costSatisfaction = Math.min(100, costSatisfaction + 6);
    if (costRatio > 0.98) costSatisfaction = Math.max(15, costSatisfaction - 12);
  }

  // 2. Comfort Satisfaction (0 to 100)
  // Normalized from hotel stars (2.5 -> 50, 5 -> 100) and hotel comfort score
  let starScore = (hotel.stars / 5.0) * 100;
  let transportComfort = transport.comfortRating * 10;
  let diningComfort = dining.comfortRating * 10;
  let comfortSatisfaction = Math.round(starScore * 0.5 + transportComfort * 0.3 + diningComfort * 0.2);

  // Check minimum hotel stars requirement
  if (hotel.stars < traveler.preferences.minHotelStars) {
    comfortSatisfaction = Math.max(15, comfortSatisfaction - 28);
  }
  // Comfort Seeker specific expectations
  if (traveler.role === "comfort_seeker") {
    if (transport.type === "private_van") comfortSatisfaction = Math.min(100, comfortSatisfaction + 8);
    if (hotel.category === "budget") comfortSatisfaction = Math.max(10, comfortSatisfaction - 30);
  }

  // 3. Activity Satisfaction (0 to 100)
  const actCount = activities.length;
  let activitySatisfaction = 60;
  if (actCount >= traveler.preferences.minActivitiesCount) {
    activitySatisfaction = Math.min(100, 70 + (actCount - traveler.preferences.minActivitiesCount) * 12);
  } else {
    activitySatisfaction = Math.max(35, 65 - (traveler.preferences.minActivitiesCount - actCount) * 14);
  }

  // Explorer specific check
  if (traveler.role === "explorer") {
    if (actCount >= 4) activitySatisfaction = Math.min(100, activitySatisfaction + 12);
    else if (actCount >= traveler.preferences.minActivitiesCount) activitySatisfaction = Math.min(95, activitySatisfaction + 5);
    else activitySatisfaction = Math.max(40, activitySatisfaction - 10);
  }
  // Slow Traveler specific check (prefers not to be overwhelmed)
  if (traveler.role === "slow_traveler") {
    if (actCount > 3) activitySatisfaction = Math.max(35, activitySatisfaction - 15);
    else activitySatisfaction = Math.min(95, activitySatisfaction + 8);
  }

  // 4. Transit Satisfaction (0 to 100)
  const transitMins = metrics.averageTransitMinutesPerDay;
  let transitSatisfaction: number;
  if (transitMins <= traveler.preferences.maxTransitMinutesPerDay) {
    transitSatisfaction = Math.round(95 - (transitMins / traveler.preferences.maxTransitMinutesPerDay) * 20);
  } else {
    const excess = transitMins - traveler.preferences.maxTransitMinutesPerDay;
    transitSatisfaction = Math.max(15, Math.round(75 - (excess / 15) * 18));
  }

  if (traveler.role === "slow_traveler") {
    if (transport.type === "private_van" && transitMins <= 60) transitSatisfaction = 96;
    if (transitMins > 75) transitSatisfaction = Math.max(15, transitSatisfaction - 25);
  }

  // Weighted Total Score
  const totalScore = Math.round(
    traveler.weights.cost * costSatisfaction +
    traveler.weights.comfort * comfortSatisfaction +
    traveler.weights.activities * activitySatisfaction +
    traveler.weights.transit * transitSatisfaction
  );

  const status = totalScore >= traveler.minimumSatisfactionScore ? "meets_minimum" : "below_minimum";

  let comments = "";
  if (status === "below_minimum") {
    if (costSatisfaction < traveler.minimumSatisfactionScore) comments += "Cost exceeds tolerance. ";
    if (comfortSatisfaction < traveler.minimumSatisfactionScore) comments += `Hotel (${hotel.stars}★) below required standards. `;
    if (transitSatisfaction < traveler.minimumSatisfactionScore) comments += `Daily transit (${transitMins}m) causes high fatigue. `;
    if (activitySatisfaction < traveler.minimumSatisfactionScore) comments += `Activity program insufficient. `;
  } else {
    comments = `Satisfies ${traveler.roleLabel} core priorities with ${totalScore}% alignment.`;
  }

  const factorHighlights: string[] = [
    `Cost: ${costSatisfaction}% satisfaction`,
    `Comfort: ${comfortSatisfaction}% (${hotel.stars}★)`,
    `Activities: ${activitySatisfaction}% (${actCount} excursions)`,
    `Transit: ${transitSatisfaction}% (~${transitMins}m/day)`,
  ];

  return {
    totalScore,
    costSatisfaction,
    comfortSatisfaction,
    activitySatisfaction,
    transitSatisfaction,
    status,
    comments: comments.trim(),
    factorHighlights,
  };
}
