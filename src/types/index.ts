import { z } from "zod";

export type TravelerRole =
  | "budget_guardian"
  | "comfort_seeker"
  | "explorer"
  | "slow_traveler"
  | "custom";

export type TripType =
  | "weekend"
  | "leisure"
  | "adventure"
  | "family"
  | "business"
  | "custom";

export type PreferredTransportType =
  | "train"
  | "bus"
  | "flight"
  | "car"
  | "flexible";

export type AccommodationPreferenceType =
  | "hostel"
  | "budget_hotel"
  | "standard_hotel"
  | "premium_hotel"
  | "flexible";

export interface TravelerHardConstraints {
  maxIndividualBudgetINR?: number;
  accessibilityRequired?: boolean; // Step-free, ground floor, elevator, reduced walking
  mandatoryRestPeriods?: boolean; // Requires dedicated 2-hr afternoon downtime
  dietaryOrMedicalRestrictions?: string[];
  unacceptableActivities?: string[];
}

export interface TravelerSoftPreferences {
  budgetSensitivity: number; // 1-10
  comfort: number; // 1-10
  sightseeing: number; // 1-10
  foodExperiences: number; // 1-10
  adventure: number; // 1-10
  relaxation: number; // 1-10
  travelConvenience: number; // 1-10
  accommodationQuality: number; // 1-10
  dailyActivityIntensity: "relaxed" | "moderate" | "packed";
}

export interface TravelerProfile {
  id: string;
  name: string;
  role: TravelerRole;
  roleLabel: string;
  avatarColor: string;
  preferences: {
    minHotelStars: number;
    preferredPace: "relaxed" | "moderate" | "packed";
    minActivitiesCount: number;
    maxTransitMinutesPerDay: number;
    mustHaveAmenities: string[];
    interestTags: string[];
    ratings?: TravelerSoftPreferences;
  };
  hardConstraints: TravelerHardConstraints;
  minimumSatisfactionScore: number; // Hard floor (0-100)
  weights: {
    cost: number;
    comfort: number;
    activities: number;
    transit: number;
  };
}

export interface DestinationObject {
  id: string;
  name: string;
  displayName: string;
  country?: string;
  region?: string;
  state?: string;
  countryCode?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  latitude?: number;
  longitude?: number;
  osmType?: string;
  osmId?: number | string;
  isVerified: boolean;
  isManual?: boolean;
  source: "photon" | "manual";
}

export type InventoryDataState =
  | "demo_data"
  | "manual_estimates"
  | "verified_provider_data"
  | "insufficient_data";

export interface TripSetup {
  origin: string;
  destination: string;
  originDetails?: DestinationObject;
  destinationDetails?: DestinationObject;
  departureDate: string;
  returnDate: string;
  travelerCount: number;
  sharedBudgetINR: number;
  currency: "INR" | "USD" | "EUR";
  tripType: TripType;
  preferredTransport: PreferredTransportType;
  accommodationPreference: AccommodationPreferenceType;
  accessibilityRequired: boolean;
  freeTextNotes?: string;
  travelStyle: string;
  interests: string[];
  inventoryState?: InventoryDataState;
  customEstimates?: {
    hotelPricePerNightINR?: number;
    transportTotalCostINR?: number;
    activityBudgetPerPersonINR?: number;
  };
}

export type InventoryTag =
  | "DEMO DATA — NOT LIVE PRICES"
  | "MANUAL ESTIMATES — NOT LIVE PRICES"
  | "VERIFIED DATA — LIVE PROVIDER";

// Demo Inventory Offer Types (Clearly Marked DEMO DATA)
export interface HotelOffer {
  id: string;
  destination: string;
  name: string;
  category: "budget" | "boutique" | "luxury_resort" | "standard";
  stars: number;
  pricePerNightINR: number;
  locationArea: string;
  amenities: string[];
  hasElevatorOrStepFree: boolean;
  comfortScore: number; // 1-10
  transitAccessibilityScore: number; // 1-10
  tag: InventoryTag;
}

export interface TransportOffer {
  id: string;
  destination: string;
  type: "shared_cab" | "private_van" | "self_drive_suv" | "public_metro_bus" | "train_express";
  name: string;
  totalCostINR: number;
  averageTransitMinutesPerDay: number;
  comfortRating: number; // 1-10
  transitFatigueScore: number; // 1-10
  accessibleVehicle: boolean;
  tag: InventoryTag;
}

export interface ActivityOffer {
  id: string;
  destination: string;
  title: string;
  category: "sightseeing" | "relaxation" | "adventure" | "cultural_food";
  costPerPersonINR: number;
  durationHours: number;
  transitMinutes: number;
  energyLevel: "low" | "medium" | "high";
  isWheelchairAccessible: boolean;
  tag: InventoryTag;
}

