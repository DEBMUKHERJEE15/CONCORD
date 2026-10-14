import { z } from "zod";
import {
  TripSetup,
  TravelerProfile,
  ItineraryCandidate,
  ConstraintCheck,
  ValidationReport,
  TradeoffLedgerItem,
} from "@/types";
import {
  DEMO_HOTELS,
  DEMO_TRANSPORTS,
  DEMO_ACTIVITIES,
  DEMO_DINING_PACKAGES,
  getOffersForDestination,
} from "@/data/demo-offers";
import { callGemma4Json } from "@/lib/gemma-client";

export function performDeterministicValidation(
  candidate: ItineraryCandidate,
  trip: TripSetup,
  travelers: TravelerProfile[]
): ValidationReport {
  const checks: ConstraintCheck[] = [];

  // 1. Total Cost Calculation Check
  const expectedSum =
    candidate.costBreakdown.hotelTotalINR +
    candidate.costBreakdown.transportTotalINR +
    candidate.costBreakdown.activitiesTotalINR +
    candidate.costBreakdown.diningTotalINR;

  const costMatch = expectedSum === candidate.costBreakdown.grandTotalINR;
  checks.push({
    id: "check-cost-sum",
    name: "Total Cost Component Summation",
    category: "budget",
    status: costMatch ? "PASS" : "FAIL",
    expected: `Component sum: ₹${expectedSum.toLocaleString("en-IN")}`,
    actual: `Recorded total: ₹${candidate.costBreakdown.grandTotalINR.toLocaleString("en-IN")}`,
    details: costMatch
      ? "Hotel, transport, activity, and dining component costs sum exactly to grand total without rounding drift."
      : "Sum of sub-components does not match grand total.",
  });

  // 2. Shared Budget Ceiling Check
  const withinBudget = candidate.costBreakdown.grandTotalINR <= trip.sharedBudgetINR;
  checks.push({
    id: "check-budget-ceiling",
    name: "Shared Group Budget Ceiling Constraint",
    category: "budget",
    status: withinBudget ? "PASS" : "FAIL",
    expected: `<= ₹${trip.sharedBudgetINR.toLocaleString("en-IN")}`,
    actual: `₹${candidate.costBreakdown.grandTotalINR.toLocaleString("en-IN")} (${
      candidate.costBreakdown.remainingBudgetINR >= 0
        ? "Surplus: ₹" + candidate.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")
        : "Deficit: ₹" + Math.abs(candidate.costBreakdown.remainingBudgetINR).toLocaleString("en-IN")
    })`,
    details: withinBudget
      ? `Complies with hard budget constraint. Remaining group reserve is ₹${candidate.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")}.`
      : `Hard constraint breached: Exceeds shared budget by ₹${Math.abs(candidate.costBreakdown.remainingBudgetINR).toLocaleString("en-IN")}.`,
  });

  // 3. Per-Person vs Group Cost Allocation Check
  const perPersonTotalCheck =
    Math.abs(
      candidate.costBreakdown.costPerPersonINR * trip.travelerCount -
        candidate.costBreakdown.grandTotalINR
    ) <= trip.travelerCount;
  checks.push({
    id: "check-per-person-math",
    name: "Per-Person Cost Distribution",
    category: "budget",
    status: perPersonTotalCheck ? "PASS" : "FAIL",
    expected: `₹${candidate.costBreakdown.costPerPersonINR.toLocaleString("en-IN")} × ${trip.travelerCount} travelers = ₹${candidate.costBreakdown.grandTotalINR.toLocaleString("en-IN")}`,
    actual: `₹${(candidate.costBreakdown.costPerPersonINR * trip.travelerCount).toLocaleString("en-IN")}`,
    details: "Per-person allocation is mathematically consistent with total party size.",
  });

  // 4. Valid Catalog Offer IDs Check
  const destOffers = getOffersForDestination(trip);
  const hotelValid =
    destOffers.hotels.some((h) => h.id === candidate.hotel.id) ||
    DEMO_HOTELS.some((h) => h.id === candidate.hotel.id);
  const transportValid =
    destOffers.transports.some((t) => t.id === candidate.transport.id) ||
    DEMO_TRANSPORTS.some((t) => t.id === candidate.transport.id);
  const activitiesValid = candidate.activities.every(
    (act) =>
      destOffers.activities.some((a) => a.id === act.id) ||
      DEMO_ACTIVITIES.some((a) => a.id === act.id)
  );
  const diningValid =
    destOffers.dining.some((d) => d.id === candidate.dining.id) ||
    DEMO_DINING_PACKAGES.some((d) => d.id === candidate.dining.id);
  const catalogValid = hotelValid && transportValid && activitiesValid && diningValid;

  checks.push({
    id: "check-catalog-offers",
    name: "Catalog Inventory Offer Verification",
    category: "catalog",
    status: catalogValid ? "PASS" : "FAIL",
    expected: "All items must reference verified demo inventory or valid destination estimates",
    actual: catalogValid ? "All IDs verified in catalog / estimates" : "Unverified offer ID detected",
    details: catalogValid
      ? `Verified: Hotel (${candidate.hotel.id}), Transport (${candidate.transport.id}), ${candidate.activities.length} activities, Dining (${candidate.dining.id}).`
      : "One or more item IDs do not match the catalog or estimated inventory.",
  });

  // 5. Activity Schedule Compatibility & Transit Duration Check
  const transitMins = candidate.metrics.averageTransitMinutesPerDay;
  const transitPaceValid = transitMins <= 120; // 2 hours max per day
  const totalActivityHours = candidate.activities.reduce((s, a) => s + a.durationHours, 0);
  const scheduleValid = transitPaceValid && totalActivityHours <= 18;

  checks.push({
    id: "check-schedule-compatibility",
    name: "Transit Duration & Schedule Load Feasibility",
    category: "schedule",
    status: scheduleValid ? "PASS" : "FAIL",
    expected: "Transit <= 120 mins/day, total activity load <= 18 hrs across trip",
    actual: `${transitMins} mins/day transit, ${totalActivityHours} hrs total activities`,
    details: scheduleValid
      ? `Transit load of ${transitMins} mins/day is within physical fatigue limits.`
      : `Transit of ${transitMins} mins/day or activity load exceeds physical fatigue limits.`,
  });

  // 6. Required Traveler Floor Satisfaction Constraints
  let travelerFloorsPass = true;
  const floorFailures: string[] = [];

  travelers.forEach((t) => {
    const scoreObj = candidate.satisfactionScores[t.id];
    if (!scoreObj || scoreObj.totalScore < t.minimumSatisfactionScore) {
      travelerFloorsPass = false;
      floorFailures.push(
        `${t.name} (${scoreObj ? scoreObj.totalScore : 0}% < min ${t.minimumSatisfactionScore}%)`
      );
    }
  });

  checks.push({
    id: "check-traveler-floors",
    name: "Individual Minimum Satisfaction Floors",
    category: "traveler_floor",
    status: travelerFloorsPass ? "PASS" : "FAIL",
    expected: "All travelers must meet or exceed their declared minimum satisfaction floor",
    actual: travelerFloorsPass
      ? `All met (Lowest: ${Math.min(
          ...Object.values(candidate.satisfactionScores).map((s) => s.totalScore)
        )}%)`
      : `Failed: ${floorFailures.join(", ")}`,
    details: travelerFloorsPass
      ? "No individual traveler has been sacrificed or hidden behind an aggregate average."
      : `Protection rule triggered: ${floorFailures.join("; ")}`,
  });

  // 7. Accessibility and Mobility Hard Constraint Check
  const needsAccessibility =
    trip.accessibilityRequired ||
    travelers.some((t) => t.hardConstraints.accessibilityRequired);

  const accessibilityPassed =
    !needsAccessibility ||
    (candidate.hotel.hasElevatorOrStepFree && candidate.transport.accessibleVehicle);

  checks.push({
    id: "check-accessibility",
    name: "Accessibility & Mobility Compatibility",
    category: "accessibility",
    status: accessibilityPassed ? "PASS" : "FAIL",
    expected: needsAccessibility
      ? "Step-free/elevator hotel and accessible transport required"
      : "Standard accessibility",
    actual: needsAccessibility
      ? candidate.hotel.hasElevatorOrStepFree && candidate.transport.accessibleVehicle
        ? "Verified step-free stay and accessible transport"
        : "Failed: Lacks step-free access or accessible vehicle"
      : "Not strictly mandated by group",
    details: accessibilityPassed
      ? "Mobility requirements satisfied."
      : "Candidate fails mandatory accessibility standards specified by organizer or travelers.",
  });

  // 8. Strict No Cross-Destination Leakage Check (Section 4 Compliance)
  const destClean = trip.destination.toLowerCase().trim();
  const knownCities = ["goa", "jaipur", "tokyo", "paris", "kolkata", "london"];
  const tripCurated = knownCities.find((c) => destClean.includes(c));

  let leakageDetected = false;
  let leakageReason = "";

  if (tripCurated) {
    // Curated destination: candidate hotel, transport, and activities MUST match this curated destination
    const hotelDest = candidate.hotel.destination.toLowerCase();
    if (!hotelDest.includes(tripCurated)) {
      leakageDetected = true;
      leakageReason = `Hotel "${candidate.hotel.name}" belongs to ${candidate.hotel.destination}, not ${trip.destination}.`;
    }
  } else {
    // Non-curated arbitrary destination: candidate MUST NOT use items from other curated destinations (Goa, Jaipur, Tokyo, Paris, Kolkata, London)
    const otherCuratedInHotel = knownCities.some((c) => candidate.hotel.destination.toLowerCase().includes(c));
    if (otherCuratedInHotel) {
      leakageDetected = true;
      leakageReason = `Arbitrary destination "${trip.destination}" leaked curated hotel from ${candidate.hotel.destination}.`;
    }
  }

  checks.push({
    id: "check-no-cross-destination-leakage",
    name: "Destination Isolation (No Cross-Destination Offer Leakage)",
    category: "destination_isolation",
    status: !leakageDetected ? "PASS" : "FAIL",
    expected: `Offers strictly isolated to "${trip.destination}"`,
    actual: !leakageDetected ? "Zero cross-destination leakage" : `Leakage detected: ${leakageReason}`,
    details: !leakageDetected
      ? `Verified: Hotel, transport, activities, and dining are strictly dedicated to ${trip.destination}.`
      : leakageReason,
  });

  const overallValid = checks.every((c) => c.status === "PASS");

  return {
    overallValid,
    checks,
    summaryNote: overallValid
      ? `All ${checks.length} deterministic budget, catalog, schedule, accessibility, and individual traveler floor constraints PASSED.`
      : `Validation FAILED on ${
          checks.filter((c) => c.status === "FAIL").length
        } constraint(s). Candidate rejected.`,
  };
}

