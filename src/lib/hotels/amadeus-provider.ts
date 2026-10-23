import { HotelOfferLive } from "../../types";

export interface AmadeusCredentials {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export interface AmadeusTokenCache {
  accessToken: string;
  expiresAtMs: number;
}

let tokenCache: AmadeusTokenCache | null = null;

export function getAmadeusConfig(): {
  isConfigured: boolean;
  clientId?: string;
  clientSecret?: string;
  baseUrl: string;
} {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  const baseUrl = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";

  const isConfigured = Boolean(clientId && clientSecret && clientId.trim() !== "" && clientSecret.trim() !== "");

  return {
    isConfigured,
    clientId: isConfigured ? clientId : undefined,
    clientSecret: isConfigured ? clientSecret : undefined,
    baseUrl,
  };
}

/**
 * Retrieves a valid OAuth2 bearer token from Amadeus, reusing cached token if valid
 */
export async function getAmadeusAccessToken(
  credentials?: AmadeusCredentials,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const config = credentials || {
    clientId: process.env.AMADEUS_CLIENT_ID || "",
    clientSecret: process.env.AMADEUS_CLIENT_SECRET || "",
    baseUrl: process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com",
  };

  if (!config.clientId || !config.clientSecret) {
    throw new Error("AMADEUS_MISSING_CREDENTIALS: Amadeus client ID or secret is not configured.");
  }

  // Check cache
  if (tokenCache && Date.now() < tokenCache.expiresAtMs - 60000) {
    return tokenCache.accessToken;
  }

  const tokenUrl = `${config.baseUrl.replace(/\/+$/, "")}/v1/security/oauth2/token`;
  const bodyParams = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetchFn(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson.error_description || errJson.title || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(`AMADEUS_AUTH_ERROR: Authentication failed (${response.status}): ${errorDetail}`);
  }

  const tokenData = await response.json();
  const accessToken = tokenData.access_token;
  const expiresInSec = tokenData.expires_in || 1799;

  tokenCache = {
    accessToken,
    expiresAtMs: Date.now() + expiresInSec * 1000,
  };

  return accessToken;
}

/**
 * Resets the in-memory token cache (useful for testing)
 */
export function clearAmadeusTokenCache(): void {
  tokenCache = null;
}

export interface AmadeusHotelReference {
  chainCode?: string;
  iataCode?: string;
  dupeId?: number;
  name: string;
  hotelId: string;
  geoCode: {
    latitude: number;
    longitude: number;
  };
  address?: {
    countryCode?: string;
    cityName?: string;
  };
}

/**
 * Searches Amadeus for hotels near coordinates
 */
export async function searchAmadeusHotelsByGeocode(
  params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
  },
  credentials?: AmadeusCredentials,
  fetchFn: typeof fetch = fetch
): Promise<AmadeusHotelReference[]> {
  const token = await getAmadeusAccessToken(credentials, fetchFn);
  const baseUrl = (credentials?.baseUrl || process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com").replace(/\/+$/, "");

  const radius = Math.min(Math.max(params.radiusKm || 5, 1), 30);
  const url = `${baseUrl}/v1/reference-data/locations/hotels/by-geocode?latitude=${params.latitude}&longitude=${params.longitude}&radius=${radius}&radiusUnit=KM`;

  const response = await fetchFn(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AMADEUS_API_ERROR: Hotel lookup failed with status ${response.status}: ${errText}`);
  }

  const json = await response.json();
  return (json.data || []) as AmadeusHotelReference[];
}

export interface AmadeusHotelOfferParams {
  hotelIds: string[];
  adults: number;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  roomQuantity: number;
}

export interface AmadeusRawOfferItem {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  rateCode?: string;
  rateFamilyEstimated?: {
    code?: string;
    type?: string;
  };
  room?: {
    type?: string;
    typeEstimated?: {
      category?: string;
      beds?: number;
      bedType?: string;
    };
    description?: {
      text?: string;
    };
  };
  guests?: {
    adults?: number;
  };
  price: {
    currency: string;
    base?: string;
    total: string;
    variations?: {
      average?: {
        base?: string;
      };
      changes?: Array<{
        startDate: string;
        endDate: string;
        base?: string;
        total?: string;
      }>;
    };
    taxes?: Array<{
      code?: string;
      amount?: string;
      currency?: string;
      included?: boolean;
    }>;
  };
  policies?: {
    cancellation?: {
      description?: {
        text?: string;
      };
      type?: string;
      amount?: string;
      deadline?: string;
    };
  };
  self?: string;
}

export interface AmadeusRawHotelOffersResponseItem {
  type: string;
  hotel: {
    type: string;
    hotelId: string;
    chainCode?: string;
    dupeId?: string;
    name: string;
    cityCode?: string;
    latitude?: number;
    longitude?: number;
  };
  available: boolean;
  offers?: AmadeusRawOfferItem[];
}

/**
 * Normalizes an Amadeus raw room offer into Concord's standardized HotelOfferLive
 */
export function normalizeAmadeusOffer(
  rawHotel: AmadeusRawHotelOffersResponseItem["hotel"],
  rawOffer: AmadeusRawOfferItem,
  roomQuantity: number,
  adults: number
): HotelOfferLive {
  const checkIn = new Date(rawOffer.checkInDate);
  const checkOut = new Date(rawOffer.checkOutDate);
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  const nights = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);

  const totalStayPrice = parseFloat(rawOffer.price.total);
  if (isNaN(totalStayPrice)) {
    throw new Error(`Invalid price returned for hotel offer ${rawOffer.id}`);
  }

  // Calculate per-night rate. If variations.average exists, use that, else divide total by (nights * roomQuantity)
  let pricePerNight = 0;
  if (rawOffer.price.variations?.average?.base) {
    pricePerNight = parseFloat(rawOffer.price.variations.average.base);
  } else {
    pricePerNight = Math.round((totalStayPrice / (nights * Math.max(roomQuantity, 1))) * 100) / 100;
  }

  // Calculate taxes
  let taxesAndFees = 0;
  let taxesIncluded = true;
  if (rawOffer.price.taxes && rawOffer.price.taxes.length > 0) {
    for (const t of rawOffer.price.taxes) {
      if (t.amount) {
        taxesAndFees += parseFloat(t.amount) || 0;
      }
      if (t.included === false) {
        taxesIncluded = false;
      }
    }
  }

  // Cancellation policy description
  const cancellationPolicy =
    rawOffer.policies?.cancellation?.description?.text ||
    (rawOffer.policies?.cancellation?.deadline
      ? `Free cancellation until ${rawOffer.policies.cancellation.deadline}`
      : "Non-refundable / standard hotel policy");

  const roomType =
    rawOffer.room?.typeEstimated?.category ||
    rawOffer.room?.type ||
    "Standard Room";

  const bedType = rawOffer.room?.typeEstimated?.bedType;
  const roomDescription = rawOffer.room?.description?.text;

  return {
    offerId: rawOffer.id,
    propertyId: rawHotel.hotelId,
    propertyName: rawHotel.name,
    checkInDate: rawOffer.checkInDate,
    checkOutDate: rawOffer.checkOutDate,
    nights,
    roomQuantity,
    adults,
    roomType,
    roomDescription,
    bedType,
    pricePerNight,
    totalStayPrice,
    currency: rawOffer.price.currency || "EUR",
    taxesAndFees: taxesAndFees > 0 ? Math.round(taxesAndFees * 100) / 100 : undefined,
    taxesIncluded,
    cancellationPolicy,
    pricingTimestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Amadeus offers typically valid for ~30 mins
    isExpired: false,
    source: "amadeus",
    rateRuleExplanation: `Verified Amadeus live offer for ${roomQuantity} room(s), ${adults} guest(s), ${nights} night(s).`,
  };
}

/**
 * Searches Amadeus for live room offers for given hotel IDs
 */
export async function fetchAmadeusHotelOffers(
  params: AmadeusHotelOfferParams,
  credentials?: AmadeusCredentials,
  fetchFn: typeof fetch = fetch
): Promise<HotelOfferLive[]> {
  const token = await getAmadeusAccessToken(credentials, fetchFn);
  const baseUrl = (credentials?.baseUrl || process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com").replace(/\/+$/, "");

  if (!params.hotelIds || params.hotelIds.length === 0) {
    return [];
  }

  const queryParams = new URLSearchParams({
    hotelIds: params.hotelIds.slice(0, 10).join(","), // Limit to 10 hotels per call for performance
    adults: String(params.adults || 2),
    checkInDate: params.checkInDate,
    checkOutDate: params.checkOutDate,
    roomQuantity: String(params.roomQuantity || 1),
  });

  const url = `${baseUrl}/v3/shopping/hotel-offers?${queryParams.toString()}`;

  const response = await fetchFn(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AMADEUS_OFFER_ERROR: Failed to fetch hotel offers (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const dataList: AmadeusRawHotelOffersResponseItem[] = json.data || [];
  const normalizedOffers: HotelOfferLive[] = [];

  for (const item of dataList) {
    if (item.available && item.offers && item.offers.length > 0) {
      for (const rawOffer of item.offers) {
        try {
          const offer = normalizeAmadeusOffer(
            item.hotel,
            rawOffer,
            params.roomQuantity,
            params.adults
          );
          normalizedOffers.push(offer);
        } catch {
          // Ignore individual unparseable offers
        }
      }
    }
  }

  return normalizedOffers;
}

/**
 * Checks whether an offer has expired
 */
export function isOfferExpired(offer: HotelOfferLive): boolean {
  if (!offer.expiresAt) return false;
  return new Date(offer.expiresAt).getTime() < Date.now();
}
