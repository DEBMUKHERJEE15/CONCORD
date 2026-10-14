import {
  TripSetup,
  TravelerProfile,
  ItineraryCandidate,
  HotelOffer,
  TransportOffer,
  ActivityOffer,
  DiningPackageOffer,
  ItineraryDaySchedule,
  ActivitySlot,
} from "../types";
import {
  DEMO_HOTELS,
  DEMO_TRANSPORTS,
  DEMO_ACTIVITIES,
  DEMO_DINING_PACKAGES,
  getOffersForDestination,
} from "../data/demo-offers";
import {
  calculateItineraryCostsAndMetrics,
  computeTravelerSatisfaction,
} from "./scoring";

export interface CandidateBlueprint {
  id: string;
  strategy: "best_balanced" | "lowest_cost" | "maximum_experience";
  strategyLabel: string;
  label: string;
  description: string;
  hotelId: string;
  transportId: string;
  activityIds: string[];
  diningId: string;
  keyConcessionsMade: string[];
}

export function buildDayByDaySchedule(
  daysCount: number,
  depDate: string,
  activities: ActivityOffer[],
  hotel: HotelOffer,
  transport: TransportOffer,
  dining: DiningPackageOffer,
  travelers: TravelerProfile[]
): ItineraryDaySchedule[] {
  const schedule: ItineraryDaySchedule[] = [];
  const baseDate = new Date(depDate);

  const hasSlowTraveler = travelers.some(
    (t) => t.role === "slow_traveler" || t.hardConstraints.mandatoryRestPeriods
  );

  let actIndex = 0;

  for (let i = 1; i <= daysCount; i++) {
    const curDate = new Date(baseDate.getTime() + (i - 1) * 24 * 60 * 60 * 1000);
    const dateFormatted = curDate.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    let morningSlot: ActivitySlot;
    let afternoonSlot: ActivitySlot;
    let eveningSlot: ActivitySlot;

    if (i === 1) {
      // Arrival Day
      morningSlot = {
        timeSlot: "10:00 AM - 01:00 PM",
        title: `Arrival, Chauffeur Reception & Check-in at ${hotel.name}`,
        category: "transit_arrival",
        description: `Private chauffeur transfer with luggage assistance. Settle into rooms at ${hotel.locationArea}.`,
        costPerPersonINR: 0,
        transitMinutes: Math.round(transport.averageTransitMinutesPerDay * 0.5),
        isRest: false,
      };

      afternoonSlot = {
        timeSlot: "01:30 PM - 04:30 PM",
        title: "Welcome Rest & Poolside Unwinding",
        category: "relaxation",
        description: `Gentle leisure period to recover from transit. Enjoy ${hotel.amenities.slice(0, 2).join(" & ")}.`,
        costPerPersonINR: 0,
        transitMinutes: 0,
        isRest: true,
      };

      const firstAct = activities[actIndex++];
      eveningSlot = firstAct
        ? {
            timeSlot: "05:30 PM - 08:30 PM",
            title: firstAct.title,
            category: firstAct.category,
            description: `Group excursion (${firstAct.durationHours} hrs). Category: ${firstAct.category}.`,
            costPerPersonINR: firstAct.costPerPersonINR,
            transitMinutes: firstAct.transitMinutes,
            isRest: false,
          }
        : {
            timeSlot: "06:00 PM - 09:00 PM",
            title: `Welcome Dinner with ${dining.name.split("(")[0]}`,
            category: "cultural_food",
            description: "Relaxed introductory dinner with regional specialties.",
            costPerPersonINR: Math.round(dining.costPerPersonINR / daysCount),
            transitMinutes: 20,
            isRest: false,
          };
    } else if (i === daysCount) {
      // Departure Day
      const finalAct = activities[actIndex++];
      morningSlot = finalAct
        ? {
            timeSlot: "09:00 AM - 11:30 AM",
            title: finalAct.title,
            category: finalAct.category,
            description: `Farewell excursion and souvenir photography (${finalAct.durationHours} hrs).`,
            costPerPersonINR: finalAct.costPerPersonINR,
            transitMinutes: finalAct.transitMinutes,
            isRest: false,
          }
        : {
            timeSlot: "09:30 AM - 11:30 AM",
            title: "Local Market Souvenirs & Cafe Brunch",
            category: "cultural_food",
            description: "Leisure stroll and artisanal shopping.",
            costPerPersonINR: 600,
            transitMinutes: 15,
            isRest: false,
          };

      afternoonSlot = {
        timeSlot: "12:00 PM - 03:00 PM",
        title: "Hotel Check-Out & Final Group Lunch",
        category: "dining",
        description: `Pack bags and settle hotel extras. Relish final group lunch near ${hotel.locationArea}.`,
        costPerPersonINR: 800,
        transitMinutes: 15,
        isRest: true,
      };

      eveningSlot = {
        timeSlot: "04:00 PM - 07:00 PM",
        title: "Direct Chauffeur Transfer to Departure Terminal",
        category: "departure",
        description: "Smooth transit back to origin with comfortable air-conditioned ride.",
        costPerPersonINR: 0,
        transitMinutes: Math.round(transport.averageTransitMinutesPerDay * 0.6),
        isRest: false,
      };
    } else {
      // Intermediate Days
      const morningAct = activities[actIndex++];
      morningSlot = morningAct
        ? {
            timeSlot: "09:30 AM - 12:30 PM",
            title: morningAct.title,
            category: morningAct.category,
            description: `${morningAct.title} (${morningAct.durationHours} hrs).`,
            costPerPersonINR: morningAct.costPerPersonINR,
            transitMinutes: morningAct.transitMinutes,
            isRest: false,
          }
        : {
            timeSlot: "09:30 AM - 12:30 PM",
            title: "Scenic Neighborhood Exploration",
            category: "sightseeing",
            description: "Self-paced neighborhood walk and architecture viewing.",
            costPerPersonINR: 400,
            transitMinutes: 15,
            isRest: false,
          };

      // Afternoon: If slow traveler or rest needed, include rest period
      if (hasSlowTraveler || i % 2 === 0) {
        afternoonSlot = {
          timeSlot: "01:30 PM - 04:30 PM",
          title: "Dedicated Midday Rest & Hydration Downtime",
          category: "relaxation",
          description: "Essential physical buffer to prevent group fatigue. Pool time or air-conditioned rest.",
          costPerPersonINR: 0,
          transitMinutes: 0,
          isRest: true,
        };
      } else {
        const afternoonAct = activities[actIndex++];
        afternoonSlot = afternoonAct
          ? {
              timeSlot: "02:00 PM - 05:00 PM",
              title: afternoonAct.title,
              category: afternoonAct.category,
              description: `${afternoonAct.title} (${afternoonAct.durationHours} hrs).`,
              costPerPersonINR: afternoonAct.costPerPersonINR,
              transitMinutes: afternoonAct.transitMinutes,
              isRest: false,
            }
          : {
              timeSlot: "02:00 PM - 04:30 PM",
              title: "Artisanal Craft & Local Cafe Tasting",
              category: "cultural_food",
              description: "Sampling authentic regional delicacies.",
              costPerPersonINR: 500,
              transitMinutes: 20,
              isRest: true,
            };
      }

      const eveningAct = activities[actIndex++];
      eveningSlot = eveningAct
        ? {
            timeSlot: "05:30 PM - 08:30 PM",
            title: eveningAct.title,
            category: eveningAct.category,
            description: `${eveningAct.title} followed by group dinner.`,
            costPerPersonINR: eveningAct.costPerPersonINR,
            transitMinutes: eveningAct.transitMinutes,
            isRest: false,
          }
        : {
            timeSlot: "06:30 PM - 09:30 PM",
            title: `Authentic Regional Dinner with ${dining.name.split("(")[0]}`,
            category: "dining",
            description: "Curated dinner pass featuring regional flavors and atmosphere.",
            costPerPersonINR: Math.round(dining.costPerPersonINR / daysCount),
            transitMinutes: 20,
            isRest: false,
          };
    }

    const dayTransit = morningSlot.transitMinutes + afternoonSlot.transitMinutes + eveningSlot.transitMinutes;
    const dayCost = morningSlot.costPerPersonINR + afternoonSlot.costPerPersonINR + eveningSlot.costPerPersonINR;

    schedule.push({
      dayNumber: i,
      dateStr: dateFormatted,
      title: `Day ${i}: ${i === 1 ? "Arrival & Welcome" : i === daysCount ? "Farewell & Departure" : "Heritage & Leisure Exploration"}`,
      theme: i === 1 ? "Arrival & Unwinding" : i === daysCount ? "Closing Moments" : "Active Culture",
      morning: morningSlot,
      afternoon: afternoonSlot,
      evening: eveningSlot,
      hotelNightName: hotel.name,
      dailyTransitMinutes: dayTransit,
      dailyEstimatedCostINR: dayCost,
    });
  }

  return schedule;
}

