"use client";

import React from "react";
import { ConflictAnalysisResult } from "@/types";
import { AlertCircle, Zap, Shield, CheckCircle } from "lucide-react";

interface ConflictAnalysisBannerProps {
  analysis: ConflictAnalysisResult;
}

export function ConflictAnalysisBanner({ analysis }: ConflictAnalysisBannerProps) {
  const getSeverityBadge = (sev: "high" | "medium" | "low") => {
    switch (sev) {
      case "high":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "low":
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-xs">
      <div className="flex items-center space-x-2 mb-4 border-b border-surface-border pb-3">
        <div className="w-7 h-7 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
          3
        </div>
        <div>
          <h2 className="font-serif text-base font-bold text-forest-950">
            Preference & Group Agent Friction Analysis
          </h2>
          <p className="text-xs text-stone-500">
            Automated conflict discovery and compromise opportunity mapping by Gemma 4
          </p>
        </div>
      </div>

      {/* Sticking Point Banner */}
      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-950 mb-3 flex items-start space-x-2">
        <Zap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong>Primary Sticking Point: </strong>
          <span>{analysis.keyStickingPoint}</span>
        </div>
      </div>

      {/* Consensus baseline */}
      <div className="p-3 bg-forest-50/60 border border-forest-100 rounded-lg text-xs text-forest-950 mb-4 flex items-start space-x-2">
        <CheckCircle className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
        <div>
          <strong>Consensus Baseline: </strong>
          <span>{analysis.consensusBaseline}</span>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
          Identified Tension Dimensions:
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {analysis.conflicts.map((c, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-surface-border p-3 space-y-1.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 capitalize">
                  {c.dimension.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getSeverityBadge(
                    c.severity
                  )}`}
                >
                  {c.severity} Tension
                </span>
              </div>

              <div className="text-[11px] text-stone-500">
                Parties: <strong className="text-stone-700">{c.partiesInvolved.join(" vs ")}</strong>
              </div>

              <p className="text-[11px] text-stone-600 leading-snug">
                {c.description}
              </p>

              <div className="pt-1.5 border-t border-stone-100 text-[10px] text-forest-900">
                <strong>Opportunity: </strong>
                {c.tradeoffOpportunity}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
