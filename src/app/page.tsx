"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TripSetup,
  TravelerProfile,
  ItineraryCandidate,
  NegotiationResponse,
  ValidationReport,
  SavedTripSession,
} from "@/types";
import {
  DEFAULT_TRIP_SETUP,
  DEFAULT_TRAVELERS,
} from "@/data/demo-offers";
import {
  generateCandidateItineraries,
  selectBestCandidate,
} from "@/lib/optimizer";
import { performDeterministicValidation } from "@/lib/agents/validation-agent";
import { DemoBanner } from "@/components/DemoBanner";
import { Navbar } from "@/components/Navbar";
import { LandingPage } from "@/components/LandingPage";
import { TripPlannerStepper } from "@/components/TripPlannerStepper";
import { ItineraryCard } from "@/components/ItineraryCard";
import { ItineraryCompareModal } from "@/components/ItineraryCompareModal";
import { ItineraryDetailModal } from "@/components/ItineraryDetailModal";
import { PlanConfirmationModal } from "@/components/PlanConfirmationModal";
import { SavedTripsModal } from "@/components/SavedTripsModal";
import { NegotiationTimeline } from "@/components/NegotiationTimeline";
import { TradeoffLedger } from "@/components/TradeoffLedger";
import { ConstraintValidationPanel } from "@/components/ConstraintValidationPanel";
import { ExplanationCard } from "@/components/ExplanationCard";
import { ConflictAnalysisBanner } from "@/components/ConflictAnalysisBanner";
import { NegotiationControlsBar } from "@/components/NegotiationControlsBar";
import { SatisfactionFairnessPanel } from "@/components/SatisfactionFairnessPanel";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  IndianRupee,
  MapPin,
  Users,
} from "lucide-react";

