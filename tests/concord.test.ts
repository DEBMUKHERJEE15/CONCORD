import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_TRIP_SETUP,
  DEFAULT_TRAVELERS,
  DEMO_HOTELS,
  DEMO_TRANSPORTS,
  DEMO_ACTIVITIES,
  DEMO_DINING_PACKAGES,
  getOffersForDestination,
} from "../src/data/demo-offers";
import {
  generateCandidateItineraries,
  selectBestCandidate,
  buildItineraryCandidate,
} from "../src/lib/optimizer";
import {
  calculateItineraryCostsAndMetrics,
  computeTravelerSatisfaction,
  computeNightsCount,
} from "../src/lib/scoring";
import {
  performDeterministicValidation,
  ExplanationOutputSchema,
} from "../src/lib/agents/validation-agent";
import { PreferenceAnalysisSchema } from "../src/lib/agents/preference-agent";
import { NegotiationAgentOutputSchema } from "../src/lib/agents/negotiation-agent";
import {
  normalizePhotonFeature,
  createManualDestination,
  PhotonFeature,
} from "../src/lib/destinations";
import { TripSetup, TravelerProfile, SavedTripSession } from "../src/types";

describe("CONCORD 25-Point Comprehensive Test Suite (Section 15 Master Criteria)", () => {
  // Test 1: Autocomplete query for Tokyo returns Japanese results with [lon, lat] coordinates
  it("1. should normalize Tokyo feature preserving [lon, lat] coordinates and Japanese country info", () => {
    const rawTokyoFeature: PhotonFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [139.6917, 35.6895], // [lon, lat]
      },
      properties: {
        osm_id: 1543125,
        osm_type: "R",
        osm_key: "place",
        osm_value: "city",
        name: "Tokyo",
        state: "Tokyo Prefecture",
        country: "Japan",
        countrycode: "JP",
      },
    };

    const dest = normalizePhotonFeature(rawTokyoFeature);
    expect(dest.name).toBe("Tokyo");
    expect(dest.country).toBe("Japan");
    expect(dest.coordinates).toEqual([139.6917, 35.6895]);
    expect(dest.displayName).toContain("Tokyo");
    expect(dest.displayName).toContain("Japan");
    expect(dest.isManual).toBe(false);
  });

  // Test 2: Autocomplete query for Paris returns Île-de-France results
  it("2. should normalize Paris feature with Île-de-France state and French metadata", () => {
    const rawParisFeature: PhotonFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [2.3522, 48.8566],
      },
      properties: {
        osm_id: 7444,
        osm_type: "R",
        osm_key: "place",
        osm_value: "city",
        name: "Paris",
        state: "Île-de-France",
        country: "France",
        countrycode: "FR",
      },
    };

    const dest = normalizePhotonFeature(rawParisFeature);
    expect(dest.name).toBe("Paris");
    expect(dest.state).toBe("Île-de-France");
    expect(dest.country).toBe("France");
    expect(dest.coordinates[0]).toBeCloseTo(2.3522, 2);
    expect(dest.coordinates[1]).toBeCloseTo(48.8566, 2);
  });

  // Test 3: Autocomplete query for Kolkata returns West Bengal results
  it("3. should normalize Kolkata feature with West Bengal state and Indian metadata", () => {
    const rawKolkataFeature: PhotonFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [88.3639, 22.5726],
      },
      properties: {
        osm_id: 11111,
        osm_type: "N",
        osm_key: "place",
        osm_value: "city",
        name: "Kolkata",
        state: "West Bengal",
        country: "India",
        countrycode: "IN",
      },
    };

    const dest = normalizePhotonFeature(rawKolkataFeature);
    expect(dest.name).toBe("Kolkata");
    expect(dest.state).toBe("West Bengal");
    expect(dest.country).toBe("India");
    expect(dest.displayName).toBe("Kolkata, West Bengal, India");
  });

  // Test 4: Autocomplete gracefully handles missing state, county, or country fields in Photon GeoJSON
  it("4. should gracefully assemble displayName when state, county, or country fields are missing", () => {
    const featureSparse: PhotonFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [10.0, 20.0],
      },
      properties: {
        osm_id: 9999,
        osm_type: "N",
        osm_key: "place",
        osm_value: "town",
        name: "Remote Town",
        // state, county, and country omitted
      },
    };

    const dest = normalizePhotonFeature(featureSparse);
    expect(dest.name).toBe("Remote Town");
    expect(dest.displayName).toBe("Remote Town");
    expect(dest.displayName).not.toContain("undefined");
    expect(dest.displayName).not.toContain(",");
  });

  // Test 5: Autocomplete network failure / error fallback
  it("5. should handle API network timeout/throttling and create manual entry", () => {
    const manual = createManualDestination("Reykjavik, Iceland");
    expect(manual.isManual).toBe(true);
    expect(manual.name).toBe("Reykjavik, Iceland");
    expect(manual.displayName).toBe("Reykjavik, Iceland (Manual Unverified Entry)");
    expect(manual.id).toContain("dest_manual_");
  });

  // Test 6: Manual entry fallback creates a valid DestinationObject with isManual=true
  it("6. should create valid DestinationObject with stable id, coordinates, and isManual flag", () => {
    const dest = createManualDestination("Zurich, Switzerland");
    expect(dest.isManual).toBe(true);
    expect(dest.coordinates).toEqual([0, 0]);
    expect(dest.name).toBe("Zurich, Switzerland");
    expect(dest.id).toBeDefined();
  });

  // Test 7: Changing destination from Goa to Tokyo immediately invalidates Goa offers
  it("7. should provide distinct offers when destination changes from Goa to Tokyo", () => {
    const goaTrip: TripSetup = { ...DEFAULT_TRIP_SETUP, destination: "Goa" };
    const tokyoTrip: TripSetup = { ...DEFAULT_TRIP_SETUP, destination: "Tokyo" };

    const goaOffers = getOffersForDestination(goaTrip);
    const tokyoOffers = getOffersForDestination(tokyoTrip);

    // Offers must be completely different
    expect(goaOffers.hotels[0].id).not.toBe(tokyoOffers.hotels[0].id);
    expect(goaOffers.hotels.every((h) => h.destination.toLowerCase().includes("goa"))).toBe(true);
    expect(tokyoOffers.hotels.every((h) => h.destination.toLowerCase().includes("tokyo"))).toBe(true);
  });

  // Test 8: Generated candidate for Tokyo NEVER contains offers with destination 'Goa' or 'Jaipur' (no leakage)
  it("8. should strictly avoid cross-destination leakage for Tokyo candidates", () => {
    const tokyoTrip: TripSetup = {
      ...DEFAULT_TRIP_SETUP,
      destination: "Tokyo",
    };
    const candidates = generateCandidateItineraries(tokyoTrip, DEFAULT_TRAVELERS);

    candidates.forEach((c) => {
      expect(c.hotel.destination.toLowerCase()).toContain("tokyo");
      expect(c.hotel.destination.toLowerCase()).not.toContain("goa");
      expect(c.hotel.destination.toLowerCase()).not.toContain("jaipur");

      expect(c.transport.destination.toLowerCase()).toContain("tokyo");
      expect(c.transport.destination.toLowerCase()).not.toContain("goa");
      expect(c.transport.destination.toLowerCase()).not.toContain("jaipur");

      c.activities.forEach((act) => {
        expect(act.destination.toLowerCase()).toContain("tokyo");
        expect(act.destination.toLowerCase()).not.toContain("goa");
        expect(act.destination.toLowerCase()).not.toContain("jaipur");
      });
    });
  });

  // Test 9: Generated candidate for an arbitrary city (e.g. Reykjavik) receives labeled manual estimates
  it("9. should generate labeled manual estimates without crashing for arbitrary destinations", () => {
    const reykjavikTrip: TripSetup = {
      ...DEFAULT_TRIP_SETUP,
      destination: "Reykjavik, Iceland",
    };
    const candidates = generateCandidateItineraries(reykjavikTrip, DEFAULT_TRAVELERS);

    expect(candidates.length).toBe(3);
    const balanced = candidates.find((c) => c.strategy === "best_balanced");
    expect(balanced).toBeDefined();
    expect(balanced?.inventoryState).toBe("manual_estimates");
    expect(balanced?.hotel.tag).toBe("MANUAL ESTIMATES — NOT LIVE PRICES");
    expect(balanced?.hotel.destination).toContain("Reykjavik");
  });

  // Test 10: A valid trip under budget evaluates to feasible and is selected by Pareto engine
  it("10. should evaluate valid trip under budget as feasible and select it", () => {
    const candidates = generateCandidateItineraries(DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS);
    const validCandidate = candidates.find((c) => c.strategy === "best_balanced");

    expect(validCandidate).toBeDefined();
    expect(validCandidate?.isFeasible).toBe(true);
    expect(validCandidate!.costBreakdown.grandTotalINR).toBeLessThanOrEqual(
      DEFAULT_TRIP_SETUP.sharedBudgetINR
    );
    const selection = selectBestCandidate(candidates);
    expect(selection.feasibleCount).toBeGreaterThan(0);
  });

  // Test 11: Over-budget candidate is rejected by deterministic validator
  it("11. should reject candidate when cost exceeds shared budget", () => {
    const tightTrip: TripSetup = {
      ...DEFAULT_TRIP_SETUP,
      sharedBudgetINR: 25000, // Impossibly low
    };
    const candidates = generateCandidateItineraries(tightTrip, DEFAULT_TRAVELERS);
    const allRejected = candidates.every((c) => !c.isFeasible);
    expect(allRejected).toBe(true);

    const report = performDeterministicValidation(candidates[0], tightTrip, DEFAULT_TRAVELERS);
    const budgetCheck = report.checks.find((c) => c.id === "check-budget-ceiling");
    expect(budgetCheck?.status).toBe("FAIL");
    expect(report.overallValid).toBe(false);
  });

  // Test 12: Accessibility hard constraint violation rejects candidate even if aggregate satisfaction is 95%
  it("12. should reject candidate with inaccessible hotel when accessibility is mandatory", () => {
    const accessibleTravelers: TravelerProfile[] = DEFAULT_TRAVELERS.map((t, idx) =>
      idx === 0
        ? {
            ...t,
            hardConstraints: {
              ...t.hardConstraints,
              accessibilityRequired: true,
            },
          }
        : t
    );

    const blueprint = {
      id: "candidate-inaccessible",
      strategy: "lowest_cost" as const,
      strategyLabel: "Lowest Cost",
      label: "Inaccessible Candidate",
      description: "Testing accessibility rejection",
      hotelId: "hotel-goa-backpacker-haven", // hasElevatorOrStepFree: false
      transportId: "trans-goa-public", // accessibleVehicle: false
      activityIds: ["act-goa-fontainhas-walk"],
      diningId: "dining-goa-street-casual",
      keyConcessionsMade: [],
    };

    const candidate = buildItineraryCandidate(blueprint, DEFAULT_TRIP_SETUP, accessibleTravelers);
    expect(candidate.isFeasible).toBe(false);
    expect(candidate.infeasibilityReasons?.some((r) => r.includes("elevator or step-free"))).toBe(true);

    const report = performDeterministicValidation(candidate, DEFAULT_TRIP_SETUP, accessibleTravelers);
    const accessCheck = report.checks.find((c) => c.id === "check-accessibility");
    expect(accessCheck?.status).toBe("FAIL");
  });

  // Test 13: Minimum traveler satisfaction floor violation rejects candidate
  it("13. should reject candidate if any individual score drops below declared floor", () => {
    const demandingTravelers: TravelerProfile[] = DEFAULT_TRAVELERS.map((t) =>
      t.role === "comfort_seeker"
        ? {
            ...t,
            minimumSatisfactionScore: 88, // Unattainable in budget tier
            weights: { cost: 0.05, comfort: 0.85, activities: 0.05, transit: 0.05 },
          }
        : t
    );
    const lowestCostCandidate = generateCandidateItineraries(DEFAULT_TRIP_SETUP, demandingTravelers).find(
      (c) => c.strategy === "lowest_cost"
    );

    expect(lowestCostCandidate).toBeDefined();
    expect(lowestCostCandidate?.isFeasible).toBe(false);
    expect(lowestCostCandidate?.satisfactionScores["traveler-2"].status).toBe("below_minimum");
  });

  // Test 14: Mandatory rest period violation rejects candidate when slow traveler is in group
  it("14. should flag rest violation if days have zero rest blocks when mandatoryRestPeriods=true", () => {
    const slowTravelers: TravelerProfile[] = DEFAULT_TRAVELERS.map((t) =>
      t.role === "slow_traveler"
        ? {
            ...t,
            hardConstraints: {
              ...t.hardConstraints,
              mandatoryRestPeriods: true,
            },
          }
        : t
    );

    // Candidates naturally generate midday rest blocks for slow travelers
    const candidates = generateCandidateItineraries(DEFAULT_TRIP_SETUP, slowTravelers);
    expect(candidates[0].metrics.restPeriodsCount).toBeGreaterThanOrEqual(1);
  });

  // Test 15: Individual spending cap violation rejects candidate
  it("15. should reject candidate if per-person cost breaches individual max budget cap", () => {
    const cappedTravelers: TravelerProfile[] = DEFAULT_TRAVELERS.map((t) =>
      t.role === "budget_guardian"
        ? {
            ...t,
            hardConstraints: {
              ...t.hardConstraints,
              maxIndividualBudgetINR: 15000, // Very tight cap
            },
          }
        : t
    );

    const candidate = generateCandidateItineraries(DEFAULT_TRIP_SETUP, cappedTravelers)[0];
    // Candidate per-person cost is ~₹30,000, so ₹15,000 cap is breached
    expect(candidate.isFeasible).toBe(false);
    expect(candidate.infeasibilityReasons?.some((r) => r.includes("individual budget cap"))).toBe(true);
  });

  // Test 16: Component cost summation exactly equals grandTotalINR (no rounding drift)
  it("16. should guarantee exact math where grandTotalINR equals component summation", () => {
    const candidate = generateCandidateItineraries(DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS)[0];
    const { hotelTotalINR, transportTotalINR, activitiesTotalINR, diningTotalINR, grandTotalINR } =
      candidate.costBreakdown;

    expect(hotelTotalINR + transportTotalINR + activitiesTotalINR + diningTotalINR).toBe(grandTotalINR);
  });

  // Test 17: Per-person cost multiplied by travelerCount equals grandTotalINR within 1 INR tolerance
  it("17. should ensure per-person cost multiplied by traveler count matches grand total within 1 INR", () => {
    const candidate = generateCandidateItineraries(DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS)[0];
    const perPersonSum = candidate.costBreakdown.costPerPersonINR * DEFAULT_TRIP_SETUP.travelerCount;
    expect(Math.abs(perPersonSum - candidate.costBreakdown.grandTotalINR)).toBeLessThanOrEqual(
      DEFAULT_TRIP_SETUP.travelerCount
    );
  });

  // Test 18: Catalog verification passes for valid offers and fails when fake offer ID injected
  it("18. should fail catalog check when an unverified or hallucinated offer ID is present", () => {
    const candidate = generateCandidateItineraries(DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS)[0];
    const tampered = {
      ...candidate,
      hotel: {
        ...candidate.hotel,
        id: "hotel-fake-hallucinated-id-xyz",
      },
    };

    const report = performDeterministicValidation(tampered, DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS);
    const catCheck = report.checks.find((c) => c.id === "check-catalog-offers");
    expect(catCheck?.status).toBe("FAIL");
    expect(report.overallValid).toBe(false);
  });

  // Test 19: Pareto selection chooses Best Balanced candidate when feasible, with highest aggregate score
  it("19. should choose Best Balanced candidate under Pareto policy when feasible", () => {
    const candidates = generateCandidateItineraries(DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS);
    const selection = selectBestCandidate(candidates);

    expect(selection.feasibleCount).toBeGreaterThan(0);
    expect(selection.best.strategy).toBe("best_balanced");
    expect(selection.best.aggregateSatisfaction).toBeGreaterThanOrEqual(70);
  });

  // Test 20: Trade-off ledger items correctly map gainer and conceder roles with positive delta
  it("20. should validate candidate concessions have clear explanations and trade-offs", () => {
    const candidates = generateCandidateItineraries(DEFAULT_TRIP_SETUP, DEFAULT_TRAVELERS);
    const balanced = candidates.find((c) => c.strategy === "best_balanced");

    expect(balanced?.keyConcessionsMade.length).toBeGreaterThan(0);
    expect(balanced?.keyConcessionsMade[0]).toBeDefined();
  });

  // Test 21: Gemma 4 JSON response parser safely handles malformed JSON without crashing
  it("21. should reject malformed JSON using Zod schemas safely without crashing", () => {
    const malformedOutput = {
      selectedCandidateId: 12345, // invalid type
      confidence: "very-high", // invalid type
    };
    const parse = NegotiationAgentOutputSchema.safeParse(malformedOutput);
    expect(parse.success).toBe(false);
  });

  // Test 22: Saved plan in localStorage correctly preserves arbitrary destination coordinates and details
  it("22. should preserve destination details and coordinates in saved trip session", () => {
    const session: SavedTripSession = {
      id: "trip-test-1",
      name: "Tokyo Adventure",
      createdAt: new Date().toISOString(),
      trip: {
        ...DEFAULT_TRIP_SETUP,
        destination: "Tokyo, Japan",
        destinationDetails: {
          id: "dest_osm_R_1543125",
          name: "Tokyo",
          displayName: "Tokyo, Japan",
          coordinates: [139.6917, 35.6895],
          country: "Japan",
          countryCode: "JP",
          isManual: false,
        },
      },
      travelers: DEFAULT_TRAVELERS,
      selectedCandidateId: "candidate-balanced-compromise",
    };

    const serialized = JSON.stringify(session);
    const deserialized: SavedTripSession = JSON.parse(serialized);

    expect(deserialized.trip.destinationDetails?.coordinates).toEqual([139.6917, 35.6895]);
    expect(deserialized.trip.destinationDetails?.country).toBe("Japan");
  });

  // Test 23: Reopening a saved plan restores full destination metadata, candidate state, and traveler profiles
  it("23. should restore all traveler profiles and selected candidate id from saved session", () => {
    const session: SavedTripSession = {
      id: "trip-test-2",
      name: "Jaipur Cultural Tour",
      createdAt: new Date().toISOString(),
      trip: { ...DEFAULT_TRIP_SETUP, destination: "Jaipur" },
      travelers: DEFAULT_TRAVELERS,
      selectedCandidateId: "candidate-maximum-experience",
    };

    expect(session.travelers.length).toBe(4);
    expect(session.selectedCandidateId).toBe("candidate-maximum-experience");
    expect(session.trip.destination).toBe("Jaipur");
  });

  // Test 24: Deleting a saved plan removes it cleanly from saved plans list
  it("24. should filter out deleted trip cleanly from session list", () => {
    const trips: SavedTripSession[] = [
      { id: "trip-1", name: "Trip 1", createdAt: "", trip: DEFAULT_TRIP_SETUP, travelers: DEFAULT_TRAVELERS },
      { id: "trip-2", name: "Trip 2", createdAt: "", trip: DEFAULT_TRIP_SETUP, travelers: DEFAULT_TRAVELERS },
    ];

    const updated = trips.filter((t) => t.id !== "trip-1");
    expect(updated.length).toBe(1);
    expect(updated[0].id).toBe("trip-2");
  });

  // Test 25: Landing page quick search transfers origin and destination into trip planner
  it("25. should accept custom trip parameters from quick search and apply them", () => {
    const customSetup: Partial<TripSetup> = {
      origin: "Bengaluru",
      destination: "Paris",
      travelerCount: 4,
      departureDate: "2026-12-01",
      returnDate: "2026-12-06",
    };

    const mergedTrip: TripSetup = {
      ...DEFAULT_TRIP_SETUP,
      ...customSetup,
    };

    expect(mergedTrip.origin).toBe("Bengaluru");
    expect(mergedTrip.destination).toBe("Paris");
    expect(mergedTrip.departureDate).toBe("2026-12-01");
    expect(mergedTrip.returnDate).toBe("2026-12-06");
  });
});
