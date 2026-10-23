import {
  HotelDirectoryItem,
  HotelOffer,
  HotelOfferLive,
  HotelUserEstimate,
  InventoryTag,
} from "../../types";

/**
 * Maps stars and accommodation type to HotelOffer category
 */
export function deriveHotelCategory(
  stars?: number,
  type?: string
): "budget" | "boutique" | "luxury_resort" | "standard" {
  if (type === "hostel" || (stars !== undefined && stars <= 2.5)) {
    return "budget";
  }
  if (stars !== undefined && stars >= 4.5) {
    return "luxury_resort";
  }
  if (stars !== undefined && stars >= 3.5) {
    return "boutique";
  }
  return "standard";
}

/**
 * Calculates a 1-10 comfort score from stars and amenities
 */
export function deriveComfortScore(stars?: number, amenities?: string[]): number {
  let score = 6.0;
  if (stars) {
    score = Math.min(10, Math.max(2, stars * 2));
  }
  if (amenities && amenities.length > 0) {
    const boost = Math.min(amenities.length * 0.3, 1.5);
    score = Math.min(10, score + boost);
  }
  return Math.round(score * 10) / 10;
}

/**
 * Calculates a 1-10 transit accessibility score based on distance from city center
 */
export function deriveTransitScore(distanceKm?: number): number {
  if (distanceKm === undefined) return 7.0;
  if (distanceKm <= 1.5) return 9.5;
  if (distanceKm <= 3.0) return 8.5;
  if (distanceKm <= 5.0) return 7.5;
  if (distanceKm <= 10.0) return 6.0;
  if (distanceKm <= 15.0) return 4.5;
  return 3.0;
}

/**
 * Converts a HotelDirectoryItem into a HotelOffer consumable by the negotiation engine
 */
export function directoryItemToHotelOffer(
  item: HotelDirectoryItem,
  destinationName: string,
  selectedOffer?: HotelOfferLive,
  userEstimate?: HotelUserEstimate
): HotelOffer {
  let pricePerNightINR = 0;
  let tag: InventoryTag = "DIRECTORY LISTING — NO PRICE";

  if (selectedOffer) {
    pricePerNightINR = Math.round(selectedOffer.pricePerNight);
    tag = "VERIFIED DATA — LIVE PROVIDER";
  } else if (userEstimate) {
    pricePerNightINR = Math.round(userEstimate.nightlyRateINR);
    tag = "MANUAL ESTIMATES — NOT LIVE PRICES";
  }

  const category = deriveHotelCategory(item.stars, item.accommodationType);
  const comfortScore = deriveComfortScore(item.stars, item.amenities);
  const transitAccessibilityScore = deriveTransitScore(item.distanceKm);

  return {
    id: item.id,
    destination: destinationName,
    name: item.name,
    category,
    stars: item.stars || (category === "luxury_resort" ? 5 : category === "boutique" ? 4 : category === "budget" ? 2 : 3),
    pricePerNightINR,
    locationArea: item.address?.fullText || (item.distanceKm ? `${item.distanceKm.toFixed(1)} km from center` : destinationName),
    amenities: item.amenities || ["Wi-Fi", "Standard Essentials"],
    hasElevatorOrStepFree: Boolean(item.wheelchairAccessible),
    comfortScore,
    transitAccessibilityScore,
    tag,
    distanceKm: item.distanceKm,
    priceStatus: selectedOffer ? "live_offer" : userEstimate ? "user_estimate" : "price_unavailable",
    osmDirectoryItem: item,
    liveOffer: selectedOffer,
  };
}