export default function ConcordPlatform() {
  // Navigation View State
  const [currentTab, setCurrentTab] = useState<"landing" | "planner" | "dashboard">("landing");

  // Core Trip and Traveler State
  const [trip, setTrip] = useState<TripSetup>(DEFAULT_TRIP_SETUP);
  const [travelers, setTravelers] = useState<TravelerProfile[]>(DEFAULT_TRAVELERS);

  // Session API Key
  const [sessionApiKey, setSessionApiKey] = useState<string>("");

  // Modals
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [detailCandidate, setDetailCandidate] = useState<ItineraryCandidate | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(false);
  const [isSavedTripsOpen, setIsSavedTripsOpen] = useState<boolean>(false);

  // Saved trips in LocalStorage
  const [savedTrips, setSavedTrips] = useState<SavedTripSession[]>([]);

  // Negotiation Run State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isParsingNotes, setIsParsingNotes] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [negotiationData, setNegotiationData] = useState<NegotiationResponse | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [isProposalAccepted, setIsProposalAccepted] = useState<boolean>(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("candidate-balanced-compromise");

  // Load local storage on mount
  useEffect(() => {
    try {
      const storedKey = sessionStorage.getItem("concord_gemma_key");
      if (storedKey) {
        if (storedKey.startsWith("AQ.")) {
          sessionStorage.removeItem("concord_gemma_key");
        } else {
          setSessionApiKey(storedKey);
        }
      }

      const storedTrips = localStorage.getItem("concord_saved_trips");
      if (storedTrips) {
        setSavedTrips(JSON.parse(storedTrips));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveSessionKey = (key: string) => {
    setSessionApiKey(key);
    try {
      if (key) sessionStorage.setItem("concord_gemma_key", key);
      else sessionStorage.removeItem("concord_gemma_key");
    } catch {
      // ignore
    }
  };

  // Local Storage Save
  const handleSaveToLocalStorage = (name: string) => {
    try {
      const session: SavedTripSession = {
        id: `trip-${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
        trip,
        travelers,
        selectedCandidateId,
        negotiationResponse: negotiationData || undefined,
      };
      const updated = [session, ...savedTrips];
      setSavedTrips(updated);
      localStorage.setItem("concord_saved_trips", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save trip to localStorage", e);
    }
  };

  const handleDeleteSavedTrip = (id: string) => {
    const updated = savedTrips.filter((t) => t.id !== id);
    setSavedTrips(updated);
    try {
      localStorage.setItem("concord_saved_trips", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleLoadSavedTrip = (session: SavedTripSession) => {
    setTrip(session.trip);
    setTravelers(session.travelers);
    if (session.negotiationResponse) {
      setNegotiationData(session.negotiationResponse);
    }
    if (session.selectedCandidateId) {
      setSelectedCandidateId(session.selectedCandidateId);
    }
    setCurrentTab("dashboard");
  };

  const handleStartBlankTrip = () => {
    setTrip(DEFAULT_TRIP_SETUP);
    setTravelers(DEFAULT_TRAVELERS);
    setNegotiationData(null);
    setSelectedCandidateId("candidate-balanced-compromise");
    setCurrentRound(1);
    setIsProposalAccepted(false);
    setErrorMsg(null);
    setCurrentTab("planner");
  };

  const handleStartPlanning = (customSetup?: Partial<TripSetup>) => {
    if (customSetup) {
      setTrip((prev) => ({
        ...prev,
        ...customSetup,
      }));
      setNegotiationData(null);
    }
    setCurrentTab("planner");
  };

  // Deterministic local computation fallback / live baseline
  const deterministicCandidates = useMemo(() => {
    return generateCandidateItineraries(trip, travelers);
  }, [trip, travelers]);

  const activeCandidates = negotiationData ? negotiationData.candidates : deterministicCandidates;

  const currentSelectedCandidate = useMemo(() => {
    return (
      activeCandidates.find((c) => c.id === selectedCandidateId) ||
      selectBestCandidate(activeCandidates).best
    );
  }, [activeCandidates, selectedCandidateId]);

  const activeValidationReport: ValidationReport = useMemo(() => {
    if (negotiationData && negotiationData.selectedCandidateId === currentSelectedCandidate.id) {
      return negotiationData.validation;
    }
    return performDeterministicValidation(currentSelectedCandidate, trip, travelers);
  }, [negotiationData, currentSelectedCandidate, trip, travelers]);

  // Execute Negotiation via Gemma 4
  const handleResolveConflicts = async (targetRound = 1) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionApiKey.trim()) {
        headers["x-gemma-api-key"] = sessionApiKey.trim();
      }

      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          trip,
          travelers,
          roundNumber: targetRound,
          previousProposalId: selectedCandidateId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server returned status ${res.status}`);
      }

      setNegotiationData(data);
      setSelectedCandidateId(data.selectedCandidateId);
      setCurrentRound(targetRound);
      setIsProposalAccepted(false);
      setCurrentTab("dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse natural language notes with Gemma 4
  const handleParseNotesWithAI = async (notes: string) => {
    if (!notes.trim()) return;
    setIsParsingNotes(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionApiKey.trim()) {
        headers["x-gemma-api-key"] = sessionApiKey.trim();
      }

      const res = await fetch("/api/negotiate/parse-preferences", {
        method: "POST",
        headers,
        body: JSON.stringify({
          trip: {
            ...trip,
            travelStyle: notes,
          },
          travelers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse notes with Gemma 4.");
      }

      if (data.analysis) {
        alert(
          `Gemma 4 Analysis Complete!\n\n• Key Sticking Point: ${data.analysis.keyStickingPoint}\n• Consensus Baseline: ${data.analysis.consensusBaseline}`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsParsingNotes(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-200">
      {/* Top Demo Banner */}
      <DemoBanner />

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        hasCustomKey={Boolean(sessionApiKey)}
        onResetDefaults={handleStartBlankTrip}
        savedTripsCount={savedTrips.length}
        onOpenSavedTrips={() => setIsSavedTripsOpen(true)}
        onStartPlanning={() => setCurrentTab("planner")}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        {/* Error Alert Banner (preserves UI if Gemma 4 call fails) */}
        {errorMsg && (
          <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-xl text-xs text-rose-900 shadow-xs flex items-start space-x-3 animate-in fade-in duration-150">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-rose-950 text-sm">
                Gemma 4 Notice: Action Required
              </h4>
              <p className="leading-relaxed">{errorMsg}</p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(true)}
                  className="px-3 py-1 bg-rose-800 text-white font-medium rounded hover:bg-rose-900 transition-colors"
                >
                  Configure Gemma API Key
                </button>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-stone-600 hover:underline"
                >
                  Dismiss notice
                </button>
                <span className="text-stone-500 italic">
                  Deterministic calculations and validation remain 100% active.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 1: LANDING PAGE ================= */}
        {currentTab === "landing" && (
          <LandingPage
            onStartPlanning={handleStartPlanning}
            onExploreSample={() => setCurrentTab("dashboard")}
          />
        )}

        {/* ================= VIEW 2: TRIP PLANNER STEPPER ================= */}
        {currentTab === "planner" && (
          <div className="space-y-6">
            <TripPlannerStepper
              trip={trip}
              onChangeTrip={setTrip}
              travelers={travelers}
              onChangeTravelers={setTravelers}
              onStartNegotiation={() => handleResolveConflicts(1)}
              isLoading={isLoading}
              onParseNotesWithAI={handleParseNotesWithAI}
              isParsingNotes={isParsingNotes}
            />
          </div>
        )}

        {/* ================= VIEW 3: NEGOTIATION RESULTS DASHBOARD ================= */}
        {currentTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Dashboard Header Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surface-border pb-4">
              <div>
                <div className="flex items-center space-x-2 text-forest-800 text-xs font-semibold tracking-wide uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Negotiation Results & Trade-Off Engine</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950 mt-1">
                  {trip.origin} → {trip.destination}
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 max-w-2xl mt-1">
                  Pareto-optimal consensus resolving individual member tensions across budget, comfort, sightseeing, and transit fatigue.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-forest-50 text-forest-900 border border-forest-200 px-3 py-1.5 rounded-lg font-mono font-medium">
                  Budget: <strong>₹{trip.sharedBudgetINR.toLocaleString("en-IN")}</strong>
                </span>
                <span className="bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg font-medium">
                  {trip.travelerCount} Travelers
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentTab("planner")}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-stone-300 hover:bg-stone-50 font-semibold text-stone-700"
                >
                  Edit Inputs ↗
                </button>
              </div>
            </div>

            {/* Negotiation Controls Bar */}
            <NegotiationControlsBar
              roundNumber={currentRound}
              maxRounds={3}
              isAccepted={isProposalAccepted}
              isLoading={isLoading}
              onAccept={() => setIsConfirmationOpen(true)}
              onReject={() => {
                setIsProposalAccepted(false);
                setNegotiationData(null);
              }}
              onRequestNextRound={() => handleResolveConflicts(currentRound + 1)}
              onOpenCompare={() => setIsCompareModalOpen(true)}
              canNegotiateMore={currentRound < 3}
            />

            {/* 3 Meaningfully Different Candidate Itinerary Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-lg font-bold text-forest-950">
                    Candidate Itineraries ({activeCandidates.length} Evaluated)
                  </h2>
                  <p className="text-xs text-stone-500">
                    Produced by the deterministic optimization engine with distinct objective strategies
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(true)}
                  className="text-xs font-semibold text-forest-800 hover:underline"
                >
                  Side-by-Side Comparison Matrix →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {activeCandidates.map((candidate) => (
                  <ItineraryCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={candidate.id === selectedCandidateId}
                    travelers={travelers}
                    onSelect={() => setSelectedCandidateId(candidate.id)}
                    onCompare={() => setIsCompareModalOpen(true)}
                    onViewDetails={() => setDetailCandidate(candidate)}
                    onChooseThisPlan={() => {
                      setSelectedCandidateId(candidate.id);
                      setIsConfirmationOpen(true);
                    }}
                    onNegotiateAgain={() => handleResolveConflicts(currentRound < 3 ? currentRound + 1 : 1)}
                  />
                ))}
              </div>
            </div>

            {/* Satisfaction & Fairness Panel */}
            <SatisfactionFairnessPanel
              candidate={currentSelectedCandidate}
              travelers={travelers}
            />

            {/* Agent 1 Results: Conflict Analysis Banner (when available) */}
            {negotiationData?.conflictAnalysis && (
              <ConflictAnalysisBanner analysis={negotiationData.conflictAnalysis} />
            )}

            {/* Agent 3 Results: Validated Grounded Explanation Card */}
            {negotiationData?.explanation && (
              <ExplanationCard
                explanation={negotiationData.explanation}
                gemmaModelUsed={negotiationData.gemmaModelUsed}
              />
            )}

            {/* Agent 2 Results: Trade-off & Compromise Ledger */}
            <TradeoffLedger
              tradeoffs={
                negotiationData?.tradeoffs || [
                  {
                    id: "baseline-preview",
                    decisionArea: "Accommodation",
                    originalDecision: "5-Star Beachfront Luxury Resort (Grand Azure)",
                    changedDecision: "4-Star Heritage Boutique Villa (Coastal Palms)",
                    costDifferenceINR: 64000,
                    whoBenefits: ["Vikram R. (Budget Guardian)"],
                    whoConcedes: ["Pooja M. (Comfort Seeker)"],
                    reason:
                      "5-star resort exceeded group budget ceiling by ₹24,400. Shifting to 4-star boutique saved ₹64,000, maintaining 4★ comfort, pool, and AC within budget.",
                    quantifiedImpact: "Saved ₹64,000 group spend while maintaining 8.5/10 comfort score.",
                    isAcceptedByPolicy: true,
                  },
                  {
                    id: "transit-preview",
                    decisionArea: "Transport",
                    originalDecision: "Public Bus Transfers & Two Rented Scooters",
                    changedDecision: "Dedicated Private AC Innova Crysta Chauffeur",
                    costDifferenceINR: -12500,
                    whoBenefits: ["Meera S. (Slow Traveler)", "Pooja M. (Comfort Seeker)"],
                    whoConcedes: ["Vikram R. (Budget Guardian)"],
                    reason:
                      "Public transit and scooters caused 130 mins/day transit fatigue. Dedicated AC vehicle cuts transit to 55 mins/day, preventing member fatigue.",
                    quantifiedImpact: "Reduced daily transit load by 58% (75 mins/day saved).",
                    isAcceptedByPolicy: true,
                  },
                ]
              }
            />

            {/* Negotiation Timeline (Trace from actual optimizer decisions) */}
            <NegotiationTimeline
              timeline={
                negotiationData?.timeline || [
                  {
                    round: 1,
                    stage: "conflict_detected",
                    actor: "Preference & Group Agent",
                    title: "Shared Budget vs Luxury Accommodation Tension",
                    detail:
                      "Comfort Seeker requested 5-star beachfront resort, which caused total cost to breach Vikram's (Budget Guardian) hard budget ceiling of ₹1,25,000.",
                    timestamp: "10:00:00 AM",
                  },
                  {
                    round: 1,
                    stage: "initial_proposal",
                    actor: "Negotiation & Optimization Agent",
                    title: "Best Balanced Strategy Formulation",
                    detail:
                      "Proposing 4-star boutique villa with dedicated AC tourist van and 3 curated excursions within safe budget margin.",
                    timestamp: "10:01:30 AM",
                  },
                  {
                    round: 1,
                    stage: "objection",
                    actor: "Arjun K. (Explorer)",
                    title: "Activity Volume Concerns",
                    detail:
                      "Requested 4-5 excursions to maximize sightseeing value during the trip.",
                    concessionNote: "Arjun sought 5 activities; group consensus settled on 3 quality excursions to preserve rest.",
                    timestamp: "10:03:00 AM",
                  },
                  {
                    round: 1,
                    stage: "counterproposal",
                    actor: "Negotiation & Optimization Agent",
                    title: "Curated Sunset Catamaran Integration",
                    detail:
                      "Integrated private sunset sailing without adding excess road transit for Slow Traveler.",
                    timestamp: "10:04:30 AM",
                  },
                  {
                    round: 1,
                    stage: "accepted_compromise",
                    actor: "Consensus Finalizer",
                    title: "Pareto Champion Validated",
                    detail:
                      "All 4 individual minimum satisfaction thresholds satisfied with surplus reserve.",
                    concessionNote: "Concessions registered across comfort, activity volume, and budget reserve.",
                    timestamp: "10:06:00 AM",
                  },
                ]
              }
              roundNumber={currentRound}
            />

            {/* 7 Deterministic Constraint Validation Checks */}
            <ConstraintValidationPanel validation={activeValidationReport} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-surface-border py-8 px-4 text-xs text-stone-500 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="font-serif font-bold text-stone-900 text-sm">CONCORD</span>
              <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">v1.0.0</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Conflict-Resolving Group Trip Negotiator powered by hosted Gemma 4 (<code className="font-mono">gemma-4-26b-a4b-it</code>).
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span className="font-mono bg-stone-100 px-2 py-1 rounded text-stone-700">
              DEMO DATA — NOT LIVE PRICES
            </span>
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className="text-stone-600 hover:text-stone-900 underline"
            >
              Gemma 4 Diagnostics
            </button>
            <button
              onClick={() => setIsSavedTripsOpen(true)}
              className="text-stone-600 hover:text-stone-900 underline"
            >
              Saved Trips ({savedTrips.length})
            </button>
          </div>
        </div>
      </footer>

      {/* Side-by-Side Comparison Modal */}
      <ItineraryCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        candidates={activeCandidates}
        travelers={travelers}
        selectedCandidateId={selectedCandidateId}
        onSelectCandidate={(id) => setSelectedCandidateId(id)}
      />

      {/* Itinerary Day-by-Day Detail Modal */}
      {detailCandidate && (
        <ItineraryDetailModal
          isOpen={Boolean(detailCandidate)}
          onClose={() => setDetailCandidate(null)}
          candidate={detailCandidate}
          travelers={travelers}
          onChooseThisPlan={() => {
            setSelectedCandidateId(detailCandidate.id);
            setIsConfirmationOpen(true);
          }}
        />
      )}

      {/* Plan Agreed Confirmation Modal */}
      <PlanConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        candidate={currentSelectedCandidate}
        travelers={travelers}
        trip={trip}
        onSaveToLocal={handleSaveToLocalStorage}
      />

      {/* Saved Trips LocalStorage Modal */}
      <SavedTripsModal
        isOpen={isSavedTripsOpen}
        onClose={() => setIsSavedTripsOpen(false)}
        savedTrips={savedTrips}
        onLoadTrip={handleLoadSavedTrip}
        onDeleteTrip={handleDeleteSavedTrip}
        onStartNewTrip={handleStartBlankTrip}
      />

      {/* Gemma API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKey={sessionApiKey}
        onSaveKey={handleSaveSessionKey}
      />
    </div>
  );
}