export interface DiningPackageOffer {
  id: string;
  destination: string;
  name: string;
  category: "street_local" | "casual_coastal" | "fine_dining" | "heritage_royal";
  costPerPersonINR: number;
  comfortRating: number;
  tag: InventoryTag;
}

export interface ActivitySlot {
  timeSlot: string; // e.g. "09:30 AM - 12:30 PM"
  title: string;
  category: string;
  description: string;
  costPerPersonINR: number;
  transitMinutes: number;
  isRest: boolean;
}

export interface ItineraryDaySchedule {
  dayNumber: number;
  dateStr: string;
  title: string;
  theme: string;
  morning: ActivitySlot;
  afternoon: ActivitySlot;
  evening: ActivitySlot;
  hotelNightName: string;
  dailyTransitMinutes: number;
  dailyEstimatedCostINR: number;
}

// Complete Itinerary Candidate
export interface ItineraryCandidate {
  id: string;
  strategy: "best_balanced" | "lowest_cost" | "maximum_experience";
  strategyLabel: string;
  label: string;
  description: string;
  hotel: HotelOffer;
  transport: TransportOffer;
  activities: ActivityOffer[];
  dining: DiningPackageOffer;
  daysCount: number;
  roomCount: number;
  daysSchedule: ItineraryDaySchedule[];

  costBreakdown: {
    hotelTotalINR: number;
    transportTotalINR: number;
    activitiesTotalINR: number;
    diningTotalINR: number;
    grandTotalINR: number;
    costPerPersonINR: number;
    remainingBudgetINR: number;
  };

  metrics: {
    averageTransitMinutesPerDay: number;
    totalActivityCount: number;
    comfortScoreAvg: number;
    dailyPaceRating: "relaxed" | "moderate" | "packed";
    restPeriodsCount: number;
  };

  satisfactionScores: Record<string, {
    totalScore: number; // 0-100
    costSatisfaction: number;
    comfortSatisfaction: number;
    activitySatisfaction: number;
    transitSatisfaction: number;
    status: "meets_minimum" | "below_minimum";
    comments: string;
    factorHighlights?: string[];
  }>;

  aggregateSatisfaction: number; // 0-100
  isFeasible: boolean;
  infeasibilityReasons?: string[];
  keyConcessionsMade: string[];
  inventoryState?: InventoryDataState;
  inventoryNotice?: string;
}

export interface NegotiationTimelineEvent {
  round: number;
  stage: "conflict_detected" | "initial_proposal" | "objection" | "counterproposal" | "accepted_compromise";
  actor: string;
  title: string;
  detail: string;
  concessionNote?: string;
  timestamp: string;
  costImpactINR?: number;
  beneficiaries?: string[];
  conceders?: string[];
  hardConstraintAffected?: string;
}

export interface TradeoffLedgerItem {
  id: string;
  decisionArea: "Accommodation" | "Transport" | "Activities" | "Dining" | "Budget Allocation";
  originalDecision: string;
  changedDecision: string;
  costDifferenceINR: number; // positive = saved money, negative = extra cost
  whoBenefits: string[];
  whoConcedes: string[];
  reason: string;
  quantifiedImpact: string;
  isAcceptedByPolicy: boolean;
}

export interface ConstraintCheck {
  id: string;
  name: string;
  category: "budget" | "hotel" | "schedule" | "transit" | "traveler_floor" | "catalog" | "accessibility" | "destination_isolation";
  status: "PASS" | "FAIL";
  expected: string;
  actual: string;
  details: string;
}

export interface ValidationReport {
  overallValid: boolean;
  checks: ConstraintCheck[];
  summaryNote: string;
}

export interface ConflictAnalysisResult {
  conflicts: Array<{
    dimension: "budget_vs_comfort" | "pace_vs_sightseeing" | "transit_tolerance" | "amenity_standards";
    severity: "high" | "medium" | "low";
    partiesInvolved: string[];
    description: string;
    tradeoffOpportunity: string;
  }>;
  consensusBaseline: string;
  keyStickingPoint: string;
}

export interface NegotiationResponse {
  candidates: ItineraryCandidate[];
  selectedCandidateId: string;
  timeline: NegotiationTimelineEvent[];
  tradeoffs: TradeoffLedgerItem[];
  validation: ValidationReport;
  conflictAnalysis: ConflictAnalysisResult;
  negotiationRoundsCount: number;
  gemmaModelUsed: string;
  explanation: {
    headline: string;
    detailedCompromiseNarrative: string;
    travelerOutcomes: Array<{
      travelerName: string;
      role: TravelerRole;
      score: number;
      gain: string;
      concession: string;
    }>;
  };
}

export interface SavedTripSession {
  id: string;
  name: string;
  createdAt: string;
  trip: TripSetup;
  travelers: TravelerProfile[];
  selectedCandidateId?: string;
  negotiationResponse?: NegotiationResponse;
}
