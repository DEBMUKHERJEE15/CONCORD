import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  TripSetup,
  TravelerProfile,
  NegotiationResponse,
} from "@/types";
import {
  generateCandidateItineraries,
  selectBestCandidate,
} from "@/lib/optimizer";
import { runPreferenceGroupAgent } from "@/lib/agents/preference-agent";
import { runNegotiationAgent } from "@/lib/agents/negotiation-agent";
import {
  performDeterministicValidation,
  runValidationExplanationAgent,
} from "@/lib/agents/validation-agent";
import { GemmaApiError, getGemmaModelName } from "@/lib/gemma-client";

const TravelerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  role: z.enum(["budget_guardian", "comfort_seeker", "explorer", "slow_traveler", "custom"]),
  roleLabel: z.string(),
  avatarColor: z.string(),
  preferences: z.object({
    minHotelStars: z.number(),
    preferredPace: z.enum(["relaxed", "moderate", "packed"]),
    minActivitiesCount: z.number(),
    maxTransitMinutesPerDay: z.number(),
    mustHaveAmenities: z.array(z.string()),
    interestTags: z.array(z.string()),
    ratings: z.any().optional(),
  }),
  hardConstraints: z
    .object({
      maxIndividualBudgetINR: z.number().optional(),
      accessibilityRequired: z.boolean().optional(),
      mandatoryRestPeriods: z.boolean().optional(),
      dietaryOrMedicalRestrictions: z.array(z.string()).optional(),
      unacceptableActivities: z.array(z.string()).optional(),
    })
    .optional()
    .default({}),
  minimumSatisfactionScore: z.number().min(0).max(100),
  weights: z.object({
    cost: z.number(),
    comfort: z.number(),
    activities: z.number(),
    transit: z.number(),
  }),
});

const NegotiateRequestSchema = z.object({
  trip: z.object({
    origin: z.string().min(1),
    destination: z.string().min(1),
    departureDate: z.string(),
    returnDate: z.string(),
    travelerCount: z.number().int().min(1).max(20),
    sharedBudgetINR: z.number().min(1000),
    currency: z.enum(["INR", "USD", "EUR"]).optional().default("INR"),
    tripType: z.enum(["weekend", "leisure", "adventure", "family", "business", "custom"]).optional().default("leisure"),
    preferredTransport: z.enum(["train", "bus", "flight", "car", "flexible"]).optional().default("car"),
    accommodationPreference: z.enum(["hostel", "budget_hotel", "standard_hotel", "premium_hotel", "flexible"]).optional().default("standard_hotel"),
    accessibilityRequired: z.boolean().optional().default(false),
    freeTextNotes: z.string().optional(),
    travelStyle: z.string(),
    interests: z.array(z.string()),
  }).passthrough(),
  travelers: z.array(TravelerSchema).min(1).max(10),
  roundNumber: z.number().int().min(1).max(3).optional().default(1),
  previousProposalId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 500000) {
      return NextResponse.json(
        { error: "Payload too large. Exceeds 500KB limit." },
        { status: 413 }
      );
    }

    const body = await req.json();
    const parseResult = NegotiateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const trip = parseResult.data.trip as unknown as TripSetup;
    const travelers = parseResult.data.travelers as unknown as TravelerProfile[];
    const roundNumber = parseResult.data.roundNumber;
    const apiKeyOverride = req.headers.get("x-gemma-api-key") || undefined;
    const modelUsed = getGemmaModelName();

    // 2. Deterministic Candidate Generation & Scoring
    const candidates = generateCandidateItineraries(trip, travelers);
    const selection = selectBestCandidate(candidates);
    const selectedCandidate = selection.best;

    // 3. Agent 1: Preference & Group Agent (Gemma 4)
    const conflictAnalysis = await runPreferenceGroupAgent(trip, travelers, apiKeyOverride);

    // 4. Agent 2: Negotiation & Optimization Agent (Deterministic + Gemma 4)
    const negotiationResult = await runNegotiationAgent({
      trip,
      travelers,
      candidates,
      selectedCandidate,
      conflictAnalysis,
      roundNumber,
      apiKeyOverride,
    });

    // 5. Agent 3: Validation & Explanation Agent (Deterministic Validation + Gemma 4 Grounded Explanation)
    const validationReport = performDeterministicValidation(selectedCandidate, trip, travelers);

    const explanation = await runValidationExplanationAgent({
      candidate: selectedCandidate,
      validationReport,
      tradeoffs: negotiationResult.tradeoffs,
      travelers,
      trip,
      apiKeyOverride,
    });

    const response: NegotiationResponse = {
      candidates,
      selectedCandidateId: selectedCandidate.id,
      timeline: negotiationResult.timeline,
      tradeoffs: negotiationResult.tradeoffs,
      validation: validationReport,
      conflictAnalysis,
      negotiationRoundsCount: roundNumber,
      gemmaModelUsed: modelUsed,
      explanation,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    if (error instanceof GemmaApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "GEMMA_API_ERROR",
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    const msg = error instanceof Error ? error.message : "Unknown error during negotiation workflow";
    return NextResponse.json(
      {
        error: `Negotiation execution error: ${msg}`,
        code: "INTERNAL_WORKFLOW_ERROR",
      },
      { status: 500 }
    );
  }
}
