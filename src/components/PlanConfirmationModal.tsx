"use client";

import React, { useState } from "react";
import { ItineraryCandidate, TravelerProfile, TripSetup } from "@/types";
import {
  CheckCircle2,
  X,
  FileCheck,
  Bookmark,
  Share2,
  AlertCircle,
  IndianRupee,
  Users,
} from "lucide-react";

interface PlanConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: ItineraryCandidate;
  travelers: TravelerProfile[];
  trip: TripSetup;
  onSaveToLocal: (name: string) => void;
}

export function PlanConfirmationModal({
  isOpen,
  onClose,
  candidate,
  travelers,
  trip,
  onSaveToLocal,
}: PlanConfirmationModalProps) {
  const [saveName, setSaveName] = useState(`${trip.destination} - ${candidate.strategyLabel}`);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveToLocal(saveName.trim() || `${trip.destination} Plan`);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCopySummary = () => {
    const text = `CONCORD TRIP CONSENSUS — ${trip.origin} to ${trip.destination}
Plan: ${candidate.label}
Total Cost: ₹${candidate.costBreakdown.grandTotalINR.toLocaleString("en-IN")} (₹${candidate.costBreakdown.costPerPersonINR.toLocaleString("en-IN")}/person)
Remaining Buffer: ₹${candidate.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")}
Hotel: ${candidate.hotel.name} (${candidate.hotel.stars}★)
Transport: ${candidate.transport.name}
Activities: ${candidate.activities.map((a) => a.title).join(", ")}
Group Utility Alignment: ${candidate.aggregateSatisfaction}%

*DEMO DATA — NOT LIVE PRICES*`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-surface-border shadow-2xl max-w-lg w-full p-6 space-y-4 my-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-surface-border pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-forest-950">
                Group Consensus Agreed!
              </h3>
              <p className="text-xs text-stone-500">
                All 4 members aligned on a feasible compromise
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Overview Card */}
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-stone-900">{candidate.label}</span>
            <span className="bg-forest-100 text-forest-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded">
              {candidate.aggregateSatisfaction}% Alignment
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-stone-200 pt-2">
            <div>
              <span className="text-stone-500 block">Total Group Cost:</span>
              <strong className="font-mono text-stone-900 text-xs">
                ₹{candidate.costBreakdown.grandTotalINR.toLocaleString("en-IN")}
              </strong>
            </div>
            <div>
              <span className="text-stone-500 block">Per Person:</span>
              <strong className="font-mono text-stone-900 text-xs">
                ₹{candidate.costBreakdown.costPerPersonINR.toLocaleString("en-IN")}
              </strong>
            </div>
          </div>
        </div>

        {/* Concessions Recorded */}
        <div className="space-y-1.5 text-xs">
          <h4 className="font-semibold text-stone-800 text-[11px] uppercase tracking-wider">
            Consensus Agreements:
          </h4>
          <ul className="space-y-1 text-[11px] text-stone-600">
            {candidate.keyConcessionsMade.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-forest-700 font-bold">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer Warning */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Blueprint Disclaimer: </strong>
            <span>
              This is a negotiated consensus blueprint. Concord does not process live bookings, payments, or airline tickets. Use this agreed plan to coordinate bookings directly with suppliers.
            </span>
          </div>
        </div>

        {/* Save to Local Storage Form */}
        <div className="border-t border-surface-border pt-3 space-y-2">
          <label className="block text-xs font-semibold text-stone-800">
            Save to &ldquo;My Saved Trips&rdquo; (Browser Storage):
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-surface-border rounded-md bg-white w-full focus:outline-hidden focus:ring-1 focus:ring-forest-600 font-medium"
              placeholder="Trip Name"
            />
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 bg-forest-800 text-white rounded-md text-xs font-semibold hover:bg-forest-900 transition-colors shrink-0 flex items-center space-x-1"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSaved ? "Saved!" : "Save Plan"}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-surface-border pt-3 text-xs">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center space-x-1.5 text-stone-600 hover:text-stone-900 font-medium"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? "Copied to Clipboard!" : "Copy Trip Summary"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-stone-100 text-stone-800 hover:bg-stone-200 font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