export function buildItineraryCandidate(
  blueprint: CandidateBlueprint,
  trip: TripSetup,
  travelers: TravelerProfile[],
  destinationOffers?: ReturnType<typeof getOffersForDestination>
): ItineraryCandidate {
  // Destination matching strictly via getOffersForDestination to eliminate leakage
  const offers = destinationOffers || getOffersForDestination(trip);
  const matchingHotels = offers.hotels;
  const matchingTransports = offers.transports;
  const matchingActivities = offers.activities;
  const matchingDining = offers.dining;

  const hotel =
    matchingHotels.find((h) => h.id === blueprint.hotelId) ||
    DEMO_HOTELS.find((h) => h.id === blueprint.hotelId) ||
    matchingHotels[0] ||
    DEMO_HOTELS[0];

  const transport =
    matchingTransports.find((t) => t.id === blueprint.transportId) ||
    DEMO_TRANSPORTS.find((t) => t.id === blueprint.transportId) ||
    matchingTransports[0] ||
    DEMO_TRANSPORTS[0];

  const activities = blueprint.activityIds
    .map((id) =>
      matchingActivities.find((a) => a.id === id) ||
      DEMO_ACTIVITIES.find((a) => a.id === id)
    )
    .filter((a): a is ActivityOffer => Boolean(a));

  const dining =
    matchingDining.find((d) => d.id === blueprint.diningId) ||
    DEMO_DINING_PACKAGES.find((d) => d.id === blueprint.diningId) ||
    matchingDining[0] ||
    DEMO_DINING_PACKAGES[0];

  const metrics = calculateItineraryCostsAndMetrics(trip, hotel, transport, activities, dining);

  const satisfactionScores: Record<string, ReturnType<typeof computeTravelerSatisfaction>> = {};
  let totalScoreSum = 0;
  const infeasibilityReasons: string[] = [];

  // Hard Constraint 1: Shared Group Budget Ceiling
  if (metrics.grandTotalINR > trip.sharedBudgetINR) {
    const deficit = metrics.grandTotalINR - trip.sharedBudgetINR;
    infeasibilityReasons.push(
      `Total cost (₹${metrics.grandTotalINR.toLocaleString("en-IN")}) exceeds shared budget (₹${trip.sharedBudgetINR.toLocaleString("en-IN")}) by ₹${deficit.toLocaleString("en-IN")}`
    );
  }

  // Hard Constraint 2: Accessibility & Mobility
  const groupNeedsAccessibility = trip.accessibilityRequired || travelers.some((t) => t.hardConstraints.accessibilityRequired);
  if (groupNeedsAccessibility) {
    if (!hotel.hasElevatorOrStepFree) {
      infeasibilityReasons.push(`Selected hotel (${hotel.name}) lacks mandatory elevator or step-free accessibility.`);
    }
    if (!transport.accessibleVehicle) {
      infeasibilityReasons.push(`Selected transport (${transport.name}) is not wheelchair/accessible vehicle.`);
    }
  }

  // Hard Constraint 3: Individual Maximum Spending Caps
  travelers.forEach((traveler) => {
    if (traveler.hardConstraints.maxIndividualBudgetINR && metrics.costPerPersonINR > traveler.hardConstraints.maxIndividualBudgetINR) {
      infeasibilityReasons.push(
        `${traveler.name}'s individual budget cap of ₹${traveler.hardConstraints.maxIndividualBudgetINR.toLocaleString("en-IN")} is exceeded by estimated per-person cost of ₹${metrics.costPerPersonINR.toLocaleString("en-IN")}.`
      );
    }
  });

  // Hard Constraint 4: Individual Minimum Satisfaction Thresholds (Non-negotiable Floors)
  travelers.forEach((traveler) => {
    const sat = computeTravelerSatisfaction(traveler, trip, hotel, transport, activities, dining, metrics);
    satisfactionScores[traveler.id] = sat;
    totalScoreSum += sat.totalScore;

    if (sat.status === "below_minimum") {
      infeasibilityReasons.push(
        `${traveler.name} (${traveler.roleLabel}) satisfaction ${sat.totalScore}% is below their mandatory minimum floor of ${traveler.minimumSatisfactionScore}%. (${sat.comments})`
      );
    }
  });

  const daysCount = metrics.nightsCount + 1;
  const daysSchedule = buildDayByDaySchedule(
    daysCount,
    trip.departureDate,
    activities,
    hotel,
    transport,
    dining,
    travelers
  );

  const restPeriodsCount = daysSchedule.reduce((count, d) => {
    return count + (d.morning.isRest ? 1 : 0) + (d.afternoon.isRest ? 1 : 0) + (d.evening.isRest ? 1 : 0);
  }, 0);

  // Hard Constraint 5: Mandatory Rest Periods
  const requiresRest = travelers.some((t) => t.hardConstraints.mandatoryRestPeriods);
  if (requiresRest && restPeriodsCount < daysCount) {
    infeasibilityReasons.push(`Requires at least 1 dedicated rest block per day for travelers with mandatory rest constraints (found ${restPeriodsCount} across ${daysCount} days).`);
  }

  const aggregateSatisfaction = Number((totalScoreSum / travelers.length).toFixed(1));
  const isFeasible = infeasibilityReasons.length === 0;

  return {
    id: blueprint.id,
    strategy: blueprint.strategy,
    strategyLabel: blueprint.strategyLabel,
    label: blueprint.label,
    description: blueprint.description,
    hotel,
    transport,
    activities,
    dining,
    daysCount,
    roomCount: metrics.roomCount,
    daysSchedule,
    costBreakdown: {
      hotelTotalINR: metrics.hotelTotalINR,
      transportTotalINR: metrics.transportTotalINR,
      activitiesTotalINR: metrics.activitiesTotalINR,
      diningTotalINR: metrics.diningTotalINR,
      grandTotalINR: metrics.grandTotalINR,
      costPerPersonINR: metrics.costPerPersonINR,
      remainingBudgetINR: metrics.remainingBudgetINR,
    },
    metrics: {
      averageTransitMinutesPerDay: metrics.averageTransitMinutesPerDay,
      totalActivityCount: metrics.totalActivityCount,
      comfortScoreAvg: metrics.comfortScoreAvg,
      dailyPaceRating: metrics.dailyPaceRating,
      restPeriodsCount,
    },
    satisfactionScores,
    aggregateSatisfaction,
    isFeasible,
    infeasibilityReasons: infeasibilityReasons.length > 0 ? infeasibilityReasons : undefined,
    keyConcessionsMade: blueprint.keyConcessionsMade,
    inventoryState: offers.inventoryState,
    inventoryNotice: offers.inventoryNotice,
  };
}

