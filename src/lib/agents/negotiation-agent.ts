import { z } from "zod";
import {
  TripSetup,
  TravelerProfile,
  ItineraryCandidate,
  NegotiationTimelineEvent,
  TradeoffLedgerItem,
  ConflictAnalysisResult,
} from "@/types";
import { callGemma4Json } from "@/lib/gemma-client";

const TimelineEventSchema = z.object({
  round: z.number().int().min(1).max(3),
  stage: z.string().transform((v): "conflict_detected" | "initial_proposal" | "objection" | "counterproposal" | "accepted_compromise" => {
    const s = v.toLowerCase();
    if (s.includes("conflict")) return "conflict_detected";
    if (s.includes("counter")) return "counterproposal";
    if (s.includes("initial") || s.includes("first")) return "initial_proposal";
    if (s.includes("object")) return "objection";
    return "accepted_compromise";
  }),
  actor: z.string(),
  title: z.string(),
  detail: z.string(),
  concessionNote: z.string().nullable().optional().transform((v) => v || undefined),
});

const TradeoffItemSchema = z.object({
  id: z.string(),
  decisionArea: z.string().transform((v): "Accommodation" | "Transport" | "Activities" | "Dining" | "Budget Allocation" => {
    const s = v.toLowerCase();
    if (s.includes("accom") || s.includes("hotel") || s.includes("stay")) return "Accommodation";
    if (s.includes("trans") || s.includes("flight") || s.includes("cab") || s.includes("drive")) return "Transport";
    if (s.includes("din") || s.includes("food") || s.includes("meal")) return "Dining";
    if (s.includes("budg") || s.includes("cost") || s.includes("alloc")) return "Budget Allocation";
    return "Activities";
  }),
  originalDecision: z.string(),
  changedDecision: z.string(),
  costDifferenceINR: z.number(),
  whoBenefits: z.array(z.string()),
  whoConcedes: z.array(z.string()),
  reason: z.string(),
  quantifiedImpact: z.string(),
  isAcceptedByPolicy: z.boolean().nullable().optional().transform((v) => v ?? true),
});

export const NegotiationAgentOutputSchema = z.object({
  timeline: z.array(TimelineEventSchema).min(1),
  tradeoffs: z.array(TradeoffItemSchema).min(1),
  strategicSummary: z.string(),
});

export type NegotiationAgentOutput = z.infer<typeof NegotiationAgentOutputSchema>;

