"use client";

import React from "react";
import { ItineraryCandidate, TravelerProfile } from "@/types";
import { X, Check, AlertTriangle, ArrowRight } from "lucide-react";

interface ItineraryCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: ItineraryCandidate[];
  travelers: TravelerProfile[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
}

export function ItineraryCompareModal({
  isOpen,
  onClose,
  candidates,
  travelers,
  selectedCandidateId,
  onSelectCandidate,
}: ItineraryCompareModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-xl border border-surface-border shadow-2xl max-w-5xl w-full p-6 space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-forest-950">
              Side-by-Side Proposal Comparison Matrix
            </h2>
            <p className="text-xs text-stone-500">
              Compare trade-offs across financial, physical transit, and individual satisfaction dimensions
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="py-2.5 px-3 font-semibold text-stone-600 bg-surface-subtle w-48">
                  Evaluation Metric
                </th>
                {candidates.map((c) => {
                  const isCurrent = c.id === selectedCandidateId;
                  return (
                    <th
                      key={c.id}
                      className={`py-2.5 px-3 font-bold ${
                        isCurrent ? "bg-forest-50/80 text-forest-950 border-x border-forest-200" : "text-stone-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{c.label.split(":")[0]}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-forest-800 text-white px-2 py-0.5 rounded-full font-normal">
                            Active Champion
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {/* Grand Total */}
              <tr>
                <td className="py-2 px-3 font-semibold text-stone-700 bg-surface-subtle/50">
                  Total Estimated Cost
                </td>
                {candidates.map((c) => (
                  <td key={c.id} className="py-2 px-3 font-mono font-bold text-stone-900">
                    ₹{c.costBreakdown.grandTotalINR.toLocaleString("en-IN")}
                    <span className="block font-normal text-[10px] text-stone-500">
                      ₹{c.costBreakdown.costPerPersonINR.toLocaleString("en-IN")}/person
                    </span>
                  </td>
                ))}
              </tr>

              {/* Remaining Budget */}
              <tr>
                <td className="py-2 px-3 font-semibold text-stone-700 bg-surface-subtle/50">
                  Budget Margin (INR)
                </td>
                {candidates.map((c) => {
                  const surplus = c.costBreakdown.remainingBudgetINR >= 0;
                  return (
                    <td
                      key={c.id}
                      className={`py-2 px-3 font-mono font-bold ${
                        surplus ? "text-emerald-700" : "text-rose-600 font-extrabold"
                      }`}
                    >
                      {surplus
                        ? `+₹${c.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")}`
                        : `-₹${Math.abs(c.costBreakdown.remainingBudgetINR).toLocaleString("en-IN")}`}
                    </td>
                  );
                })}
              </tr>

              {/* Hotel Category */}
              <tr>
                <td className="py-2 px-3 font-semibold text-stone-700 bg-surface-subtle/50">
                  Hotel & Star Rating
                </td>
                {candidates.map((c) => (
                  <td key={c.id} className="py-2 px-3 text-stone-800">
                    <div className="font-medium">{c.hotel.name}</div>
                    <div className="text-[10px] text-amber-700 font-bold">{c.hotel.stars}★ ({c.hotel.category.replace("_", " ")})</div>
                  </td>
                ))}
              </tr>

              {/* Transport & Daily Transit */}
              <tr>
                <td className="py-2 px-3 font-semibold text-stone-700 bg-surface-subtle/50">
                  Transport & Daily Transit
                </td>
                {candidates.map((c) => (
                  <td key={c.id} className="py-2 px-3 text-stone-800">
                    <div>{c.transport.name.split("(")[0]}</div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      ~{c.metrics.averageTransitMinutesPerDay} mins/day transit
                    </div>
                  </td>
                ))}
              </tr>

              {/* Activities */}
              <tr>
                <td className="py-2 px-3 font-semibold text-stone-700 bg-surface-subtle/50">
                  Activities Count & Pace
                </td>
                {candidates.map((c) => (
                  <td key={c.id} className="py-2 px-3 text-stone-800">
                    <span className="font-semibold">{c.metrics.totalActivityCount} Excursions</span>
                    <span className="text-[10px] text-stone-500 block capitalize">
                      {c.metrics.dailyPaceRating} pace
                    </span>
                  </td>
                ))}
              </tr>

              {/* Traveler Satisfaction Breakdown */}
              {travelers.map((t) => (
                <tr key={t.id} className="bg-stone-50/40">
                  <td className="py-2 px-3 font-semibold text-stone-700">
                    {t.name} ({t.roleLabel})
                  </td>
                  {candidates.map((c) => {
                    const s = c.satisfactionScores[t.id];
                    const pass = s?.status === "meets_minimum";
                    return (
                      <td key={c.id} className="py-2 px-3">
                        <span
                          className={`inline-block font-mono font-bold px-1.5 py-0.5 rounded ${
                            pass
                              ? "bg-forest-100 text-forest-800"
                              : "bg-rose-100 text-rose-800 font-extrabold"
                          }`}
                        >
                          {s?.totalScore || 0}%
                        </span>
                        <span className="text-[10px] text-stone-400 ml-1">
                          (min {t.minimumSatisfactionScore}%)
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Aggregate Score */}
              <tr className="bg-surface-subtle font-bold">
                <td className="py-2.5 px-3 text-stone-900">Aggregate Utility Alignment</td>
                {candidates.map((c) => (
                  <td key={c.id} className="py-2.5 px-3 font-mono text-sm text-forest-900">
                    {c.aggregateSatisfaction}%
                  </td>
                ))}
              </tr>

              {/* Feasibility Result */}
              <tr>
                <td className="py-2.5 px-3 font-semibold text-stone-700 bg-surface-subtle/50">
                  Hard Constraint Status
                </td>
                {candidates.map((c) => (
                  <td key={c.id} className="py-2.5 px-3">
                    {c.isFeasible ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        <span>FEASIBLE</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>INFEASIBLE</span>
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Action */}
              <tr>
                <td className="py-3 px-3 bg-surface-subtle/50">Action</td>
                {candidates.map((c) => (
                  <td key={c.id} className="py-3 px-3">
                    <button
                      type="button"
                      disabled={!c.isFeasible || c.id === selectedCandidateId}
                      onClick={() => {
                        onSelectCandidate(c.id);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-colors ${
                        c.id === selectedCandidateId
                          ? "bg-forest-900 text-white cursor-default"
                          : c.isFeasible
                          ? "bg-surface border border-stone-300 hover:bg-forest-50 hover:text-forest-900"
                          : "bg-stone-100 text-stone-400 cursor-not-allowed"
                      }`}
                    >
                      <span>{c.id === selectedCandidateId ? "Active" : "Switch To This"}</span>
                      {c.isFeasible && c.id !== selectedCandidateId && <ArrowRight className="w-3 h-3" />}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