export function generateCandidateItineraries(
  trip: TripSetup,
  travelers: TravelerProfile[]
): ItineraryCandidate[] {
  const offers = getOffersForDestination(trip);
  const destLower = trip.destination.toLowerCase();

  let blueprints: CandidateBlueprint[];

  if (destLower.includes("jaipur")) {
    blueprints = [
      {
        id: "candidate-balanced-compromise",
        strategy: "best_balanced",
        strategyLabel: "Best Balanced",
        label: "Best Balanced: Royal Heritage & Chauffeur Harmony",
        description:
          "Recommended Pareto compromise: 4-star boutique courtyard haveli in Bani Park, dedicated tourist van, and 3 curated cultural excursions with built-in afternoon haveli rest.",
        hotelId: "hotel-jaipur-haveli",
        transportId: "trans-jaipur-innova",
        activityIds: ["act-city-palace-museum", "act-chokhi-dhani", "act-nahargarh-sunset"],
        diningId: "dining-royal-thali",
        keyConcessionsMade: [
          "Comfort Seeker accepted boutique haveli over luxury palace resort, saving ₹73,600.",
          "Budget Guardian approved dedicated van to respect Slow Traveler's low transit fatigue constraint.",
          "Explorer agreed on 3 deep royal tours rather than packed circuit.",
        ],
      },
      {
        id: "candidate-lowest-cost",
        strategy: "lowest_cost",
        strategyLabel: "Lowest Cost",
        label: "Lowest Cost: Budget-Conscious Pink City Discovery",
        description:
          "Cost-minimized plan: 2.5-star central hotel, city cab passes, and 2 high-value cultural excursions, maximizing group savings while satisfying mandatory satisfaction floors.",
        hotelId: "hotel-jaipur-budget-inn",
        transportId: "trans-jaipur-cabs",
        activityIds: ["act-city-palace-museum", "act-nahargarh-sunset"],
        diningId: "dining-jaipur-street",
        keyConcessionsMade: [
          "Comfort Seeker yielded on luxury amenities to generate maximum budget surplus.",
          "Explorer accepted 2 excursions to eliminate optional fees.",
        ],
      },
      {
        id: "candidate-maximum-experience",
        strategy: "maximum_experience",
        strategyLabel: "Maximum Experience",
        label: "Maximum Experience: Grand Forts & Cultural Immersion",
        description:
          "Experience-focused itinerary: 4-star heritage haveli, dedicated van, and 4 extensive guided tours covering Amber Fort, City Palace, Chokhi Dhani, and Nahargarh sunset.",
        hotelId: "hotel-jaipur-haveli",
        transportId: "trans-jaipur-innova",
        activityIds: [
          "act-amber-fort",
          "act-city-palace-museum",
          "act-chokhi-dhani",
          "act-nahargarh-sunset",
        ],
        diningId: "dining-royal-thali",
        keyConcessionsMade: [
          "Budget Guardian conceded extra activity spend (₹1,400/p) for complete heritage immersion.",
          "Slow Traveler accommodated Amber Fort walking climb with extra rest evening.",
        ],
      },
    ];
  } else if (destLower.includes("goa")) {
    blueprints = [
      {
        id: "candidate-balanced-compromise",
        strategy: "best_balanced",
        strategyLabel: "Best Balanced",
        label: "Best Balanced: Coastal Heritage & Chauffeur Harmony",
        description:
          "The recommended Pareto-optimal consensus: 4-star boutique villa in Candolim, dedicated chauffeur van to minimize transit fatigue, and 3 curated excursions with afternoon rest.",
        hotelId: "hotel-goa-coastal-nest",
        transportId: "trans-goa-private-innova",
        activityIds: ["act-goa-fontainhas-walk", "act-goa-spice-plantation", "act-goa-catamaran-sunset"],
        diningId: "dining-goa-heritage-coastal",
        keyConcessionsMade: [
          "Comfort Seeker yielded 5-star seaside resort in favor of 4-star boutique villa, preventing budget overrun.",
          "Budget Guardian approved private chauffeur van to keep transit time at 55m/day for Slow Traveler.",
          "Explorer agreed to 3 quality excursions, avoiding rushed transfers.",
        ],
      },
      {
        id: "candidate-lowest-cost",
        strategy: "lowest_cost",
        strategyLabel: "Lowest Cost",
        label: "Lowest Cost: Smart Value & Independent Mobility",
        description:
          "Financial-first optimization: 3.5-star comfortable suites, on-demand app cabs, and 2 high-value excursions, generating high group budget savings while meeting all mandatory floors.",
        hotelId: "hotel-goa-palmetto-comfort",
        transportId: "trans-goa-shared-cabs",
        activityIds: ["act-goa-fontainhas-walk", "act-goa-aguada-heritage"],
        diningId: "dining-goa-street-casual",
        keyConcessionsMade: [
          "Comfort Seeker yielded private van for on-demand cabs, saving ₹7,000.",
          "Explorer yielded catamaran sailing to maintain maximum savings for Budget Guardian.",
          "Slow Traveler accepted slightly higher cab coordination time in exchange for unhurried days.",
        ],
      },
      {
        id: "candidate-maximum-experience",
        strategy: "maximum_experience",
        strategyLabel: "Maximum Experience",
        label: "Maximum Experience: Coastal Adventure & Island Circuit",
        description:
          "Experience-dense itinerary: 4-star boutique stay with dedicated van and 4 comprehensive excursions (Fontainhas walk, spice plantation, sunset sailing, and Fort Aguada).",
        hotelId: "hotel-goa-coastal-nest",
        transportId: "trans-goa-private-innova",
        activityIds: [
          "act-goa-fontainhas-walk",
          "act-goa-spice-plantation",
          "act-goa-catamaran-sunset",
          "act-goa-aguada-heritage",
        ],
        diningId: "dining-goa-heritage-coastal",
        keyConcessionsMade: [
          "Budget Guardian accepted spending closer to budget ceiling to enable 4 full group excursions.",
          "Slow Traveler accepted 4 activities because dedicated AC chauffeur prevents transit fatigue.",
        ],
      },
    ];
  } else if (destLower.includes("tokyo")) {
    blueprints = [
      {
        id: "candidate-balanced-compromise",
        strategy: "best_balanced",
        strategyLabel: "Best Balanced",
        label: "Best Balanced: Modern Tokyo & Seamless Transit Pass",
        description:
          "Balanced consensus: 4-star Shinjuku boutique hotel, high-efficiency Tokyo subway pass, and 3 cultural & iconic excursions with midday rest buffers.",
        hotelId: "hotel-tokyo-granbell",
        transportId: "trans-tokyo-metro",
        activityIds: ["act-tokyo-shibuya-sky", "act-tokyo-teamlab", "act-tokyo-sensoji"],
        diningId: "dining-tokyo-izakaya",
        keyConcessionsMade: [
          "Comfort Seeker accepted boutique stay over luxury onsen ryokan, preserving group budget.",
          "Budget Guardian approved rapid subway unlimited pass for efficient citywide transit.",
          "Explorer selected top 3 digital and historic icons with built-in rest.",
        ],
      },
      {
        id: "candidate-lowest-cost",
        strategy: "lowest_cost",
        strategyLabel: "Lowest Cost",
        label: "Lowest Cost: Smart Explorer & Subway Navigation",
        description:
          "Cost-optimized Tokyo journey: Asakusa traditional stay, unlimited metro pass, and 2 signature cultural excursions maximizing yen savings.",
        hotelId: "hotel-tokyo-budget",
        transportId: "trans-tokyo-metro",
        activityIds: ["act-tokyo-sensoji", "act-tokyo-tsukiji"],
        diningId: "dining-tokyo-ramen",
        keyConcessionsMade: [
          "Comfort Seeker accepted pod/inn stay to generate maximum budget surplus.",
          "Explorer prioritized Senso-ji and Tsukiji morning market.",
        ],
      },
      {
        id: "candidate-maximum-experience",
        strategy: "maximum_experience",
        strategyLabel: "Maximum Experience",
        label: "Maximum Experience: Imperial Elegance & Tech Art Immersion",
        description:
          "High-immersion Tokyo itinerary: 4-star boutique stay, private Alphard van, and all 4 immersive activities including teamLab Planets and Shibuya Sky.",
        hotelId: "hotel-tokyo-granbell",
        transportId: "trans-tokyo-private-van",
        activityIds: ["act-tokyo-shibuya-sky", "act-tokyo-teamlab", "act-tokyo-sensoji", "act-tokyo-tsukiji"],
        diningId: "dining-tokyo-kaiseki",
        keyConcessionsMade: [
          "Budget Guardian accepted luxury van transport for group comfort and zero transit fatigue.",
          "Slow Traveler supported full activity slate due to seamless door-to-door transit.",
        ],
      },
    ];
  } else if (destLower.includes("paris")) {
    blueprints = [
      {
        id: "candidate-balanced-compromise",
        strategy: "best_balanced",
        strategyLabel: "Best Balanced",
        label: "Best Balanced: Le Marais Charm & Seine Evening Cruise",
        description:
          "Balanced Parisian experience: 4-star Marais boutique stay, central taxi/rideshare pass, and 3 iconic cultural visits with afternoon cafe downtime.",
        hotelId: "hotel-paris-marais",
        transportId: "trans-paris-cabs",
        activityIds: ["act-paris-louvre", "act-paris-seine-cruise", "act-paris-eiffel-tower"],
        diningId: "dining-paris-bistro",
        keyConcessionsMade: [
          "Comfort Seeker accepted charming Marais boutique over palace hotel.",
          "Budget Guardian approved rideshare pass to eliminate stairs and metro walking fatigue.",
          "Explorer focused on Louvre and Seine evening sunset cruise.",
        ],
      },
      {
        id: "candidate-lowest-cost",
        strategy: "lowest_cost",
        strategyLabel: "Lowest Cost",
        label: "Lowest Cost: Montmartre Bohemian & Metro Discovery",
        description:
          "Value-maximized Paris trip: Montmartre inn, Paris Visite metro pass, and 2 signature visits (Louvre & Eiffel Tower).",
        hotelId: "hotel-paris-budget",
        transportId: "trans-paris-metro",
        activityIds: ["act-paris-louvre", "act-paris-eiffel-tower"],
        diningId: "dining-paris-bakery-crepe",
        keyConcessionsMade: [
          "Comfort Seeker yielded boutique amenities for maximum group savings.",
          "Explorer trimmed Versailles excursion to respect budget limits.",
        ],
      },
      {
        id: "candidate-maximum-experience",
        strategy: "maximum_experience",
        strategyLabel: "Maximum Experience",
        label: "Maximum Experience: Grand Monarchy & Michelin-Grade Dining",
        description:
          "Complete Parisian itinerary: Marais boutique hotel, private Mercedes chauffeured van, and full 4-excursion circuit including Versailles and Louvre.",
        hotelId: "hotel-paris-marais",
        transportId: "trans-paris-private-van",
        activityIds: ["act-paris-louvre", "act-paris-seine-cruise", "act-paris-versailles", "act-paris-eiffel-tower"],
        diningId: "dining-paris-fine-dining",
        keyConcessionsMade: [
          "Budget Guardian agreed to dedicated private van to enable effortless Versailles day trip.",
          "Slow Traveler accommodated packed cultural days thanks to dedicated chauffeur vehicle.",
        ],
      },
    ];
  } else if (destLower.includes("kolkata")) {
    blueprints = [
      {
        id: "candidate-balanced-compromise",
        strategy: "best_balanced",
        strategyLabel: "Best Balanced",
        label: "Best Balanced: Colonial Heritage & AC Coach Harmony",
        description:
          "Balanced compromise: 4-star Elgin Fairlawn heritage stay, dedicated private AC coach, and 3 cultural landmarks with afternoon tea buffers.",
        hotelId: "hotel-kolkata-boutique",
        transportId: "trans-kolkata-van",
        activityIds: ["act-kolkata-victoria", "act-kolkata-howrah", "act-kolkata-kumartuli"],
        diningId: "dining-kolkata-bhoj",
        keyConcessionsMade: [
          "Comfort Seeker accepted heritage boutique hotel over 5-star palace, saving substantially.",
          "Budget Guardian approved dedicated coach to minimize transit humidity and walking fatigue.",
          "Explorer selected top 3 colonial and artisanal highlights.",
        ],
      },
      {
        id: "candidate-lowest-cost",
        strategy: "lowest_cost",
        strategyLabel: "Lowest Cost",
        label: "Lowest Cost: Park Street Value & Metro Exploration",
        description:
          "Budget-conscious Kolkata journey: central Park Street stay, city cabs and metro rail, and 2 signature excursions.",
        hotelId: "hotel-kolkata-budget",
        transportId: "trans-kolkata-cabs",
        activityIds: ["act-kolkata-victoria", "act-kolkata-howrah"],
        diningId: "dining-kolkata-street",
        keyConcessionsMade: [
          "Comfort Seeker accepted simple budget rooms to generate savings.",
          "Explorer concentrated on Victoria Memorial and Howrah boat ride.",
        ],
      },
      {
        id: "candidate-maximum-experience",
        strategy: "maximum_experience",
        strategyLabel: "Maximum Experience",
        label: "Maximum Experience: Grand City of Joy & Temple Circuit",
        description:
          "Full cultural immersion: Heritage boutique stay, private AC coach, and all 4 excursions including Dakshineswar and Kumartuli.",
        hotelId: "hotel-kolkata-boutique",
        transportId: "trans-kolkata-van",
        activityIds: ["act-kolkata-victoria", "act-kolkata-howrah", "act-kolkata-kumartuli", "act-kolkata-dakshineswar"],
        diningId: "dining-kolkata-bhoj",
        keyConcessionsMade: [
          "Budget Guardian approved full excursion pass to cover riverfront temples.",
          "Slow Traveler accommodated temple tour with dedicated vehicle air-conditioning.",
        ],
      },
    ];
  } else if (destLower.includes("london")) {
    blueprints = [
      {
        id: "candidate-balanced-compromise",
        strategy: "best_balanced",
        strategyLabel: "Best Balanced",
        label: "Best Balanced: West End Heritage & Visitor Tube Pass",
        description:
          "Balanced compromise: 4-star Bloomsbury boutique hotel, Oyster card pass, and 3 iconic highlights with afternoon tea rest.",
        hotelId: "hotel-london-bloomsbury",
        transportId: "trans-london-tube",
        activityIds: ["act-london-tower", "act-london-british-museum", "act-london-eye"],
        diningId: "dining-london-afternoon-tea",
        keyConcessionsMade: [
          "Comfort Seeker accepted Bloomsbury 4-star boutique instead of 5-star palace on the Strand.",
          "Budget Guardian approved Visitor Oyster pass for fast, economical mobility.",
          "Explorer picked top 3 West End and riverfront icons.",
        ],
      },
      {
        id: "candidate-lowest-cost",
        strategy: "lowest_cost",
        strategyLabel: "Lowest Cost",
        label: "Lowest Cost: Transit Hub Stay & Iconic Sights",
        description:
          "Value-focused London trip: King's Cross transit inn, tube pass, and 2 signature landmarks (Tower of London & British Museum).",
        hotelId: "hotel-london-budget",
        transportId: "trans-london-tube",
        activityIds: ["act-london-tower", "act-london-british-museum"],
        diningId: "dining-london-borough-market",
        keyConcessionsMade: [
          "Comfort Seeker yielded boutique luxury for maximum group budget savings.",
          "Explorer prioritized top 2 world-class historic attractions.",
        ],
      },
      {
        id: "candidate-maximum-experience",
        strategy: "maximum_experience",
        strategyLabel: "Maximum Experience",
        label: "Maximum Experience: Royal Landmarks & Chauffeur Mobility",
        description:
          "Luxury experience: 4-star Bloomsbury stay, private Mercedes chauffeur van, and all 4 major London excursions.",
        hotelId: "hotel-london-bloomsbury",
        transportId: "trans-london-van",
        activityIds: ["act-london-tower", "act-london-british-museum", "act-london-eye", "act-london-westminster"],
        diningId: "dining-london-pub-roast",
        keyConcessionsMade: [
          "Budget Guardian approved private chauffeur van to eliminate tube congestion and stairs.",
          "Slow Traveler experienced all 4 attractions comfortably with private vehicle transport.",
        ],
      },
    ];
  } else {
    // Dynamic generation for arbitrary destination or non-preset city
    const hotels = offers.hotels;
    const transports = offers.transports;
    const activities = offers.activities;
    const dining = offers.dining;

    const balancedHotel = hotels.find((h) => h.stars >= 3.5 && h.stars <= 4.5) || hotels[0];
    const budgetHotel = hotels.find((h) => h.stars <= 3) || hotels[hotels.length - 1];
    const luxuryHotel = hotels.find((h) => h.stars >= 4.5) || balancedHotel;

    const vanTransport = transports.find((t) => t.type === "private_van") || transports[0];
    const cabTransport = transports.find((t) => t.type === "shared_cab" || t.type === "public_metro_bus") || transports[transports.length - 1];

    const balancedDining = dining.find((d) => d.category === "heritage_royal" || d.category === "casual_coastal") || dining[0];
    const budgetDining = dining.find((d) => d.category === "street_local") || dining[dining.length - 1];
    const luxuryDining = dining.find((d) => d.category === "fine_dining") || balancedDining;

    const actIdsBalanced = activities.slice(0, Math.min(3, activities.length)).map((a) => a.id);
    const actIdsBudget = activities.slice(0, Math.min(2, activities.length)).map((a) => a.id);
    const actIdsExperience = activities.slice(0, Math.min(4, activities.length)).map((a) => a.id);

    const destName = trip.destinationDetails?.displayName?.split(",")[0] || trip.destination;

    blueprints = [
      {
        id: "candidate-balanced-compromise",
        strategy: "best_balanced",
        strategyLabel: "Best Balanced",
        label: `Best Balanced: ${destName} Harmony & Comfort Compromise`,
        description: `Balanced consensus: Quality accommodations in ${destName}, comfortable dedicated transport, and 3 curated activities with daily rest buffers.`,
        hotelId: balancedHotel.id,
        transportId: vanTransport.id,
        activityIds: actIdsBalanced,
        diningId: balancedDining.id,
        keyConcessionsMade: [
          `Comfort Seeker approved boutique ${balancedHotel.stars}-star stay rather than luxury resort, protecting group budget.`,
          `Budget Guardian approved comfortable transport to prevent group fatigue.`,
          `Explorer agreed on 3 signature excursions with dedicated midday rest periods.`,
        ],
      },
      {
        id: "candidate-lowest-cost",
        strategy: "lowest_cost",
        strategyLabel: "Lowest Cost",
        label: `Lowest Cost: Smart Value & Essential ${destName} Highlights`,
        description: `Cost-optimized plan: Economical lodging in ${destName}, affordable transit, and 2 signature excursions maximizing group savings.`,
        hotelId: budgetHotel.id,
        transportId: cabTransport.id,
        activityIds: actIdsBudget,
        diningId: budgetDining.id,
        keyConcessionsMade: [
          `Comfort Seeker yielded luxury amenities in favor of maximum group savings.`,
          `Explorer accepted 2 prioritized excursions to eliminate optional fees.`,
        ],
      },
      {
        id: "candidate-maximum-experience",
        strategy: "maximum_experience",
        strategyLabel: "Maximum Experience",
        label: `Maximum Experience: Comprehensive ${destName} Cultural Immersion`,
        description: `Experience-focused itinerary: Top-tier lodging in ${destName}, dedicated vehicle, and full activity circuit with premium dining.`,
        hotelId: luxuryHotel.id,
        transportId: vanTransport.id,
        activityIds: actIdsExperience,
        diningId: luxuryDining.id,
        keyConcessionsMade: [
          `Budget Guardian approved spending closer to budget ceiling to enable complete excursion circuit.`,
          `Slow Traveler accommodated full schedule supported by door-to-door transit.`,
        ],
      },
    ];
  }

  return blueprints.map((bp) => buildItineraryCandidate(bp, trip, travelers, offers));
}

