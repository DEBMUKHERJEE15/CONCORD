"use client";

import React from "react";
import { ItineraryCandidate, TravelerProfile } from "@/types";
import { User, AlertTriangle, CheckCircle, TrendingDown, Scale } from "lucide-react";

interface SatisfactionFairnessPanelProps {
  candidate: ItineraryCandidate;
  travelers: TravelerProfile[];
}

export function SatisfactionFairnessPanel({
  candidate,
  travelers,
}: SatisfactionFairnessPanelProps) {
  // Find least satisfied traveler
  let minScore = 100;
  let leastSatisfiedTraveler: TravelerProfile | null = null;

  travelers.forEach((t) => {
    const s = candidate.satisfactionScores[t.id];
    if (s && s.totalScore < minScore) {
      minScore = s.totalScore;
      leastSatisfiedTraveler = t;
    }
  });

  const scoresList = travelers.map((t) => candidate.satisfactionScores[t.id]?.totalScore || 0);
  const maxScore = Math.max(...scoresList);
  const disparity = maxScore - minScore;

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-surface-border pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
            <Scale className="w-4 h-4 text-forest-800" />
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-forest-950">
              Individual Satisfaction & Fairness Distribution
            </h2>
            <p className="text-xs text-stone-500">
              Exposing individual member utility to ensure high group averages never mask member alienation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-forest-50 border border-forest-200 px-3 py-1 rounded-md text-forest-900 font-mono">
            Group Mean: <strong>{candidate.aggregateSatisfaction}%</strong>
          </div>
          <div
            className={`px-3 py-1 rounded-md font-mono border ${
              disparity > 25
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-stone-50 border-stone-200 text-stone-700"
            }`}
          >
            Disparity Spread: <strong>{disparity} pts</strong>
          </div>
        </div>
      </div>

      {/* Disparity or Fairness Alert */}
      {disparity > 25 && leastSatisfiedTraveler && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950 mb-4 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Disparity Warning: </strong>
            <span>
              While the group average is {candidate.aggregateSatisfaction}%,{" "}
              <strong>{(leastSatisfiedTraveler as TravelerProfile).name}</strong> has a satisfaction score of{" "}
              {minScore}%, representing a {disparity}-point spread. The Pareto policy ensures this remains above their declared minimum floor ({(leastSatisfiedTraveler as TravelerProfile).minimumSatisfactionScore}%).
            </span>
          </div>
        </div>
      )}

      {/* Cards for each traveler's utility breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {travelers.map((traveler) => {
          const sat = candidate.satisfactionScores[traveler.id];
          const isLowest = leastSatisfiedTraveler?.id === traveler.id;
          const meetsMin = sat?.status === "meets_minimum";

          return (
            <div
              key={traveler.id}
              className={`p-3 rounded-lg border flex flex-col justify-between ${
                isLowest
                  ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/40"
                  : meetsMin
                  ? "bg-white border-surface-border"
                  : "bg-rose-50 border-rose-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: traveler.avatarColor }}
                    />
                    <span className="font-bold text-stone-900 truncate">
                      {traveler.name}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                      meetsMin
                        ? "bg-forest-100 text-forest-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {sat?.totalScore || 0}%
                  </span>
                </div>

                <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-2">
                  {traveler.roleLabel} • Min Floor: {traveler.minimumSatisfactionScore}%
                </div>

                {/* Dimension breakdown bars */}
                <div className="space-y-1.5 text-[10px] text-stone-600 mb-2 bg-stone-50 p-2 rounded border border-stone-200">
                  <div className="flex justify-between items-center">
                    <span>Budget & Cost:</span>
                    <span className="font-mono font-semibold">{sat?.costSatisfaction || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Hotel & Comfort:</span>
                    <span className="font-mono font-semibold">{sat?.comfortSatisfaction || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Activities Load:</span>
                    <span className="font-mono font-semibold">{sat?.activitySatisfaction || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Transit Pace:</span>
                    <span className="font-mono font-semibold">{sat?.transitSatisfaction || 0}%</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-600 italic">
                  &ldquo;{sat?.comments}&rdquo;
                </p>
              </div>

              {isLowest && (
                <div className="mt-2 pt-1.5 border-t border-amber-200 text-[10px] text-amber-800 flex items-center gap-1 font-semibold">
                  <TrendingDown className="w-3 h-3" /> Least-satisfied member in group
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
