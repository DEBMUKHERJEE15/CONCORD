import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAmadeusConfig,
  searchAmadeusHotelsByGeocode,
  fetchAmadeusHotelOffers,
} from "../../../../lib/hotels/amadeus-provider";

const OfferQuerySchema = z.object({
  hotelId: z.string().optional(),
  hotelName: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid checkInDate format YYYY-MM-DD"),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid checkOutDate format YYYY-MM-DD"),
  adults: z.coerce.number().min(1).max(20).default(2),
  roomQuantity: z.coerce.number().min(1).max(10).default(1),
  userEstimateINR: z.coerce.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = OfferQuerySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid hotel offer request parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      hotelId,
      hotelName,
      lat,
      lon,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity,
      userEstimateINR,
    } = parseResult.data;

    // If user provided a manual estimate, return it formatted as validated user estimate
    if (userEstimateINR !== undefined && userEstimateINR > 0) {
      return NextResponse.json({
        hotelId: hotelId || "manual-custom",
        hotelName: hotelName || "Custom Hotel",
        status: "user_estimate",
        source: "user",
        userEstimate: {
          nightlyRateINR: userEstimateINR,
          currency: "INR",
          estimatedBy: "user",
          timestamp: new Date().toISOString(),
          notes: `User-provided estimate of ₹${userEstimateINR.toLocaleString("en-IN")}/night`,
        },
      });
    }

    const amadeusConfig = getAmadeusConfig();

    if (!amadeusConfig.isConfigured) {
      return NextResponse.json({
        hotelId: hotelId || "osm-unpriced",
        hotelName: hotelName || "Directory Hotel",
        status: "price_unavailable",
        source: "none",
        message:
          "Live pricing provider (Amadeus) is not configured with AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET. No live rates can be fetched.",
      });
    }

    // Try fetching live Amadeus offers
    let targetHotelIds: string[] = [];
    if (hotelId && !hotelId.startsWith("osm-")) {
      targetHotelIds.push(hotelId);
    } else if (lat !== undefined && lon !== undefined) {
      try {
        const matchingHotels = await searchAmadeusHotelsByGeocode({
          latitude: lat,
          longitude: lon,
          radiusKm: 2,
        });

        // Try exact/partial name match if hotelName provided
        if (hotelName) {
          const nameLower = hotelName.toLowerCase();
          const match = matchingHotels.find((h) =>
            h.name.toLowerCase().includes(nameLower) || nameLower.includes(h.name.toLowerCase())
          );
          if (match) {
            targetHotelIds.push(match.hotelId);
          }
        }

        if (targetHotelIds.length === 0 && matchingHotels.length > 0) {
          targetHotelIds = matchingHotels.slice(0, 3).map((h) => h.hotelId);
        }
      } catch (geocodeErr: unknown) {
        console.warn("Amadeus geocode lookup failed:", geocodeErr);
      }
    }

    if (targetHotelIds.length === 0) {
      return NextResponse.json({
        hotelId: hotelId || "osm-unmatched",
        hotelName: hotelName || "Directory Hotel",
        status: "price_unavailable",
        source: "none",
        message: "No matching Amadeus property ID found for this OpenStreetMap directory listing.",
      });
    }

    const offers = await fetchAmadeusHotelOffers({
      hotelIds: targetHotelIds,
      adults,
      checkInDate,
      checkOutDate,
      roomQuantity,
    });

    if (offers.length === 0) {
      return NextResponse.json({
        hotelId: targetHotelIds[0],
        hotelName: hotelName || "Directory Hotel",
        status: "price_unavailable",
        source: "amadeus",
        message: "Amadeus returned zero available room offers for the requested dates and guest count.",
      });
    }

    // Select the best available offer
    const bestOffer = offers[0];

    return NextResponse.json({
      hotelId: bestOffer.propertyId,
      hotelName: bestOffer.propertyName,
      status: "live_offer",
      source: "amadeus",
      offer: bestOffer,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: errorMsg,
        status: "price_unavailable",
        source: "none",
      },
      { status: 500 }
    );
  }
}