/**
 * Deterministic Pareto Decision Policy:
 * 1. Must satisfy all hard constraints (grandTotal <= budget, accessibility met, floor met).
 * 2. Balance overall group satisfaction and budget efficiency while maximizing the minimum individual score.
 * 3. Tie-breaker: choose candidate with higher remaining budget margin.
 */
export function selectBestCandidate(candidates: ItineraryCandidate[]): {
  best: ItineraryCandidate;
  feasibleCount: number;
  policyNotes: string;
} {
  const feasibleList = candidates.filter((c) => c.isFeasible);

  if (feasibleList.length > 0) {
    // Sort primarily by best_balanced, then highest aggregate satisfaction, then budget margin
    feasibleList.sort((a, b) => {
      if (a.strategy === "best_balanced" && b.strategy !== "best_balanced") return -1;
      if (b.strategy === "best_balanced" && a.strategy !== "best_balanced") return 1;
      if (b.aggregateSatisfaction !== a.aggregateSatisfaction) {
        return b.aggregateSatisfaction - a.aggregateSatisfaction;
      }
      return b.costBreakdown.remainingBudgetINR - a.costBreakdown.remainingBudgetINR;
    });

    return {
      best: feasibleList[0],
      feasibleCount: feasibleList.length,
      policyNotes: `Selected under Pareto-Efficiency policy: Strategy "${feasibleList[0].strategyLabel}" achieves ${feasibleList[0].aggregateSatisfaction}% aggregate utility with all individual traveler minimum thresholds satisfied and ₹${feasibleList[0].costBreakdown.remainingBudgetINR.toLocaleString("en-IN")} buffer.`,
    };
  }

  // If none feasible, pick the candidate closest to the budget ceiling
  const sortedByDeficit = [...candidates].sort((a, b) => {
    return a.costBreakdown.grandTotalINR - b.costBreakdown.grandTotalINR;
  });

  return {
    best: sortedByDeficit[0],
    feasibleCount: 0,
    policyNotes: `Infeasible: No candidate satisfied both the shared budget and individual satisfaction minimum floors. Nearest option has ₹${Math.abs(sortedByDeficit[0].costBreakdown.remainingBudgetINR).toLocaleString("en-IN")} deficit.`,
  };
}
