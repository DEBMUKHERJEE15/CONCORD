import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TripSetup, TravelerProfile } from "@/types";
import { runPreferenceGroupAgent } from "@/lib/agents/preference-agent";
import { GemmaApiError } from "@/lib/gemma-client";

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

const ParsePreferencesRequestSchema = z.object({
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
  }),
  travelers: z.array(TravelerSchema).min(1).max(10),
});

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 500000) {
      return NextResponse.json({ error: "Payload too large. Exceeds 500KB limit." }, { status: 413 });
    }

    const body = await req.json();
    const parseResult = ParsePreferencesRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const trip = parseResult.data.trip as unknown as TripSetup;
    const travelers = parseResult.data.travelers as unknown as TravelerProfile[];
    const apiKeyOverride = req.headers.get("x-gemma-api-key") || undefined;

    const analysis = await runPreferenceGroupAgent(trip, travelers, apiKeyOverride);

    return NextResponse.json({
      success: true,
      analysis,
    });
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

    const msg = error instanceof Error ? error.message : "Unknown error during preference interpretation";
    return NextResponse.json(
      {
        error: `Preference & Group Agent error: ${msg}`,
        code: "INTERNAL_AGENT_ERROR",
      },
      { status: 500 }
    );
  }
}