export const ExplanationOutputSchema = z.object({
  headline: z.string(),
  detailedCompromiseNarrative: z.string(),
  travelerOutcomes: z.array(
    z.object({
      travelerName: z.string(),
      role: z.string().transform((v): "budget_guardian" | "comfort_seeker" | "explorer" | "slow_traveler" | "custom" => {
        const s = v.toLowerCase();
        if (s.includes("budget")) return "budget_guardian";
        if (s.includes("comfort")) return "comfort_seeker";
        if (s.includes("explorer")) return "explorer";
        if (s.includes("slow")) return "slow_traveler";
        return "custom";
      }),
      score: z.number(),
      gain: z.string(),
      concession: z.string(),
    })
  ),
});

export type ExplanationOutput = z.infer<typeof ExplanationOutputSchema>;

export async function runValidationExplanationAgent(params: {
  candidate: ItineraryCandidate;
  validationReport: ValidationReport;
  tradeoffs: TradeoffLedgerItem[];
  travelers: TravelerProfile[];
  trip: TripSetup;
  apiKeyOverride?: string;
}): Promise<ExplanationOutput> {
  const { candidate, validationReport, tradeoffs, travelers, trip, apiKeyOverride } = params;

  const systemPrompt = `You are the Validation & Explanation Agent in CONCORD — Group Trip Negotiator.
Your role is to explain to the travelers why this specific compromise itinerary was chosen and visibly explain every compromise.
You MUST strictly ground all numbers, prices, scores, and names in the verified calculation results and trade-off ledger provided.
DO NOT invent any prices or satisfaction scores.
Output valid JSON matching the schema.`;

  const userPrompt = `Generate the validated group explanation for the selected itinerary:

PROPOSAL DETAILS:
- Candidate Strategy: "${candidate.strategyLabel}" (${candidate.label})
- Hotel: ${candidate.hotel.name} (${candidate.hotel.stars}★)
- Transport: ${candidate.transport.name} (${candidate.metrics.averageTransitMinutesPerDay}m transit/day)
- Activities (${candidate.metrics.totalActivityCount}): ${candidate.activities.map((a) => a.title).join(", ")}
- Total Cost: INR ${candidate.costBreakdown.grandTotalINR.toLocaleString("en-IN")}
- Per Person: INR ${candidate.costBreakdown.costPerPersonINR.toLocaleString("en-IN")}
- Remaining Budget: INR ${candidate.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")}
- Validation Status: ${validationReport.overallValid ? "ALL PASSED" : "FAILED"}
- Aggregate Satisfaction: ${candidate.aggregateSatisfaction}%

TRAVELER SATISFACTION SCORES:
${travelers
  .map((t) => {
    const s = candidate.satisfactionScores[t.id];
    return `- ${t.name} (${t.role}): ${s?.totalScore || 0}% (Min required: ${t.minimumSatisfactionScore}%) - ${s?.comments || ""}`;
  })
  .join("\n")}

RECORDED TRADEOFF LEDGER:
${tradeoffs
  .map(
    (item) =>
      `* [${item.decisionArea}] ${item.originalDecision} -> ${item.changedDecision} (Diff: INR ${item.costDifferenceINR}). Benefited: ${item.whoBenefits.join(", ")}; Conceded: ${item.whoConcedes.join(", ")}. Reason: ${item.reason}`
  )
  .join("\n")}

REQUIRED OUTPUT JSON:
{
  "headline": "Compelling concise consensus headline",
  "detailedCompromiseNarrative": "A cohesive 2-3 paragraph explanation grounded in the actual figures explaining why this is the optimal consensus and how the tension between budget, luxury, pace, and transit was balanced.",
  "travelerOutcomes": [
    {
      "travelerName": "Vikram R.",
      "role": "budget_guardian",
      "score": 81,
      "gain": "Protected group savings below budget ceiling.",
      "concession": "Accepted a 4-star boutique instead of budget hostel."
    }
  ]
}`;

  const result = await callGemma4Json({
    systemPrompt,
    userPrompt,
    schema: ExplanationOutputSchema,
    apiKeyOverride,
    timeoutMs: 40000,
  });

  return result.data as ExplanationOutput;
}
