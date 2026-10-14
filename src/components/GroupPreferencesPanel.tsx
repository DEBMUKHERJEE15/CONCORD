"use client";

import React, { useState } from "react";
import { TravelerProfile } from "@/types";
import {
  ShieldAlert,
  Sparkles,
  Sliders,
  Hotel,
  Clock,
  Compass,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface GroupPreferencesPanelProps {
  travelers: TravelerProfile[];
  onChange: (updated: TravelerProfile[]) => void;
  onResolveConflicts: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function GroupPreferencesPanel({
  travelers,
  onChange,
  onResolveConflicts,
  isLoading,
  disabled,
}: GroupPreferencesPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateTraveler = (id: string, partial: Partial<TravelerProfile>) => {
    const updated = travelers.map((t) => (t.id === id ? { ...t, ...partial } : t));
    onChange(updated);
  };

  const updatePreferences = (
    id: string,
    partialPrefs: Partial<TravelerProfile["preferences"]>
  ) => {
    const updated = travelers.map((t) =>
      t.id === id ? { ...t, preferences: { ...t.preferences, ...partialPrefs } } : t
    );
    onChange(updated);
  };

  const getRoleAccent = (role: string) => {
    switch (role) {
      case "budget_guardian":
        return { badge: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40", border: "border-l-emerald-500" };
      case "comfort_seeker":
        return { badge: "bg-blue-950/80 text-blue-300 border-blue-500/40", border: "border-l-blue-500" };
      case "explorer":
        return { badge: "bg-amber-950/80 text-amber-300 border-amber-500/40", border: "border-l-amber-500" };
      case "slow_traveler":
        return { badge: "bg-purple-950/80 text-purple-300 border-purple-500/40", border: "border-l-purple-500" };
      default:
        return { badge: "bg-slate-800 text-slate-300 border-slate-700", border: "border-l-slate-600" };
    }
  };

  return (
    <div className="bg-[#131d33] rounded-2xl border border-slate-700/80 p-5 shadow-lg text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-slate-100">
              Group Traveler Profiles & Preferences
            </h2>
            <p className="text-xs text-slate-400">
              4 distinct archetypes with independent weights and non-negotiable minimum satisfaction floors
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onResolveConflicts}
          disabled={isLoading || disabled}
          className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 text-slate-950 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs shadow-md transition-all active:scale-[0.98]"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              <span>Gemma 4 Negotiating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span className="font-bold tracking-wide">Resolve Conflicts (Gemma 4)</span>
            </>
          )}
        </button>
      </div>

      {/* 4 Traveler Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {travelers.map((traveler) => {
          const accent = getRoleAccent(traveler.role);
          const isExpanded = expandedId === traveler.id;

          return (
            <div
              key={traveler.id}
              className={`bg-[#1a233b] rounded-xl border border-slate-700/80 p-3.5 border-l-4 ${accent.border} flex flex-col justify-between shadow-sm transition-all hover:border-slate-600`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: traveler.avatarColor }}
                    />
                    <input
                      type="text"
                      value={traveler.name}
                      disabled={disabled}
                      onChange={(e) => updateTraveler(traveler.id, { name: e.target.value })}
                      className="text-xs font-bold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-600 focus:border-emerald-500 focus:outline-hidden w-28"
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${accent.badge}`}
                  >
                    {traveler.roleLabel}
                  </span>
                </div>

                {/* Primary Thresholds Summary */}
                <div className="space-y-1.5 text-[11px] text-slate-300 mb-3 bg-[#0f172a] p-2.5 rounded-lg border border-slate-700/70">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Hotel className="w-3 h-3 text-slate-400" /> Min Hotel:
                    </span>
                    <span className="font-semibold text-slate-200">
                      {traveler.preferences.minHotelStars}★ Stars
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Compass className="w-3 h-3 text-slate-400" /> Min Activities:
                    </span>
                    <span className="font-semibold text-slate-200">
                      {traveler.preferences.minActivitiesCount} excursions
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-slate-400" /> Max Transit:
                    </span>
                    <span className="font-semibold text-slate-200">
                      ≤ {traveler.preferences.maxTransitMinutesPerDay} m/day
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800 pt-1 text-emerald-400 font-semibold">
                    <span>Min Satisfaction Floor:</span>
                    <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                      {traveler.minimumSatisfactionScore}%
                    </span>
                  </div>
                </div>

                {/* Weights Bar Graph Preview */}
                <div className="space-y-1 text-[10px] text-slate-400">
                  <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    <span>Cost</span>
                    <span>Comf</span>
                    <span>Act</span>
                    <span>Trans</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 h-1.5 bg-[#0f172a] rounded overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${traveler.weights.cost * 100}%` }}
                      title={`Cost: ${Math.round(traveler.weights.cost * 100)}%`}
                    />
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${traveler.weights.comfort * 100}%` }}
                      title={`Comfort: ${Math.round(traveler.weights.comfort * 100)}%`}
                    />
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${traveler.weights.activities * 100}%` }}
                      title={`Activities: ${Math.round(traveler.weights.activities * 100)}%`}
                    />
                    <div
                      className="bg-purple-500 h-full"
                      style={{ width: `${traveler.weights.transit * 100}%` }}
                      title={`Transit: ${Math.round(traveler.weights.transit * 100)}%`}
                    />
                  </div>
                </div>
              </div>

              {/* Expand Toggle */}
              <div className="mt-3 pt-2 border-t border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : traveler.id)}
                  className="w-full flex items-center justify-center space-x-1 text-[11px] font-medium text-slate-300 hover:text-white py-0.5"
                >
                  <Sliders className="w-3 h-3 text-slate-400" />
                  <span>{isExpanded ? "Hide Settings" : "Edit Constraints"}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {/* Expanded Details Form */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700 space-y-2 text-[11px] animate-in fade-in duration-100">
                    <div>
                      <label className="block text-slate-300 mb-0.5">Min Hotel Stars:</label>
                      <select
                        value={traveler.preferences.minHotelStars}
                        disabled={disabled}
                        onChange={(e) =>
                          updatePreferences(traveler.id, {
                            minHotelStars: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 text-xs border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200"
                      >
                        <option value={2.5}>2.5★ Budget Friendly</option>
                        <option value={3.0}>3.0★ Standard Hotel</option>
                        <option value={3.5}>3.5★ Quality Boutique</option>
                        <option value={4.0}>4.0★ Upscale Villa/Resort</option>
                        <option value={5.0}>5.0★ Luxury Beachfront</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-0.5">Preferred Pace:</label>
                      <select
                        value={traveler.preferences.preferredPace}
                        disabled={disabled}
                        onChange={(e) =>
                          updatePreferences(traveler.id, {
                            preferredPace: e.target.value as "relaxed" | "moderate" | "packed",
                          })
                        }
                        className="w-full px-2 py-1 text-xs border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200"
                      >
                        <option value="relaxed">Relaxed (Low fatigue)</option>
                        <option value="moderate">Moderate (Balanced)</option>
                        <option value="packed">Packed (Max Sightseeing)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-0.5">
                        Min Activities Count:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={traveler.preferences.minActivitiesCount}
                        disabled={disabled}
                        onChange={(e) =>
                          updatePreferences(traveler.id, {
                            minActivitiesCount: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 text-xs border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-0.5">
                        Max Transit (Mins/Day):
                      </label>
                      <input
                        type="number"
                        step={10}
                        min={30}
                        max={180}
                        value={traveler.preferences.maxTransitMinutesPerDay}
                        disabled={disabled}
                        onChange={(e) =>
                          updatePreferences(traveler.id, {
                            maxTransitMinutesPerDay: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 text-xs border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-0.5 font-semibold text-emerald-400">
                        Mandatory Minimum Satisfaction Floor (%):
                      </label>
                      <input
                        type="range"
                        min={40}
                        max={85}
                        step={5}
                        value={traveler.minimumSatisfactionScore}
                        disabled={disabled}
                        onChange={(e) =>
                          updateTraveler(traveler.id, {
                            minimumSatisfactionScore: Number(e.target.value),
                          })
                        }
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>40%</span>
                        <span className="font-bold text-emerald-400">
                          {traveler.minimumSatisfactionScore}%
                        </span>
                        <span>85%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
