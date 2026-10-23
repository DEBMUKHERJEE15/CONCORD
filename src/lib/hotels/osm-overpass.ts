import { HotelDirectoryItem, HotelAccommodationType } from "../../types";

export interface OsmOverpassQueryParams {
  latitude: number;
  longitude: number;
  radiusKm?: number; // 2, 5, 10, 25 (default 5)
  limit?: number;
  timeoutSeconds?: number;
}

export interface OsmOverpassRawElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

export interface OsmOverpassRawResponse {
  version: number;
  generator: string;
  elements: OsmOverpassRawElement[];
}

export const OSM_ATTRIBUTION = "Data © OpenStreetMap contributors (ODbL) — community directory, live rates not included";

// Simple in-memory cache to respect Overpass server resources and provide responsive UI
interface CacheEntry {
  timestamp: number;
  items: HotelDirectoryItem[];
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Calculates great-circle distance between two coordinates in kilometers using the Haversine formula
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // 2 decimal precision
}

/**
 * Maps OpenStreetMap tourism tag values to standardized HotelAccommodationType
 */
export function mapOsmTourismType(tourismVal?: string): HotelAccommodationType {
  switch (tourismVal?.toLowerCase()) {
    case "hotel":
      return "hotel";
    case "hostel":
      return "hostel";
    case "guest_house":
      return "guest_house";
    case "motel":
      return "motel";
    case "apartment":
      return "apartment";
    case "resort":
      return "resort";
    case "bed_and_breakfast":
      return "bed_and_breakfast";
    default:
      return "hotel";
  }
}

/**
 * Builds a bounded Overpass QL query string
 */
export function buildOverpassQuery(lat: number, lon: number, radiusMeters: number, timeoutSec = 20): string {
  return `[out:json][timeout:${timeoutSec}];
(
  node["tourism"~"^(hotel|hostel|guest_house|motel|apartment|resort|bed_and_breakfast)$"](around:${radiusMeters},${lat},${lon});
  way["tourism"~"^(hotel|hostel|guest_house|motel|apartment|resort|bed_and_breakfast)$"](around:${radiusMeters},${lat},${lon});
  relation["tourism"~"^(hotel|hostel|guest_house|motel|apartment|resort|bed_and_breakfast)$"](around:${radiusMeters},${lat},${lon});
);
out center tags;`;
}

/**
 * Parses and deduplicates raw Overpass response elements into HotelDirectoryItem objects
 */
