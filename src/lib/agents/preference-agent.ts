import { z } from "zod";
import { TripSetup, TravelerProfile, ConflictAnalysisResult } from "@/types";
import { callGemma4Json } from "@/lib/gemma-client";

const ConflictItemSchema = z.object({
  dimension: z.string().transform((v): "budget_vs_comfort" | "pace_vs_sightseeing" | "transit_tolerance" | "amenity_standards" => {
    const s = v.toLowerCase();
    if (s.includes("budget") || s.includes("cost") || s.includes("comfort") || s.includes("luxury")) return "budget_vs_comfort";
    if (s.includes("transit") || s.includes("travel")) return "transit_tolerance";
    if (s.includes("amenity") || s.includes("hotel")) return "amenity_standards";
    return "pace_vs_sightseeing";
  }),
  severity: z.string().transform((v): "high" | "medium" | "low" => {
    const s = v.toLowerCase();
    if (s.includes("high")) return "high";
    if (s.includes("low")) return "low";
    return "medium";
  }),
  partiesInvolved: z.array(z.string()),
  description: z.string(),
  tradeoffOpportunity: z.string(),
});

export const PreferenceAnalysisSchema = z.object({
  conflicts: z.array(ConflictItemSchema),
  consensusBaseline: z.string(),
  keyStickingPoint: z.string(),
});

export type PreferenceAnalysisOutput = z.infer<typeof PreferenceAnalysisSchema>;

export async function runPreferenceGroupAgent(
  trip: TripSetup,
  travelers: TravelerProfile[],
  apiKeyOverride?: string
): Promise<ConflictAnalysisResult> {
  const systemPrompt = `You are the Preference & Group Agent in the "CONCORD — Group Trip Negotiator" system.
Your job is to analyze group travel preferences, pinpoint incompatible priorities, identify the core friction points between the travelers, and discover viable compromise zones.
You strictly output valid JSON conforming to the schema without conversational padding or markdown fences.`;

  const userPrompt = `Analyze the following trip and ${travelers.length} traveler profile(s) to determine friction and conflict points:

TRIP PARAMETERS:
- Origin: ${trip.origin} -> Destination: ${trip.destination}
- Dates: ${trip.departureDate} to ${trip.returnDate}
- Total Travelers: ${trip.travelerCount}
- Shared Group Budget: INR ${trip.sharedBudgetINR.toLocaleString("en-IN")}
- Travel Style: ${trip.travelStyle}
- Interests: ${trip.interests.join(", ")}

TRAVELERS:
${travelers
  .map(
    (t) => `* ${t.name} (${t.roleLabel})
  - Priorities: Cost Weight=${t.weights.cost}, Comfort Weight=${t.weights.comfort}, Activity Weight=${t.weights.activities}, Transit Weight=${t.weights.transit}
  - Min Hotel Stars: ${t.preferences.minHotelStars}★
  - Preferred Pace: ${t.preferences.preferredPace} (Min Activities: ${t.preferences.minActivitiesCount})
  - Max Transit Tolerance: ${t.preferences.maxTransitMinutesPerDay} mins/day
  - Declared Min Satisfaction Floor: ${t.minimumSatisfactionScore}%
  - Interests: ${t.preferences.interestTags.join(", ")}`
  )
  .join("\n\n")}

REQUIRED OUTPUT JSON FORMAT:
{
  "conflicts": [
    {
      "dimension": "budget_vs_comfort",
      "severity": "high",
      "partiesInvolved": ["Traveler 1", "Traveler 2"],
      "description": "Specific explanation of conflict",
      "tradeoffOpportunity": "Specific compromise zone"
    }
  ],
  "consensusBaseline": "Areas where all travelers agree",
  "keyStickingPoint": "The primary tension that must be resolved in negotiation"
}`;

  const result = await callGemma4Json({
    systemPrompt,
    userPrompt,
    schema: PreferenceAnalysisSchema,
    apiKeyOverride,
    timeoutMs: 35000,
  });

  let conflicts = [...result.data.conflicts];
  if (conflicts.length === 0) {
    conflicts.push({
      dimension: "budget_vs_comfort",
      severity: "low",
      partiesInvolved: [travelers[0]?.name || "All Travelers"],
      description: "Individual priorities are well-aligned within the shared budget limit.",
      tradeoffOpportunity: "Select an optimal balance between accommodation tier and activity count.",
    });
  }

  return {
    ...result.data,
    conflicts,
  } as ConflictAnalysisResult;
}