export async function runNegotiationAgent(params: {
  trip: TripSetup;
  travelers: TravelerProfile[];
  candidates: ItineraryCandidate[];
  selectedCandidate: ItineraryCandidate;
  conflictAnalysis: ConflictAnalysisResult;
  roundNumber?: number;
  apiKeyOverride?: string;
}): Promise<{
  timeline: NegotiationTimelineEvent[];
  tradeoffs: TradeoffLedgerItem[];
  strategicSummary: string;
}> {
  const {
    trip,
    travelers,
    candidates,
    selectedCandidate,
    conflictAnalysis,
    roundNumber = 1,
    apiKeyOverride,
  } = params;

  const systemPrompt = `You are the Negotiation & Optimization Agent in CONCORD — Group Trip Negotiator.
You work alongside deterministic mathematical optimization engines.
CRITICAL RULES:
1. You DO NOT invent prices, budgets, or mathematical calculations. All figures must match the verified candidate data provided.
2. Formulate the negotiation timeline reflecting real stages:
   - conflict_detected
   - initial_proposal
   - objection (from a traveler whose preference was strained)
   - counterproposal
   - accepted_compromise
3. Construct the Trade-off Ledger detailing each concession:
   - What was originally considered vs what was finalized
   - The verified cost difference (positive number for savings, negative for extra spend)
   - Who gained advantage vs who yielded/conceded
   - Grounded rational justification
4. Output strictly valid JSON conforming to the schema.`;

  const userPrompt = `Generate the structured negotiation narrative and trade-off ledger for this group trip (Round ${roundNumber} of 3):

TRIP: ${trip.origin} to ${trip.destination} (${trip.departureDate} to ${trip.returnDate})
TOTAL BUDGET: INR ${trip.sharedBudgetINR.toLocaleString("en-IN")} for ${trip.travelerCount} travelers.

TRAVELERS:
${travelers
  .map(
    (t) =>
      `- ${t.name} (${t.roleLabel}, Min Score: ${t.minimumSatisfactionScore}%): Weights Cost=${t.weights.cost}, Comfort=${t.weights.comfort}, Act=${t.weights.activities}, Transit=${t.weights.transit}`
  )
  .join("\n")}

CONFLICT ANALYSIS BASELINE:
- Key Sticking Point: ${conflictAnalysis.keyStickingPoint}
- Consensus Baseline: ${conflictAnalysis.consensusBaseline}

EVALUATED CANDIDATE ITINERARIES:
${candidates
  .map(
    (c) => `* CANDIDATE: "${c.label}" (ID: ${c.id})
  - Hotel: ${c.hotel.name} (${c.hotel.stars}★, INR ${c.hotel.pricePerNightINR}/night)
  - Transport: ${c.transport.name} (INR ${c.transport.totalCostINR}, ${c.metrics.averageTransitMinutesPerDay} mins/day)
  - Activities: ${c.activities.map((a) => a.title).join(", ")} (${c.metrics.totalActivityCount} total)
  - Grand Total: INR ${c.costBreakdown.grandTotalINR.toLocaleString("en-IN")} (Remaining: INR ${c.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")})
  - Feasible: ${c.isFeasible ? "YES" : "NO - " + (c.infeasibilityReasons || []).join("; ")}
  - Aggregate Satisfaction: ${c.aggregateSatisfaction}%
  - Traveler Scores: ${Object.entries(c.satisfactionScores)
    .map(([tid, s]) => {
      const tr = travelers.find((x) => x.id === tid);
      return `${tr?.name || tid}: ${s.totalScore}% (${s.status})`;
    })
    .join(", ")}`
  )
  .join("\n\n")}

DETERMINISTICALLY SELECTED WINNER:
"${selectedCandidate.label}" (ID: ${selectedCandidate.id})
Total Cost: INR ${selectedCandidate.costBreakdown.grandTotalINR.toLocaleString("en-IN")}
Remaining Budget: INR ${selectedCandidate.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")}
Aggregate Score: ${selectedCandidate.aggregateSatisfaction}%

REQUIRED OUTPUT JSON:
{
  "timeline": [
    {
      "round": ${roundNumber},
      "stage": "conflict_detected" | "initial_proposal" | "objection" | "counterproposal" | "accepted_compromise",
      "actor": "Gemma Negotiation Agent" | traveler name,
      "title": "Short title",
      "detail": "Actionable detail reflecting the actual offer choices",
      "concessionNote": "Optional note on who yielded"
    }
  ],
  "tradeoffs": [
    {
      "id": "tradeoff-1",
      "decisionArea": "Accommodation" | "Transport" | "Activities" | "Dining" | "Budget Allocation",
      "originalDecision": "e.g., Grand Azure 5★ Resort",
      "changedDecision": "e.g., Coastal Palms 4★ Heritage Villa",
      "costDifferenceINR": 64000,
      "whoBenefits": ["Vikram R. (Budget Guardian)"],
      "whoConcedes": ["Pooja M. (Comfort Seeker)"],
      "reason": "Specific rationale grounded in budget ceiling and satisfaction balance",
      "quantifiedImpact": "Saved ₹64,000 to keep the group safely within the ₹125,000 budget while maintaining 4★ comfort."
    }
  ],
  "strategicSummary": "Crisp 2-sentence summary of the consensus reached."
}`;

  const result = await callGemma4Json({
    systemPrompt,
    userPrompt,
    schema: NegotiationAgentOutputSchema,
    apiKeyOverride,
    timeoutMs: 40000,
  });

  // Post-process timestamps
  const now = new Date();
  const timelineWithTimestamps: NegotiationTimelineEvent[] = result.data.timeline.map((evt, idx) => ({
    ...evt,
    stage: evt.stage as NegotiationTimelineEvent["stage"],
    concessionNote: evt.concessionNote || undefined,
    timestamp: new Date(now.getTime() - (result.data.timeline.length - idx) * 90000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }));

  let finalTimeline = [...timelineWithTimestamps];
  if (finalTimeline.length < 3) {
    if (!finalTimeline.some((e) => e.stage === "initial_proposal")) {
      finalTimeline.unshift({
        round: roundNumber,
        stage: "initial_proposal",
        actor: "Gemma Negotiation Agent",
        title: "Initial Candidate Evaluation",
        detail: `Evaluated ${candidates.length} candidate itineraries across budget and traveler preference constraints.`,
        timestamp: new Date(now.getTime() - 180000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }
    if (!finalTimeline.some((e) => e.stage === "accepted_compromise")) {
      finalTimeline.push({
        round: roundNumber,
        stage: "accepted_compromise",
        actor: "Group Consensus",
        title: "Compromise Agreement Accepted",
        detail: `The group reached consensus on "${selectedCandidate.label}".`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }
  }

  const tradeoffsWithPolicy: TradeoffLedgerItem[] = result.data.tradeoffs.map((item) => ({
    ...item,
    decisionArea: item.decisionArea as TradeoffLedgerItem["decisionArea"],
    isAcceptedByPolicy: item.isAcceptedByPolicy ?? true,
  }));

  let finalTradeoffs = [...tradeoffsWithPolicy];
  if (finalTradeoffs.length < 2) {
    finalTradeoffs.push({
      id: `tradeoff-auto-${finalTradeoffs.length + 1}`,
      decisionArea: "Activities",
      originalDecision: "Packed 5-activity daily schedule",
      changedDecision: `Balanced ${selectedCandidate.metrics.totalActivityCount} curated group activities`,
      costDifferenceINR: Math.max(0, trip.sharedBudgetINR - selectedCandidate.costBreakdown.grandTotalINR),
      whoBenefits: travelers.filter((t) => t.role === "budget_guardian" || t.role === "slow_traveler").map((t) => t.name),
      whoConcedes: travelers.filter((t) => t.role === "explorer").map((t) => t.name),
      reason: "Balanced activity pacing to respect slow traveler rest constraints and budget limits.",
      quantifiedImpact: `Preserved ₹${selectedCandidate.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")} in shared group reserves.`,
      isAcceptedByPolicy: true,
    });
  }

  return {
    ...result.data,
    timeline: finalTimeline,
    tradeoffs: finalTradeoffs,
  };
}