export function parseOverpassElements(
  elements: OsmOverpassRawElement[],
  originLat: number,
  originLon: number
): HotelDirectoryItem[] {
  const seenIds = new Set<string>();
  const seenNameLocations = new Set<string>();
  const results: HotelDirectoryItem[] = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const rawName = tags.name || tags["name:en"] || tags["brand"];

    // Rule: Never fabricate missing hotel names
    if (!rawName || rawName.trim() === "") {
      continue;
    }

    const name = rawName.trim();
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    // Rule: Must have valid coordinates
    if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    // Deduplication key by OSM unique identity
    const idKey = `osm-${el.type}-${el.id}`;
    if (seenIds.has(idKey)) {
      continue;
    }
    seenIds.add(idKey);

    // Proximity name deduplication (within ~50m) for cases where both way and node exist for same property
    const roundedLat = lat.toFixed(3);
    const roundedLon = lon.toFixed(3);
    const nameLocKey = `${name.toLowerCase()}_${roundedLat}_${roundedLon}`;
    if (seenNameLocations.has(nameLocKey)) {
      continue;
    }
    seenNameLocations.add(nameLocKey);

    const distanceKm = calculateHaversineDistanceKm(originLat, originLon, lat, lon);

    // Extract address components without fabricating
    const street = tags["addr:street"];
    const houseNumber = tags["addr:housenumber"];
    const postcode = tags["addr:postcode"];
    const city = tags["addr:city"];
    const state = tags["addr:state"];
    const country = tags["addr:country"];

    let fullAddress = [houseNumber, street, city, state, postcode, country]
      .filter(Boolean)
      .join(", ");
    if (!fullAddress && tags["address"]) {
      fullAddress = tags["address"];
    }

    // Contact details
    const phone = tags["phone"] || tags["contact:phone"];
    const website = tags["website"] || tags["contact:website"] || tags["url"];
    const email = tags["email"] || tags["contact:email"];

    // Stars / rating if explicitly present in OSM tags
    let stars: number | undefined;
    const rawStars = tags["stars"] || tags["tourism:stars"];
    if (rawStars) {
      const parsed = parseFloat(rawStars);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
        stars = parsed;
      }
    }

    // Amenities from OSM tags (internet_access, air_conditioning, swimming_pool, etc.)
    const amenities: string[] = [];
    if (tags["internet_access"] === "wlan" || tags["internet_access"] === "yes" || tags["wifi"] === "yes") {
      amenities.push("Free Wi-Fi");
    }
    if (tags["swimming_pool"] === "yes" || tags["leisure"] === "swimming_pool") {
      amenities.push("Swimming Pool");
    }
    if (tags["air_conditioning"] === "yes") {
      amenities.push("Air Conditioning");
    }
    if (tags["wheelchair"] === "yes") {
      amenities.push("Wheelchair Accessible");
    }
    if (tags["breakfast"] === "yes" || tags["fee:breakfast"] === "no") {
      amenities.push("Breakfast Available");
    }
    if (tags["parking"] === "yes" || tags["parking"] === "surface") {
      amenities.push("Parking");
    }

    const wheelchair = tags["wheelchair"] === "yes";

    results.push({
      id: idKey,
      osmId: el.id,
      osmType: el.type,
      name,
      accommodationType: mapOsmTourismType(tags.tourism),
      latitude: lat,
      longitude: lon,
      distanceKm,
      address: fullAddress ? {
        street,
        houseNumber,
        postcode,
        city,
        state,
        country,
        fullText: fullAddress,
      } : undefined,
      contact: (phone || website || email) ? { phone, website, email } : undefined,
      stars,
      wheelchairAccessible: wheelchair,
      amenities: amenities.length > 0 ? amenities : undefined,
      rawTags: tags,
      source: "osm",
      attribution: OSM_ATTRIBUTION,
      priceStatus: "price_unavailable", // OSM is a directory listing; prices are not available by default
    });
  }

  // Sort by distance from search origin by default
  results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return results;
}

/**
 * Searches OpenStreetMap Overpass API for worldwide hotels around given coordinates
 */
export async function searchOsmHotels(
  params: OsmOverpassQueryParams,
  fetchFn: typeof fetch = fetch
): Promise<{
  hotels: HotelDirectoryItem[];
  source: "osm_overpass" | "cache";
  totalFound: number;
  attribution: string;
  warning?: string;
}> {
  const { latitude, longitude, radiusKm = 5, limit = 50, timeoutSeconds = 20 } = params;

  if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Invalid destination coordinates for hotel search");
  }

  const cacheKey = `${latitude.toFixed(3)}_${longitude.toFixed(3)}_${radiusKm}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      hotels: cached.items.slice(0, limit),
      source: "cache",
      totalFound: cached.items.length,
      attribution: OSM_ATTRIBUTION,
    };
  }

  const radiusMeters = Math.min(Math.max(radiusKm, 1), 30) * 1000;
  const query = buildOverpassQuery(latitude, longitude, radiusMeters, timeoutSeconds);

  const endpoint = process.env.OVERPASS_API_ENDPOINT || "https://overpass-api.de/api/interpreter";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), (timeoutSeconds + 2) * 1000);

  try {
    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "ConcordGroupTripNegotiator/1.0 (travel-negotiator@concord.app)",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("OpenStreetMap Overpass API rate limit reached. Please retry in a few moments.");
      }
      throw new Error(`OpenStreetMap Overpass API responded with HTTP ${response.status}`);
    }

    const data = (await response.json()) as OsmOverpassRawResponse;
    const elements = data.elements || [];
    const parsedHotels = parseOverpassElements(elements, latitude, longitude);

    // Save to cache
    cache.set(cacheKey, {
      timestamp: Date.now(),
      items: parsedHotels,
    });

    return {
      hotels: parsedHotels.slice(0, limit),
      source: "osm_overpass",
      totalFound: parsedHotels.length,
      attribution: OSM_ATTRIBUTION,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : String(err);

    // If abort or timeout, provide helpful message
    if (errorMsg.includes("abort") || errorMsg.includes("timeout")) {
      throw new Error(`OpenStreetMap Overpass query timed out after ${timeoutSeconds}s. Try a smaller search radius.`);
    }
    throw err;
  }
}

/**
 * Clear the internal search cache (helpful for unit testing)
 */
export function clearOsmHotelCache(): void {
  cache.clear();
}
