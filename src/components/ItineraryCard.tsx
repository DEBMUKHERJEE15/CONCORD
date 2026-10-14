"use client";

import React from "react";
import { ItineraryCandidate, TravelerProfile } from "@/types";
import {
  Hotel,
  Car,
  Compass,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Award,
  Eye,
  Check,
  RefreshCw,
  Layers,
  Coffee,
} from "lucide-react";

interface ItineraryCardProps {
  candidate: ItineraryCandidate;
  isSelected: boolean;
  travelers: TravelerProfile[];
  onSelect: () => void;
  onCompare: () => void;
  onViewDetails: () => void;
  onChooseThisPlan: () => void;
  onNegotiateAgain: () => void;
}

export function ItineraryCard({
  candidate,
  isSelected,
  travelers,
  onSelect,
  onCompare,
  onViewDetails,
  onChooseThisPlan,
  onNegotiateAgain,
}: ItineraryCardProps) {
  const isSurplus = candidate.costBreakdown.remainingBudgetINR >= 0;

  return (
    <div
      className={`rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
        isSelected
          ? "bg-white border-forest-600 ring-2 ring-forest-600/20 shadow-md"
          : "bg-surface-subtle/50 border-surface-border hover:border-stone-400 hover:shadow-xs"
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="p-4 sm:p-5 border-b border-surface-border">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-forest-800 bg-forest-100 px-2 py-0.5 rounded border border-forest-200">
                {candidate.strategyLabel}
              </span>
              <h3 className="font-serif text-base sm:text-lg font-bold text-forest-950 mt-1">
                {candidate.label}
              </h3>
            </div>
            {isSelected && (
              <span className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-forest-900 text-white px-2.5 py-1 rounded-full shadow-xs shrink-0">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Selected</span>
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            {candidate.description}
          </p>
        </div>

        {/* Financial & Core Metrics Strip */}
        <div className="grid grid-cols-2 bg-stone-50/80 border-b border-surface-border p-3.5 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block">
              Estimated Total Cost
            </span>
            <span className="font-mono text-base font-bold text-forest-950">
              ₹{candidate.costBreakdown.grandTotalINR.toLocaleString("en-IN")}
            </span>
            <span className="block text-[10px] text-stone-500">
              (₹{candidate.costBreakdown.costPerPersonINR.toLocaleString("en-IN")}/person)
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold block">
              Remaining Budget
            </span>
            <span
              className={`font-mono text-base font-bold ${
                isSurplus ? "text-emerald-700" : "text-rose-600 font-extrabold"
              }`}
            >
              {isSurplus
                ? `+₹${candidate.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")}`
                : `-₹${Math.abs(candidate.costBreakdown.remainingBudgetINR).toLocaleString("en-IN")}`}
            </span>
            <span className="block text-[10px] text-stone-500">
              {isSurplus ? "Surplus Reserve" : "OVER BUDGET"}
            </span>
          </div>
        </div>

        {/* Detailed Breakdown Strip */}
        <div className="p-4 space-y-2.5 text-xs text-stone-700 border-b border-surface-border">
          {/* Hotel Breakdown */}
          <div className="flex items-start space-x-2">
            <Hotel className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div className="w-full">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-900">
                  {candidate.hotel.name} ({candidate.hotel.stars}★)
                </span>
                <span className="font-mono text-[11px] font-semibold text-stone-700">
                  ₹{candidate.costBreakdown.hotelTotalINR.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-[11px] text-stone-500">
                {candidate.hotel.locationArea} • ₹{candidate.hotel.pricePerNightINR.toLocaleString("en-IN")}/night ({candidate.roomCount} rooms)
              </div>
            </div>
          </div>

          {/* Transport Breakdown */}
          <div className="flex items-start space-x-2">
            <Car className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div className="w-full">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-900">
                  {candidate.transport.name.split("(")[0]}
                </span>
                <span className="font-mono text-[11px] font-semibold text-stone-700">
                  ₹{candidate.costBreakdown.transportTotalINR.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-[11px] text-stone-500 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> ~{candidate.metrics.averageTransitMinutesPerDay} mins/day transit
                </span>
              </div>
            </div>
          </div>

          {/* Activities Breakdown & Rest Periods */}
          <div className="flex items-start space-x-2">
            <Compass className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div className="w-full">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-900">
                  {candidate.metrics.totalActivityCount} Excursions ({candidate.metrics.dailyPaceRating} pace)
                </span>
                <span className="font-mono text-[11px] font-semibold text-stone-700">
                  ₹{candidate.costBreakdown.activitiesTotalINR.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-purple-800 font-medium">
                  <Coffee className="w-3 h-3 text-purple-600" /> {candidate.metrics.restPeriodsCount} Rest Blocks
                </span>
                <span>• Dining: ₹{candidate.costBreakdown.diningTotalINR.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Key Concessions Made */}
          {candidate.keyConcessionsMade && candidate.keyConcessionsMade.length > 0 && (
            <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60 text-[11px] text-amber-950 space-y-1">
              <strong className="block text-[10px] uppercase font-bold tracking-wider text-amber-900">
                Key Concessions Made:
              </strong>
              <ul className="space-y-0.5 text-[10px] text-amber-900 list-disc list-inside">
                {candidate.keyConcessionsMade.slice(0, 2).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Individual Satisfaction Scores */}
        <div className="p-4 bg-white space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
            <span>Member Utility Scores:</span>
            <span className="font-mono text-forest-800 font-bold">
              Mean: {candidate.aggregateSatisfaction}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {travelers.map((t) => {
              const scoreObj = candidate.satisfactionScores[t.id];
              const meetsMin = scoreObj?.status === "meets_minimum";
              return (
                <div
                  key={t.id}
                  className={`p-2 rounded-lg border text-[11px] ${
                    meetsMin
                      ? "bg-stone-50 border-stone-200"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="truncate pr-1">{t.name.split(" ")[0]}</span>
                    <span
                      className={`font-mono font-bold ${
                        meetsMin ? "text-forest-800" : "text-rose-700"
                      }`}
                    >
                      {scoreObj?.totalScore || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500 mt-0.5">
                    <span className="capitalize">{t.role.replace("_", " ")}</span>
                    {meetsMin ? (
                      <span className="text-emerald-700 font-medium">PASS</span>
                    ) : (
                      <span className="text-rose-600 font-bold">&lt; Floor</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Infeasibility notice if any */}
          {!candidate.isFeasible && (
            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-[11px] flex items-start space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Infeasible Proposal:</strong>
                <ul className="list-disc list-inside mt-0.5 text-[10px] space-y-0.5">
                  {candidate.infeasibilityReasons?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions: View Details, Choose Plan, Compare, Negotiate Again */}
      <div className="p-3 bg-surface-subtle border-t border-surface-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={onViewDetails}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-semibold transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-stone-600" />
            <span>View Details</span>
          </button>

          <button
            type="button"
            onClick={onCompare}
            className="text-stone-600 hover:text-stone-900 underline text-xs px-1"
          >
            Compare
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={onChooseThisPlan}
            disabled={!candidate.isFeasible}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs flex items-center space-x-1 ${
              isSelected
                ? "bg-forest-900 text-white"
                : candidate.isFeasible
                ? "bg-forest-800 text-white hover:bg-forest-900"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            }`}
          >
            <Check className="w-3 h-3" />
            <span>{isSelected ? "Current Consensus" : "Choose This Plan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
