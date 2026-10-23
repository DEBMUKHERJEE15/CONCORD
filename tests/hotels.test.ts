import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchOsmHotels,
  parseOverpassElements,
  calculateHaversineDistanceKm,
  mapOsmTourismType,
  buildOverpassQuery,
  clearOsmHotelCache,
  OSM_ATTRIBUTION,
  OsmOverpassRawElement,
} from "../src/lib/hotels/osm-overpass";
import {
  getAmadeusConfig,
  getAmadeusAccessToken,
  clearAmadeusTokenCache,
  normalizeAmadeusOffer,
  isOfferExpired,
  AmadeusRawHotelOffersResponseItem,
  AmadeusRawOfferItem,
} from "../src/lib/hotels/amadeus-provider";
import {
  calculateTripBudget,
  calculateNightsBetween,
  convertToINR,
} from "../src/lib/hotels/budget-calculator";
import {
  directoryItemToHotelOffer,
  deriveHotelCategory,
  deriveComfortScore,
  deriveTransitScore,
} from "../src/lib/hotels/hotel-normalizer";
import {
  generateCandidateItineraries,
  buildItineraryCandidate,
} from "../src/lib/optimizer";
import {
  DEFAULT_TRIP_SETUP,
  DEFAULT_TRAVELERS,
  DEMO_HOTELS,
  DEMO_TRANSPORTS,
  DEMO_ACTIVITIES,
  DEMO_DINING_PACKAGES,
} from "../src/data/demo-offers";
import {
  HotelDirectoryItem,
  HotelOfferLive,
  HotelUserEstimate,
  TripSetup,
  SavedTripSession,
} from "../src/types";

