import { DestinationObject } from "@/types";

// In-memory cache for recent queries to avoid repeated API requests
const searchCache = new Map<string, { timestamp: number; data: DestinationObject[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Normalizes a raw Photon GeoJSON Feature into a typed DestinationObject.
 * Note: Photon coordinates are [longitude, latitude]. We do NOT reverse them.
 */
export function normalizePhotonFeature(feature: any, index = 0): DestinationObject | null {
  if (!feature || typeof feature !== "object") return null;

  const props = feature.properties || {};
  const coords = feature.geometry?.coordinates;

  const name = props.name || props.city || props.town || props.state || props.country || "Unknown Location";

  // Build a geographic display name without fabricating data
  const parts: string[] = [];
  if (name) parts.push(name);
  if (props.state && props.state !== name) parts.push(props.state);
  else if (props.county && props.county !== name) parts.push(props.county);
  if (props.country && props.country !== name) parts.push(props.country);

  const displayName = parts.length > 0 ? parts.join(", ") : name;

  const osmType = props.osm_type ? String(props.osm_type) : undefined;
  const osmId = props.osm_id !== undefined ? String(props.osm_id) : undefined;

  // Stable application-level identifier
  const id = osmType && osmId
    ? `dest_osm_${osmType}_${osmId}`
    : `dest_geo_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${index}`;

  let longitude: number | undefined;
  let latitude: number | undefined;

  let coordinates: [number, number] | undefined;

  if (Array.isArray(coords) && coords.length >= 2) {
    const [lng, lat] = coords;
    if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
      longitude = lng;
      latitude = lat;
      coordinates = [lng, lat];
    }
  }

  return {
    id,
    name,
    displayName,
    country: props.country || undefined,
    region: props.state || props.county || undefined,
    state: props.state || undefined,
    countryCode: props.countrycode || undefined,
    coordinates,
    latitude,
    longitude,
    osmType,
    osmId,
    isVerified: true,
    isManual: false,
    source: "photon",
  };
}

/**
 * Creates an unverified manual destination object when search is unavailable or manual input is used.
 * Never fabricates coordinates or verification status.
 */
export function createManualDestination(rawInput: string): DestinationObject {
  const trimmed = rawInput.trim();
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return {
    id: `dest_manual_${slug}_${Date.now()}`,
    name: trimmed,
    displayName: `${trimmed} (Manual Unverified Entry)`,
    coordinates: [0, 0],
    isVerified: false,
    isManual: true,
    source: "manual",
  };
}

export interface PhotonSearchOptions {
  limit?: number;
  lang?: string;
  signal?: AbortSignal;
}

/**
 * Searches worldwide places using the public Photon geocoding API by Komoot.
 * Includes in-memory caching, URLSearchParams construction, and robust error handling.
 */
export async function searchPhoton(
  query: string,
  options: PhotonSearchOptions = {}
): Promise<{ results: DestinationObject[]; error?: string; isThrottled?: boolean }> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { results: [] };
  }

  const cacheKey = `${trimmed.toLowerCase()}_${options.limit || 6}_${options.lang || "en"}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { results: cached.data };
  }

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", String(options.limit || 6));
  url.searchParams.set("lang", options.lang || "en");

  try {
    const res = await fetch(url.toString(), {
      signal: options.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status === 429) {
      return {
        results: [],
        isThrottled: true,
        error: "Photon geocoding rate limit reached. You can enter your destination manually.",
      };
    }

    if (!res.ok) {
      return {
        results: [],
        error: `Photon returned HTTP ${res.status}. You can enter your destination manually.`,
      };
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.features)) {
      return { results: [] };
    }

    const results: DestinationObject[] = data.features
      .map((f: any, idx: number) => normalizePhotonFeature(f, idx))
      .filter((d: DestinationObject | null): d is DestinationObject => d !== null);

    // Save to cache
    searchCache.set(cacheKey, { timestamp: Date.now(), data: results });

    return { results };
  } catch (err: unknown) {
    if ((err as Error)?.name === "AbortError") {
      throw err; // Allow abort signal to be caught by caller
    }
    return {
      results: [],
      error: `Place search connection failed (${(err as Error)?.message || "network error"}). You can type your location manually.`,
    };
  }
}
