"use client";

import React, { useState } from "react";
import {
  TripSetup,
  TravelerProfile,
  TripType,
  PreferredTransportType,
  AccommodationPreferenceType,
} from "@/types";
import { DestinationAutocomplete } from "./DestinationAutocomplete";
import {
  MapPin,
  Calendar,
  IndianRupee,
  Users,
  Compass,
  Sliders,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Hotel,
  Car,
  Tag,
  Accessibility,
} from "lucide-react";

interface TripPlannerStepperProps {
  trip: TripSetup;
  onChangeTrip: (updated: TripSetup) => void;
  travelers: TravelerProfile[];
  onChangeTravelers: (updated: TravelerProfile[]) => void;
  onStartNegotiation: () => void;
  isLoading: boolean;
  onParseNotesWithAI: (notes: string) => Promise<void>;
  isParsingNotes: boolean;
}

export function TripPlannerStepper({
  trip,
  onChangeTrip,
  travelers,
  onChangeTravelers,
  onStartNegotiation,
  isLoading,
  onParseNotesWithAI,
  isParsingNotes,
}: TripPlannerStepperProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [expandedTravelerId, setExpandedTravelerId] = useState<string | null>(travelers[0]?.id || null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync traveler count when travelers are added or removed
  const handleAddTraveler = () => {
    if (travelers.length >= 8) return;
    const newId = `traveler-${Date.now()}`;
    const newTraveler: TravelerProfile = {
      id: newId,
      name: `Traveler ${travelers.length + 1}`,
      role: "custom",
      roleLabel: "Flexible Explorer",
      avatarColor: "#0F766E",
      hardConstraints: {
        accessibilityRequired: false,
        mandatoryRestPeriods: false,
      },
      preferences: {
        minHotelStars: 3.0,
        preferredPace: "moderate",
        minActivitiesCount: 2,
        maxTransitMinutesPerDay: 75,
        mustHaveAmenities: ["Free Wi-Fi", "Air Conditioning"],
        interestTags: ["Flexible", "Local culture"],
        ratings: {
          budgetSensitivity: 5,
          comfort: 6,
          sightseeing: 6,
          foodExperiences: 6,
          adventure: 5,
          relaxation: 6,
          travelConvenience: 6,
          accommodationQuality: 6,
          dailyActivityIntensity: "moderate",
        },
      },
      minimumSatisfactionScore: 60,
      weights: {
        cost: 0.25,
        comfort: 0.25,
        activities: 0.25,
        transit: 0.25,
      },
    };
    const nextList = [...travelers, newTraveler];
    onChangeTravelers(nextList);
    onChangeTrip({ ...trip, travelerCount: nextList.length });
    setExpandedTravelerId(newId);
  };

  const handleRemoveTraveler = (id: string) => {
    if (travelers.length <= 2) {
      alert("A group trip requires at least 2 travelers.");
      return;
    }
    const nextList = travelers.filter((t) => t.id !== id);
    onChangeTravelers(nextList);
    onChangeTrip({ ...trip, travelerCount: nextList.length });
  };

  const updateTraveler = (id: string, partial: Partial<TravelerProfile>) => {
    const updated = travelers.map((t) => (t.id === id ? { ...t, ...partial } : t));
    onChangeTravelers(updated);
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!trip.origin.trim() || !trip.destination.trim()) {
      setValidationError("Please enter both origin and destination cities.");
      return false;
    }
    if (!trip.departureDate || !trip.returnDate) {
      setValidationError("Please specify valid departure and return dates.");
      return false;
    }
    const d1 = new Date(trip.departureDate);
    const d2 = new Date(trip.returnDate);
    if (d2 <= d1) {
      setValidationError("Return date must be strictly after the departure date.");
      return false;
    }
    if (trip.sharedBudgetINR <= 10000) {
      setValidationError("Total shared group budget must be at least ₹10,000 INR.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  // Detected conflicts preview for Step 3
  const detectedPreConflicts = React.useMemo(() => {
    const list: string[] = [];
    const minStarsDemanded = Math.max(...travelers.map((t) => t.preferences.minHotelStars));
    const budgetGuardian = travelers.find((t) => t.role === "budget_guardian");
    const comfortSeeker = travelers.find((t) => t.role === "comfort_seeker");
    const explorer = travelers.find((t) => t.role === "explorer");
    const slowTraveler = travelers.find((t) => t.role === "slow_traveler");

    if (minStarsDemanded >= 4.0 && trip.sharedBudgetINR / trip.travelerCount < 30000) {
      list.push("High accommodation standard (4★-5★) conflicts with modest per-person budget ceiling.");
    }
    if (explorer && slowTraveler) {
      list.push(
        `Activity intensity tension: ${explorer.name} (Explorer) requests high activity density while ${slowTraveler.name} (Slow Traveler) requires mandatory midday downtime.`
      );
    }
    if (budgetGuardian && comfortSeeker) {
      list.push(
        `Financial allocation tension: ${budgetGuardian.name} seeks maximum monetary savings while ${comfortSeeker.name} prioritizes private chauffeur and premium amenities.`
      );
    }
    if (list.length === 0) {
      list.push("Standard trade-offs detected between sightseeing volume and daily transit fatigue limits.");
    }
    return list;
  }, [travelers, trip]);

  return (
    <div className="bg-surface rounded-2xl border border-surface-border shadow-xs p-5 sm:p-7 space-y-6">
      {/* Stepper Progress Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
            Interactive Trip Planner
          </span>
          <h2 className="font-serif text-xl font-bold text-slate-100 mt-1">
            {currentStep === 1 && "Step 1: Trip Basics & Parameters"}
            {currentStep === 2 && "Step 2: Traveler Profiles & Constraints"}
            {currentStep === 3 && "Step 3: Conflict Review & Optimization"}
          </h2>
        </div>

        {/* 3 Step Indicator Pills */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setCurrentStep(1)}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
              currentStep === 1
                ? "bg-emerald-600 text-slate-950"
                : currentStep > 1
                ? "bg-emerald-950 border border-emerald-500/40 text-emerald-300"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            1
          </button>
          <div className={`w-6 h-0.5 ${currentStep >= 2 ? "bg-emerald-500" : "bg-slate-700"}`} />
          <button
            onClick={() => validateStep1() && setCurrentStep(2)}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
              currentStep === 2
                ? "bg-emerald-600 text-slate-950"
                : currentStep > 2
                ? "bg-emerald-950 border border-emerald-500/40 text-emerald-300"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            2
          </button>
          <div className={`w-6 h-0.5 ${currentStep === 3 ? "bg-emerald-500" : "bg-slate-700"}`} />
          <button
            onClick={() => validateStep1() && setCurrentStep(3)}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
              currentStep === 3
                ? "bg-emerald-600 text-slate-950"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            3
          </button>
        </div>
      </div>

      {validationError && (
        <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ================= STEP 1: TRIP BASICS ================= */}
      {currentStep === 1 && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Origin City */}
            <div>
              <DestinationAutocomplete
                id="stepper-origin"
                label="Departure City (Origin)"
                placeholder="Search departure city..."
                value={trip.origin}
                selectedDestination={trip.originDetails}
                onChange={(text, details) => {
                  onChangeTrip({
                    ...trip,
                    origin: text,
                    originDetails: details,
                  });
                }}
                theme="dark"
                required
              />
            </div>

            {/* Destination City */}
            <div>
              <DestinationAutocomplete
                id="stepper-destination"
                label="Worldwide Destination"
                placeholder="Search destination worldwide..."
                value={trip.destination}
                selectedDestination={trip.destinationDetails}
                onChange={(text, details) => {
                  onChangeTrip({
                    ...trip,
                    destination: text,
                    destinationDetails: details,
                  });
                }}
                theme="dark"
                required
              />
            </div>

            {/* Travel Dates */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Travel Dates
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={trip.departureDate}
                  onChange={(e) => onChangeTrip({ ...trip, departureDate: e.target.value })}
                  className="px-2.5 py-2 border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200"
                />
                <input
                  type="date"
                  value={trip.returnDate}
                  onChange={(e) => onChangeTrip({ ...trip, returnDate: e.target.value })}
                  className="px-2.5 py-2 border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200"
                />
              </div>
            </div>

            {/* Shared Budget in INR */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5 text-amber-400" /> Total Group Shared Budget
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="5000"
                  min="20000"
                  value={trip.sharedBudgetINR}
                  onChange={(e) => onChangeTrip({ ...trip, sharedBudgetINR: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 border border-slate-700 rounded-lg bg-[#0f172a] font-mono font-bold text-emerald-400"
                />
                <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">
                  ₹{Math.round(trip.sharedBudgetINR / trip.travelerCount).toLocaleString("en-IN")}/person
                </span>
              </div>
            </div>

            {/* Trip Type */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Trip Style & Type</label>
              <select
                value={trip.tripType}
                onChange={(e) => onChangeTrip({ ...trip, tripType: e.target.value as TripType })}
                className="w-full px-2.5 py-2 border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200 font-medium"
              >
                <option value="leisure">Leisure & Sightseeing</option>
                <option value="weekend">Quick Weekend Getaway</option>
                <option value="adventure">Active Adventure & Watersports</option>
                <option value="family">Family / Reunion</option>
                <option value="business">Workation / Business Blend</option>
                <option value="custom">Custom Exploration</option>
              </select>
            </div>

            {/* Preferred Transport */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-forest-700" /> Preferred Transport
              </label>
              <select
                value={trip.preferredTransport}
                onChange={(e) =>
                  onChangeTrip({ ...trip, preferredTransport: e.target.value as PreferredTransportType })
                }
                className="w-full px-2.5 py-2 border border-surface-border rounded-lg bg-white font-medium"
              >
                <option value="car">Dedicated Chauffeur Car / Van</option>
                <option value="train">Express Train</option>
                <option value="flight">Flight + Local Cabs</option>
                <option value="bus">Luxury Bus</option>
                <option value="flexible">Flexible / Optimizer Decides</option>
              </select>
            </div>

            {/* Accommodation Preference */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1 flex items-center gap-1">
                <Hotel className="w-3.5 h-3.5 text-forest-700" /> Accommodation Preference
              </label>
              <select
                value={trip.accommodationPreference}
                onChange={(e) =>
                  onChangeTrip({
                    ...trip,
                    accommodationPreference: e.target.value as AccommodationPreferenceType,
                  })
                }
                className="w-full px-2.5 py-2 border border-surface-border rounded-lg bg-white font-medium"
              >
                <option value="standard_hotel">Quality 3.5★ - 4★ Boutique Hotel</option>
                <option value="premium_hotel">5★ Luxury Seaside / Palace Resort</option>
                <option value="budget_hotel">Economy 2.5★ Clean Hotel</option>
                <option value="hostel">Hostel & Backpackers Eco-Stay</option>
                <option value="flexible">Flexible / Optimizer Best Match</option>
              </select>
            </div>
          </div>

          {/* Accessibility toggle */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Accessibility className="w-4 h-4 text-forest-700" />
              <div>
                <span className="font-semibold text-stone-900 block">Accessibility & Reduced Mobility Hard Constraint</span>
                <span className="text-[11px] text-stone-500">
                  Enforces step-free or elevator hotels and wheelchair-accessible transport options.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={trip.accessibilityRequired}
              onChange={(e) => onChangeTrip({ ...trip, accessibilityRequired: e.target.checked })}
              className="w-4 h-4 accent-forest-700 cursor-pointer"
            />
          </div>

          {/* Free-text organizer notes with Gemma 4 parse button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-stone-700 font-semibold flex items-center gap-1">
                Free-Text Organizer Notes (Natural Language Preferences):
              </label>
              <button
                type="button"
                disabled={isParsingNotes || !trip.freeTextNotes?.trim()}
                onClick={() => onParseNotesWithAI(trip.freeTextNotes || "")}
                className="text-[11px] font-semibold text-forest-800 hover:text-forest-950 flex items-center gap-1 disabled:opacity-40"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>{isParsingNotes ? "Gemma 4 Parsing..." : "Parse with Gemma 4"}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={trip.freeTextNotes || ""}
              onChange={(e) => onChangeTrip({ ...trip, freeTextNotes: e.target.value })}
              className="w-full px-3 py-2 border border-surface-border rounded-lg bg-white text-stone-700 leading-relaxed font-sans"
              placeholder="e.g. We are 4 college friends. Keep budget under check, but one person has motion sickness and another wants photography at forts."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleNextFromStep1}
              className="px-5 py-2.5 rounded-lg bg-forest-800 text-white font-bold text-xs hover:bg-forest-900 transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <span>Next: Traveler Preferences</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: TRAVELER PREFERENCES & HARD CONSTRAINTS ================= */}
      {currentStep === 2 && (
        <div className="space-y-4 text-xs">
          {/* Explanation Banner: Hard Constraint vs Soft Preference */}
          <div className="p-3.5 bg-forest-50/70 border border-forest-200 rounded-xl text-forest-950 text-xs flex items-start space-x-2.5">
            <HelpCircle className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div>
              <strong>Difference Between Hard Constraints & Soft Preferences:</strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 text-[11px]">
                <div>
                  <span className="font-semibold text-forest-900 block">• Hard Constraints (Non-Negotiable):</span>
                  Shared budget ceiling, minimum satisfaction floors, mobility requirements, and mandatory rest periods. Any candidate violating a hard constraint is <strong>strictly rejected</strong>.
                </div>
                <div>
                  <span className="font-semibold text-forest-900 block">• Soft Preferences (Negotiable Trade-Offs):</span>
                  Sliders (1-10) for comfort, food, sightseeing, and adventure. Evaluated and balanced by the multi-agent optimization engine.
                </div>
              </div>
            </div>
          </div>

          {/* Traveler List & Add Action */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-900">
              Configured Travelers ({travelers.length} members):
            </span>
            <button
              type="button"
              onClick={handleAddTraveler}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-forest-50 border border-forest-200 text-forest-800 hover:bg-forest-100 font-semibold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>

          {/* Traveler Cards */}
          <div className="space-y-3">
            {travelers.map((traveler) => {
              const isExpanded = expandedTravelerId === traveler.id;
              return (
                <div
                  key={traveler.id}
                  className="bg-white rounded-xl border border-surface-border p-4 shadow-2xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: traveler.avatarColor }}
                      />
                      <input
                        type="text"
                        value={traveler.name}
                        onChange={(e) => updateTraveler(traveler.id, { name: e.target.value })}
                        className="font-bold text-stone-900 text-xs bg-transparent border-b border-transparent hover:border-stone-300 focus:border-forest-600 focus:outline-hidden"
                      />
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        {traveler.roleLabel}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setExpandedTravelerId(isExpanded ? null : traveler.id)}
                        className="text-stone-600 hover:text-stone-900 text-xs font-semibold px-2 py-1 rounded hover:bg-stone-100"
                      >
                        {isExpanded ? "Collapse" : "Edit Constraints & Sliders"}
                      </button>
                      {travelers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTraveler(traveler.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded"
                          title="Remove traveler"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-stone-600 bg-stone-50/70 p-2 rounded-lg">
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase">Min Stars:</span>
                      <strong>{traveler.preferences.minHotelStars}★</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase">Min Excursions:</span>
                      <strong>{traveler.preferences.minActivitiesCount}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase">Max Transit:</span>
                      <strong>≤ {traveler.preferences.maxTransitMinutesPerDay} m/day</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase">Mandatory Floor:</span>
                      <strong className="text-forest-800 font-mono">{traveler.minimumSatisfactionScore}%</strong>
                    </div>
                  </div>

                  {/* Expanded Edit Form */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-stone-100 space-y-4 animate-in fade-in duration-100">
                      {/* Hard constraints section */}
                      <div className="bg-rose-50/40 p-3 rounded-lg border border-rose-200/60 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 block">
                          Traveler-Specific Hard Constraints (Non-Negotiable):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-stone-700 mb-0.5">Max Individual Budget (INR):</label>
                            <input
                              type="number"
                              placeholder="No limit"
                              value={traveler.hardConstraints.maxIndividualBudgetINR || ""}
                              onChange={(e) =>
                                updateTraveler(traveler.id, {
                                  hardConstraints: {
                                    ...traveler.hardConstraints,
                                    maxIndividualBudgetINR: e.target.value ? Number(e.target.value) : undefined,
                                  },
                                })
                              }
                              className="w-full px-2 py-1 text-xs border border-surface-border rounded bg-white"
                            />
                          </div>

                          <div className="flex items-center space-x-2 pt-4">
                            <input
                              type="checkbox"
                              checked={traveler.hardConstraints.accessibilityRequired || false}
                              onChange={(e) =>
                                updateTraveler(traveler.id, {
                                  hardConstraints: {
                                    ...traveler.hardConstraints,
                                    accessibilityRequired: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-forest-700"
                            />
                            <span className="text-stone-800 font-medium">Requires step-free / elevator</span>
                          </div>

                          <div className="flex items-center space-x-2 pt-4">
                            <input
                              type="checkbox"
                              checked={traveler.hardConstraints.mandatoryRestPeriods || false}
                              onChange={(e) =>
                                updateTraveler(traveler.id, {
                                  hardConstraints: {
                                    ...traveler.hardConstraints,
                                    mandatoryRestPeriods: e.target.checked,
                                  },
                                })
                              }
                              className="w-4 h-4 accent-forest-700"
                            />
                            <span className="text-stone-800 font-medium">Requires daily midday rest</span>
                          </div>
                        </div>
                      </div>

                      {/* Soft preference sliders (1-10) */}
                      {(() => {
                        const ratings = traveler.preferences.ratings || {
                          budgetSensitivity: 5,
                          comfort: 5,
                          sightseeing: 5,
                          foodExperiences: 5,
                          adventure: 5,
                          relaxation: 5,
                          travelConvenience: 5,
                          accommodationQuality: 5,
                          dailyActivityIntensity: "moderate" as const,
                        };

                        return (
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-forest-900 block">
                              Soft Preference Priorities (1 - 10 Scale):
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                              <div>
                                <div className="flex justify-between mb-0.5">
                                  <span>Budget Sensitivity:</span>
                                  <strong>{ratings.budgetSensitivity}/10</strong>
                                </div>
                                <input
                                  type="range"
                                  min={1}
                                  max={10}
                                  value={ratings.budgetSensitivity}
                                  onChange={(e) =>
                                    updateTraveler(traveler.id, {
                                      preferences: {
                                        ...traveler.preferences,
                                        ratings: {
                                          ...ratings,
                                          budgetSensitivity: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="w-full accent-forest-700"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-0.5">
                                  <span>Comfort & Luxury:</span>
                                  <strong>{ratings.comfort}/10</strong>
                                </div>
                                <input
                                  type="range"
                                  min={1}
                                  max={10}
                                  value={ratings.comfort}
                                  onChange={(e) =>
                                    updateTraveler(traveler.id, {
                                      preferences: {
                                        ...traveler.preferences,
                                        ratings: {
                                          ...ratings,
                                          comfort: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="w-full accent-forest-700"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-0.5">
                                  <span>Sightseeing Volume:</span>
                                  <strong>{ratings.sightseeing}/10</strong>
                                </div>
                                <input
                                  type="range"
                                  min={1}
                                  max={10}
                                  value={ratings.sightseeing}
                                  onChange={(e) =>
                                    updateTraveler(traveler.id, {
                                      preferences: {
                                        ...traveler.preferences,
                                        ratings: {
                                          ...ratings,
                                          sightseeing: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="w-full accent-forest-700"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-0.5">
                                  <span>Relaxation / Rest:</span>
                                  <strong>{ratings.relaxation}/10</strong>
                                </div>
                                <input
                                  type="range"
                                  min={1}
                                  max={10}
                                  value={ratings.relaxation}
                                  onChange={(e) =>
                                    updateTraveler(traveler.id, {
                                      preferences: {
                                        ...traveler.preferences,
                                        ratings: {
                                          ...ratings,
                                          relaxation: Number(e.target.value),
                                        },
                                      },
                                    })
                                  }
                                  className="w-full accent-forest-700"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Basics</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-lg bg-forest-800 text-white font-bold text-xs hover:bg-forest-900 transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <span>Next: Review & Conflict Audit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: REVIEW & START NEGOTIATION ================= */}
      {currentStep === 3 && (
        <div className="space-y-4 text-xs">
          {/* Summary matrix */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
            <h3 className="font-serif text-sm font-bold text-forest-950">
              Trip Overview & Group Roster
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-stone-400 block text-[9px] uppercase">Route:</span>
                <strong>{trip.origin} → {trip.destination}</strong>
              </div>
              <div>
                <span className="text-stone-400 block text-[9px] uppercase">Dates:</span>
                <strong>{trip.departureDate} to {trip.returnDate}</strong>
              </div>
              <div>
                <span className="text-stone-400 block text-[9px] uppercase">Shared Budget:</span>
                <strong className="font-mono text-forest-900">₹{trip.sharedBudgetINR.toLocaleString("en-IN")}</strong>
              </div>
              <div>
                <span className="text-stone-400 block text-[9px] uppercase">Travelers:</span>
                <strong>{travelers.length} members</strong>
              </div>
            </div>
          </div>

          {/* Pre-Negotiation Detected Conflicts */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-amber-900 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Detected Group Friction Points (To Be Negotiated):</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-amber-950">
              {detectedPreConflicts.map((c, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-bold text-amber-700 mt-0.5">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Edit Preferences</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={onStartNegotiation}
              className="px-6 py-3 rounded-xl bg-forest-800 text-white font-bold text-xs hover:bg-forest-900 transition-all flex items-center space-x-2 shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Gemma 4 Negotiating Group Compromises...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Execute Multi-Agent Negotiation</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
