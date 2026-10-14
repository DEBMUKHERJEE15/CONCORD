import { NextResponse } from "next/server";
import { getGemmaModelName } from "@/lib/gemma-client";
import {
  DEMO_HOTELS,
  DEMO_TRANSPORTS,
  DEMO_ACTIVITIES,
  DEMO_DINING_PACKAGES,
} from "@/data/demo-offers";

export async function GET() {
  const hasEnvKey = Boolean(process.env.GEMMA_API_KEY && process.env.GEMMA_API_KEY.trim() !== "");
  const model = getGemmaModelName();

  return NextResponse.json({
    status: "healthy",
    app: "CONCORD — Group Trip Negotiator",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    gemma: {
      model,
      hasServerApiKey: hasEnvKey,
      sdk: "@google/genai",
      hostedType: "Google Gen AI Hosted Gemma",
    },
    demoInventory: {
      hotelsCount: DEMO_HOTELS.length,
      transportsCount: DEMO_TRANSPORTS.length,
      activitiesCount: DEMO_ACTIVITIES.length,
      diningPackagesCount: DEMO_DINING_PACKAGES.length,
      disclaimer: "DEMO DATA — NOT LIVE PRICES",
    },
  });
}