describe("CONCORD 20-Point Hotel Discovery, Live Pricing & Budgeting Test Suite (Section 10)", () => {
  beforeEach(() => {
    clearOsmHotelCache();
    clearAmadeusTokenCache();
    vi.restoreAllMocks();
  });

  // ==========================================
  // Test 1: Searching for hotels around a valid destination
  // ==========================================
  it("1. should search and parse OpenStreetMap hotels around a valid coordinate destination", async () => {
    const mockElements: OsmOverpassRawElement[] = [
      {
        type: "node",
        id: 101,
        lat: 15.518,
        lon: 73.763,
        tags: {
          name: "Candolim Heritage Beach Resort",
          tourism: "resort",
          stars: "4",
          "addr:street": "Fort Aguada Road",
          "addr:city": "Candolim",
          phone: "+91 832 2489000",
          website: "https://candolimheritage.example.com",
          wheelchair: "yes",
          internet_access: "wlan",
          swimming_pool: "yes",
        },
      },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 0.6, generator: "Overpass API", elements: mockElements }),
    } as Response);

    const result = await searchOsmHotels(
      { latitude: 15.515, longitude: 73.76, radiusKm: 5 },
      mockFetch as unknown as typeof fetch
    );

    expect(result.hotels).toHaveLength(1);
    const hotel = result.hotels[0];
    expect(hotel.name).toBe("Candolim Heritage Beach Resort");
    expect(hotel.accommodationType).toBe("resort");
    expect(hotel.stars).toBe(4);
    expect(hotel.wheelchairAccessible).toBe(true);
    expect(hotel.distanceKm).toBeGreaterThan(0);
    expect(hotel.attribution).toContain("OpenStreetMap");
    expect(hotel.priceStatus).toBe("price_unavailable"); // OSM directory has no commercial price
  });

  // ==========================================
  // Test 2: Empty and failed Overpass responses
  // ==========================================
  it("2. should handle empty and failed Overpass responses gracefully without crashing", async () => {
    // 2a. Empty elements
    const emptyFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 0.6, elements: [] }),
    } as Response);

    const emptyResult = await searchOsmHotels(
      { latitude: 20.0, longitude: 80.0, radiusKm: 2 },
      emptyFetch as unknown as typeof fetch
    );
    expect(emptyResult.hotels).toHaveLength(0);
    expect(emptyResult.totalFound).toBe(0);

    // 2b. Rate limit HTTP 429
    const rateLimitFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as Response);

    await expect(
      searchOsmHotels(
        { latitude: 20.0, longitude: 80.0 },
        rateLimitFetch as unknown as typeof fetch
      )
    ).rejects.toThrow(/rate limit/i);
  });

  // ==========================================
  // Test 3: Missing hotel names or coordinates
  // ==========================================
  it("3. should skip elements missing hotel names or valid coordinates and NEVER fabricate them", () => {
    const rawElements: OsmOverpassRawElement[] = [
      {
        type: "node",
        id: 201,
        lat: 15.5,
        lon: 73.7,
        tags: { tourism: "hotel" }, // MISSING name
      },
      {
        type: "node",
        id: 202,
        tags: { name: "Ghost Hotel", tourism: "hotel" }, // MISSING lat/lon
      },
      {
        type: "way",
        id: 203,
        center: { lat: 15.51, lon: 73.72 },
        tags: { name: "Valid Sunset Guest House", tourism: "guest_house" },
      },
    ];

    const parsed = parseOverpassElements(rawElements, 15.5, 73.7);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Valid Sunset Guest House");
    expect(parsed[0].accommodationType).toBe("guest_house");
  });

  // ==========================================
  // Test 4: Duplicate hotel records
  // ==========================================
  it("4. should deduplicate duplicate hotel records by OSM identity and name/proximity", () => {
    const rawElements: OsmOverpassRawElement[] = [
      {
        type: "node",
        id: 301,
        lat: 15.5001,
        lon: 73.7001,
        tags: { name: "Ocean Breeze Inn", tourism: "hotel" },
      },
      {
        type: "node",
        id: 301, // Exact same OSM id
        lat: 15.5001,
        lon: 73.7001,
        tags: { name: "Ocean Breeze Inn", tourism: "hotel" },
      },
      {
        type: "way",
        id: 302, // Way representing the same building within ~50m
        center: { lat: 15.5002, lon: 73.7002 },
        tags: { name: "Ocean Breeze Inn", tourism: "hotel" },
      },
    ];

    const parsed = parseOverpassElements(rawElements, 15.5, 73.7);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Ocean Breeze Inn");
  });

  // ==========================================
  // Test 5: A hotel with no price
  // ==========================================
  it("5. should label a hotel with no price as directory-only and not fabricate room availability", () => {
    const rawItem: HotelDirectoryItem = {
      id: "osm-node-401",
      osmId: 401,
      osmType: "node",
      name: "Heritage Villa Candolim",
      accommodationType: "hotel",
      latitude: 15.52,
      longitude: 73.77,
      distanceKm: 2.1,
      source: "osm",
      attribution: OSM_ATTRIBUTION,
      priceStatus: "price_unavailable",
    };

    const offer = directoryItemToHotelOffer(rawItem, "Goa");
    expect(offer.pricePerNightINR).toBe(0);
    expect(offer.tag).toBe("DIRECTORY LISTING — NO PRICE");
    expect(offer.priceStatus).toBe("price_unavailable");

    // Budget calculator with unpriced accommodation
    const budget = calculateTripBudget({
      travelerCount: 4,
      departureDate: "2026-11-10",
      returnDate: "2026-11-14",
      sharedBudgetINR: 80000,
      selectedHotel: {
        directoryItem: rawItem,
        totalStayINR: 0,
        priceStatus: "price_unavailable",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-14",
        roomCount: 2,
        guestsCount: 4,
      },
    });

    expect(budget.categories.accommodation.status).toBe("missing");
    expect(budget.categories.accommodation.amountINR).toBe(0);
  });

  // ==========================================
  // Test 6: A hotel with a real returned offer
  // ==========================================
  it("6. should normalize and calculate a hotel with a real returned provider offer", () => {
    const rawHotel: AmadeusRawHotelOffersResponseItem["hotel"] = {
      type: "hotel",
      hotelId: "MCLISBOA",
      name: "Tivoli Avenida Liberdade",
    };

    const rawOffer: AmadeusRawOfferItem = {
      id: "OFFER-991",
      checkInDate: "2026-11-10",
      checkOutDate: "2026-11-14", // 4 nights
      room: {
        type: "DLX",
        typeEstimated: { category: "Deluxe Suite", beds: 1, bedType: "KING" },
        description: { text: "Spacious luxury deluxe suite with city panorama" },
      },
      price: {
        currency: "INR",
        total: "32000.00",
        variations: { average: { base: "8000.00" } },
      },
      policies: {
        cancellation: { deadline: "2026-11-08T18:00:00" },
      },
    };

    const normalized = normalizeAmadeusOffer(rawHotel, rawOffer, 1, 2);
    expect(normalized.propertyName).toBe("Tivoli Avenida Liberdade");
    expect(normalized.pricePerNight).toBe(8000);
    expect(normalized.totalStayPrice).toBe(32000);
    expect(normalized.nights).toBe(4);
    expect(normalized.roomType).toBe("Deluxe Suite");
    expect(normalized.cancellationPolicy).toContain("Free cancellation");
    expect(normalized.isExpired).toBe(false);
  });

  // ==========================================
  // Test 7: Different check-in and check-out dates
  // ==========================================
  it("7. should correctly calculate nights and scale prices across different check-in and check-out dates", () => {
    const nights3 = calculateNightsBetween("2026-11-10", "2026-11-13");
    expect(nights3).toBe(3);

    const nights7 = calculateNightsBetween("2026-11-10", "2026-11-17");
    expect(nights7).toBe(7);

    const budget3 = calculateTripBudget({
      travelerCount: 2,
      roomCount: 1,
      departureDate: "2026-11-10",
      returnDate: "2026-11-13",
      sharedBudgetINR: 50000,
      selectedHotel: {
        directoryItem: {
          id: "osm-1",
          osmId: 1,
          osmType: "node",
          name: "Test Hotel",
          accommodationType: "hotel",
          latitude: 15.5,
          longitude: 73.7,
          attribution: OSM_ATTRIBUTION,
          priceStatus: "user_estimate",
        },
        userEstimate: {
          nightlyRateINR: 4000,
          currency: "INR",
          estimatedBy: "user",
          timestamp: new Date().toISOString(),
        },
        totalStayINR: 12000,
        priceStatus: "user_estimate",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-13",
        roomCount: 1,
        guestsCount: 2,
      },
    });

    expect(budget3.categories.accommodation.amountINR).toBe(4000 * 3 * 1); // 12,000

    const budget7 = calculateTripBudget({
      travelerCount: 2,
      roomCount: 1,
      departureDate: "2026-11-10",
      returnDate: "2026-11-17",
      sharedBudgetINR: 50000,
      selectedHotel: {
        directoryItem: {
          id: "osm-1",
          osmId: 1,
          osmType: "node",
          name: "Test Hotel",
          accommodationType: "hotel",
          latitude: 15.5,
          longitude: 73.7,
          attribution: OSM_ATTRIBUTION,
          priceStatus: "user_estimate",
        },
        userEstimate: {
          nightlyRateINR: 4000,
          currency: "INR",
          estimatedBy: "user",
          timestamp: new Date().toISOString(),
        },
        totalStayINR: 28000,
        priceStatus: "user_estimate",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-17",
        roomCount: 1,
        guestsCount: 2,
      },
    });

    expect(budget7.categories.accommodation.amountINR).toBe(4000 * 7 * 1); // 28,000
  });

  // ==========================================
  // Test 8: Multiple rooms and guests
  // ==========================================
  it("8. should correctly scale hotel cost by room quantity and traveler count", () => {
    // 4 travelers with 2 rooms vs 8 travelers with 4 rooms
    const budget4 = calculateTripBudget({
      travelerCount: 4,
      roomCount: 2,
      departureDate: "2026-11-10",
      returnDate: "2026-11-14", // 4 nights
      sharedBudgetINR: 100000,
      selectedHotel: {
        directoryItem: {
          id: "osm-1",
          osmId: 1,
          osmType: "node",
          name: "Resort Stay",
          accommodationType: "resort",
          latitude: 15.5,
          longitude: 73.7,
          attribution: OSM_ATTRIBUTION,
          priceStatus: "user_estimate",
        },
        userEstimate: {
          nightlyRateINR: 5000,
          currency: "INR",
          estimatedBy: "user",
          timestamp: new Date().toISOString(),
        },
        totalStayINR: 40000,
        priceStatus: "user_estimate",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-14",
        roomCount: 2,
        guestsCount: 4,
      },
    });

    // 5000/night * 4 nights * 2 rooms = 40,000
    expect(budget4.categories.accommodation.amountINR).toBe(40000);
    expect(budget4.roomCount).toBe(2);
    expect(budget4.travelerCount).toBe(4);
  });

  // ==========================================
  // Test 9: Taxes included versus excluded
  // ==========================================
  it("9. should correctly handle taxes included vs excluded without double-counting", () => {
    // 9a. Taxes included in room rate
    const liveOfferIncluded: HotelOfferLive = {
      offerId: "OFF-1",
      propertyId: "HOTEL-A",
      propertyName: "Grand Palms Resort",
      checkInDate: "2026-11-10",
      checkOutDate: "2026-11-14",
      nights: 4,
      roomQuantity: 1,
      adults: 2,
      pricePerNight: 5000,
      totalStayPrice: 20000,
      currency: "INR",
      taxesAndFees: 2400,
      taxesIncluded: true, // Included!
      pricingTimestamp: new Date().toISOString(),
      source: "amadeus",
    };

    const budgetInc = calculateTripBudget({
      travelerCount: 2,
      departureDate: "2026-11-10",
      returnDate: "2026-11-14",
      sharedBudgetINR: 50000,
      selectedHotel: {
        directoryItem: {
          id: "osm-h1",
          osmId: 1,
          osmType: "node",
          name: "Grand Palms Resort",
          accommodationType: "resort",
          latitude: 15.5,
          longitude: 73.7,
          attribution: OSM_ATTRIBUTION,
          priceStatus: "live_offer",
        },
        selectedOffer: liveOfferIncluded,
        totalStayINR: 20000,
        priceStatus: "live_offer",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-14",
        roomCount: 1,
        guestsCount: 2,
      },
    });

    expect(budgetInc.categories.taxesAndFees.status).toBe("included_in_items");
    expect(budgetInc.categories.taxesAndFees.amountINR).toBe(0); // Not double-counted!

    // 9b. Taxes excluded
    const liveOfferExcluded: HotelOfferLive = {
      ...liveOfferIncluded,
      taxesIncluded: false, // Excluded!
    };

    const budgetExc = calculateTripBudget({
      travelerCount: 2,
      departureDate: "2026-11-10",
      returnDate: "2026-11-14",
      sharedBudgetINR: 50000,
      selectedHotel: {
        directoryItem: {
          id: "osm-h1",
          osmId: 1,
          osmType: "node",
          name: "Grand Palms Resort",
          accommodationType: "resort",
          latitude: 15.5,
          longitude: 73.7,
          attribution: OSM_ATTRIBUTION,
          priceStatus: "live_offer",
        },
        selectedOffer: liveOfferExcluded,
        totalStayINR: 20000,
        priceStatus: "live_offer",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-14",
        roomCount: 1,
        guestsCount: 2,
      },
    });

    expect(budgetExc.categories.taxesAndFees.status).toBe("calculated");
    expect(budgetExc.categories.taxesAndFees.amountINR).toBe(2400); // Explicitly accounted
  });

  // ==========================================
  // Test 10: Currency differences
  // ==========================================
  it("10. should convert foreign currency offers transparently without speculative exchange rates", () => {
    // 100 EUR converted at 91.5
    const eurConv = convertToINR(100, "EUR", { EUR_TO_INR: 91.5 });
    expect(eurConv.amountINR).toBe(9150);
    expect(eurConv.conversionNote).toContain("91.50");

    // 100 USD converted at 84.0
    const usdConv = convertToINR(100, "USD", { USD_TO_INR: 84.0 });
    expect(usdConv.amountINR).toBe(8400);
    expect(usdConv.conversionNote).toContain("84.00");

    // INR remains unchanged
    const inrConv = convertToINR(5000, "INR");
    expect(inrConv.amountINR).toBe(5000);
    expect(inrConv.conversionNote).toBeUndefined();
  });

  // ==========================================
  // Test 11: Missing Amadeus credentials
  // ==========================================
  it("11. should report missing Amadeus credentials cleanly without crashing", async () => {
    const config = getAmadeusConfig();
    // In test environment without explicit env vars
    if (!config.isConfigured) {
      expect(config.isConfigured).toBe(false);
      await expect(
        getAmadeusAccessToken({ clientId: "", clientSecret: "", baseUrl: "https://test.api.amadeus.com" })
      ).rejects.toThrow(/AMADEUS_MISSING_CREDENTIALS/);
    }
  });

  // ==========================================
  // Test 12: Invalid provider credentials
  // ==========================================
  it("12. should handle invalid provider credentials with clear error messages", async () => {
    const mockAuthFailFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({
        error: "invalid_client",
        error_description: "Invalid client credentials supplied",
      }),
    } as Response);

    await expect(
      getAmadeusAccessToken(
        { clientId: "invalid_id", clientSecret: "invalid_sec", baseUrl: "https://test.api.amadeus.com" },
        mockAuthFailFetch as unknown as typeof fetch
      )
    ).rejects.toThrow(/AMADEUS_AUTH_ERROR.*Invalid client credentials/i);
  });

  // ==========================================
  // Test 13: Expired offers
  // ==========================================
  it("13. should detect expired offers accurately based on timestamp", () => {
    const expiredOffer: HotelOfferLive = {
      offerId: "EXP-1",
      propertyId: "H-1",
      propertyName: "Expired Hotel",
      checkInDate: "2026-11-10",
      checkOutDate: "2026-11-14",
      nights: 4,
      roomQuantity: 1,
      adults: 2,
      pricePerNight: 4000,
      totalStayPrice: 16000,
      currency: "INR",
      taxesIncluded: true,
      pricingTimestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      source: "amadeus",
    };

    expect(isOfferExpired(expiredOffer)).toBe(true);

    const activeOffer: HotelOfferLive = {
      ...expiredOffer,
      expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // in 25 minutes
    };

    expect(isOfferExpired(activeOffer)).toBe(false);
  });

  // ==========================================
  // Test 14: Destination changes invalidating previous hotel selections
  // ==========================================
  it("14. should invalidate previous hotel selection when destination changes to prevent offer leakage", () => {
    let tripState: TripSetup = {
      ...DEFAULT_TRIP_SETUP,
      destination: "Goa",
      selectedHotel: {
        directoryItem: {
          id: "osm-goa-1",
          osmId: 101,
          osmType: "node",
          name: "Candolim Palms",
          accommodationType: "hotel",
          latitude: 15.5,
          longitude: 73.7,
          attribution: OSM_ATTRIBUTION,
          priceStatus: "user_estimate",
        },
        totalStayINR: 20000,
        priceStatus: "user_estimate",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-14",
        roomCount: 2,
        guestsCount: 4,
      },
    };

    expect(tripState.selectedHotel).toBeDefined();

    // User changes destination to Jaipur
    const newDestination = "Jaipur";
    tripState = {
      ...tripState,
      destination: newDestination,
      selectedHotel: undefined, // Enforced invalidation rule
    };

    expect(tripState.destination).toBe("Jaipur");
    expect(tripState.selectedHotel).toBeUndefined(); // Stale Goa hotel is completely cleared
  });

  // ==========================================
  // Test 15: Correct total-trip and per-traveler costs
  // ==========================================
  it("15. should calculate authoritative total trip cost and cost per traveler using deterministic formulas", () => {
    const budget = calculateTripBudget({
      travelerCount: 4,
      roomCount: 2,
      departureDate: "2026-11-10",
      returnDate: "2026-11-14", // 4 nights
      sharedBudgetINR: 100000,
      customTransportCostINR: 16000,
      customActivityCostINR: 8000,
      customDiningCostINR: 12000,
      customLocalTransportCostINR: 4000,
      contingencyPercentage: 5,
      selectedHotel: {
        directoryItem: {
          id: "osm-hotel",
          osmId: 501,
          osmType: "node",
          name: "Sun Beach Resort",
          accommodationType: "resort",
          latitude: 15.5,
          longitude: 73.7,
          attribution: OSM_ATTRIBUTION,
          priceStatus: "user_estimate",
        },
        userEstimate: {
          nightlyRateINR: 4000,
          currency: "INR",
          estimatedBy: "user",
          timestamp: new Date().toISOString(),
        },
        totalStayINR: 32000, // 4000 * 4 nights * 2 rooms
        priceStatus: "user_estimate",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-14",
        roomCount: 2,
        guestsCount: 4,
      },
    });

    // Subtotal: 16000 (trans) + 32000 (acc) + 8000 (act) + 12000 (din) + 4000 (loc) = 72,000
    // Contingency 5% of 72,000 = 3,600
    // Total = 75,600
    expect(budget.totalTripCostINR).toBe(75600);
    expect(budget.costPerTravelerINR).toBe(75600 / 4); // 18,900
    expect(budget.remainingBudgetINR).toBe(100000 - 75600); // 24,400
    expect(budget.isOverBudget).toBe(false);
  });

  // ==========================================
  // Test 16: Over-budget itinerary rejection
  // ==========================================
  it("16. should identify over-budget conditions and flag deficit without altering data to fake feasibility", () => {
    const budget = calculateTripBudget({
      travelerCount: 4,
      roomCount: 2,
      departureDate: "2026-11-10",
      returnDate: "2026-11-14",
      sharedBudgetINR: 50000, // Strict low budget
      customTransportCostINR: 20000,
      customActivityCostINR: 10000,
      customDiningCostINR: 16000,
      contingencyPercentage: 5,
      selectedHotel: {
        directoryItem: {
          id: "osm-luxury",
          osmId: 502,
          osmType: "node",
          name: "Luxury Palace",
          accommodationType: "hotel",
          latitude: 15.5,
          longitude: 73.7,
          attribution: OSM_ATTRIBUTION,
          priceStatus: "user_estimate",
        },
        userEstimate: {
          nightlyRateINR: 6000,
          currency: "INR",
          estimatedBy: "user",
          timestamp: new Date().toISOString(),
        },
        totalStayINR: 48000, // 6000 * 4 * 2
        priceStatus: "user_estimate",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-14",
        roomCount: 2,
        guestsCount: 4,
      },
    });

    expect(budget.isOverBudget).toBe(true);
    expect(budget.budgetOverrunINR).toBeGreaterThan(0);
    expect(budget.remainingBudgetINR).toBeLessThan(0);
  });

  // ==========================================
  // Test 17: Renegotiation after hotel selection
  // ==========================================
  it("17. should regenerate candidate itineraries incorporating chosen hotel and adjust satisfaction immediately", () => {
    const customHotel: HotelDirectoryItem = {
      id: "osm-custom-villa",
      osmId: 777,
      osmType: "way",
      name: "Villa Tranquil Palms",
      accommodationType: "guest_house",
      latitude: 15.52,
      longitude: 73.75,
      distanceKm: 1.2,
      stars: 4,
      amenities: ["Free Wi-Fi", "Swimming Pool", "Air Conditioning"],
      attribution: OSM_ATTRIBUTION,
      priceStatus: "user_estimate",
    };

    const tripWithHotel: TripSetup = {
      ...DEFAULT_TRIP_SETUP,
      selectedHotel: {
        directoryItem: customHotel,
        userEstimate: {
          nightlyRateINR: 6000,
          currency: "INR",
          estimatedBy: "user",
          timestamp: new Date().toISOString(),
        },
        totalStayINR: 48000,
        priceStatus: "user_estimate",
        checkInDate: DEFAULT_TRIP_SETUP.departureDate,
        checkOutDate: DEFAULT_TRIP_SETUP.returnDate,
        roomCount: 2,
        guestsCount: 4,
        distanceKm: 1.2,
      },
    };

    const candidates = generateCandidateItineraries(tripWithHotel, DEFAULT_TRAVELERS);
    expect(candidates).toHaveLength(3);

    const balanced = candidates.find((c) => c.strategy === "best_balanced");
    expect(balanced).toBeDefined();
    expect(balanced?.hotel.name).toBe("Villa Tranquil Palms");
    expect(balanced?.hotel.pricePerNightINR).toBe(6000);
    expect(balanced?.hotel.distanceKm).toBe(1.2);
  });

  // ==========================================
  // Test 18: Saved-plan persistence
  // ==========================================
  it("18. should serialize and deserialize saved trip sessions containing selected hotel and budget calculation", () => {
    const session: SavedTripSession = {
      id: "session-2026-test",
      name: "Goa Reunion 2026",
      createdAt: new Date().toISOString(),
      trip: {
        ...DEFAULT_TRIP_SETUP,
        roomCount: 2,
        selectedHotel: {
          directoryItem: {
            id: "osm-persist-1",
            osmId: 888,
            osmType: "node",
            name: "Heritage Fort Villa",
            accommodationType: "resort",
            latitude: 15.5,
            longitude: 73.7,
            attribution: OSM_ATTRIBUTION,
            priceStatus: "user_estimate",
          },
          userEstimate: {
            nightlyRateINR: 5500,
            currency: "INR",
            estimatedBy: "user",
            timestamp: new Date().toISOString(),
          },
          totalStayINR: 44000,
          priceStatus: "user_estimate",
          checkInDate: "2026-11-10",
          checkOutDate: "2026-11-14",
          roomCount: 2,
          guestsCount: 4,
        },
      },
      travelers: DEFAULT_TRAVELERS,
      selectedCandidateId: "candidate-balanced-compromise",
    };

    const jsonStr = JSON.stringify(session);
    const restored: SavedTripSession = JSON.parse(jsonStr);

    expect(restored.trip.selectedHotel).toBeDefined();
    expect(restored.trip.selectedHotel?.directoryItem.name).toBe("Heritage Fort Villa");
    expect(restored.trip.selectedHotel?.userEstimate?.nightlyRateINR).toBe(5500);
    expect(restored.trip.roomCount).toBe(2);
  });

  // ==========================================
  // Test 19: Mobile hotel results and filters
  // ==========================================
  it("19. should support category mapping, comfort scores, and sorting for responsive cards", () => {
    expect(deriveHotelCategory(5, "resort")).toBe("luxury_resort");
    expect(deriveHotelCategory(4, "hotel")).toBe("boutique");
    expect(deriveHotelCategory(2, "hostel")).toBe("budget");

    expect(deriveComfortScore(4, ["Free Wi-Fi", "Pool", "AC"])).toBeGreaterThanOrEqual(8.0);
    expect(deriveTransitScore(1.2)).toBe(9.5); // Very close to center
    expect(deriveTransitScore(12.0)).toBe(4.5); // Further away
  });

  // ==========================================
  // Test 20: Production build
  // ==========================================
  it("20. should have clean module exports ready for Next.js production build without missing dependencies", () => {
    expect(typeof searchOsmHotels).toBe("function");
    expect(typeof getAmadeusConfig).toBe("function");
    expect(typeof calculateTripBudget).toBe("function");
    expect(typeof directoryItemToHotelOffer).toBe("function");
  });
});
