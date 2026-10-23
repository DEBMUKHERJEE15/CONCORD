import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchOsmHotels, OSM_ATTRIBUTION } from "../../../../lib/hotels/osm-overpass";
import { getAmadeusConfig } from "../../../../lib/hotels/amadeus-provider";
import { HotelSearchResponse } from "../../../../types";

const HotelSearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(30).default(5),
  limit: z.coerce.number().min(1).max(100).default(50),
  destination: z.string().optional().default("Selected Destination"),
  accommodationType: z.string().optional(),
  minStars: z.coerce.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parseResult = HotelSearchSchema.safeParse({
      lat: searchParams.get("lat"),
      lon: searchParams.get("lon"),
      radiusKm: searchParams.get("radiusKm") || 5,
      limit: searchParams.get("limit") || 50,
      destination: searchParams.get("destination") || "Selected Destination",
      accommodationType: searchParams.get("accommodationType") || undefined,
      minStars: searchParams.get("minStars") || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid hotel search parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { lat, lon, radiusKm, limit, destination, accommodationType, minStars } = parseResult.data;

    const amadeusConfig = getAmadeusConfig();

    let searchResult;
    try {
      searchResult = await searchOsmHotels({
        latitude: lat,
        longitude: lon,
        radiusKm,
        limit,
      });
    } catch (osmError: unknown) {
      const msg = osmError instanceof Error ? osmError.message : String(osmError);
      return NextResponse.json(
        {
          destination,
          coordinates: [lat, lon],
          radiusKm,
          totalFound: 0,
          hotels: [],
          source: "osm_overpass",
          attribution: OSM_ATTRIBUTION,
          amadeusConfigured: amadeusConfig.isConfigured,
          warning: `OpenStreetMap directory unavailable: ${msg}. You may enter manual accommodation estimates or use catalog hotels.`,
        } as HotelSearchResponse,
        { status: 200 }
      );
    }

    let filteredHotels = searchResult.hotels;

    // Filter by accommodation type if requested
    if (accommodationType && accommodationType !== "all") {
      filteredHotels = filteredHotels.filter(
        (h) => h.accommodationType.toLowerCase() === accommodationType.toLowerCase()
      );
    }

    // Filter by minStars if present
    if (minStars !== undefined && minStars > 0) {
      filteredHotels = filteredHotels.filter(
        (h) => (h.stars ?? 0) >= minStars
      );
    }

    const responseData: HotelSearchResponse = {
      destination,
      coordinates: [lat, lon],
      radiusKm,
      totalFound: filteredHotels.length,
      hotels: filteredHotels,
      source: searchResult.source,
      attribution: OSM_ATTRIBUTION,
      amadeusConfigured: amadeusConfig.isConfigured,
      amadeusNotice: amadeusConfig.isConfigured
        ? "Amadeus live pricing integration is active. Select a hotel to check live room rates."
        : "Live pricing is not configured (AMADEUS_CLIENT_ID / SECRET absent). Directory listings are sourced without cost data from OpenStreetMap. You may supply a manual nightly estimate.",
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error during hotel search";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
