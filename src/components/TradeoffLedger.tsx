"use client";

import React from "react";
import { TradeoffLedgerItem } from "@/types";
import { Scale, ArrowRight, UserCheck, UserMinus, Info } from "lucide-react";

interface TradeoffLedgerProps {
  tradeoffs: TradeoffLedgerItem[];
}

export function TradeoffLedger({ tradeoffs }: TradeoffLedgerProps) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 border-b border-surface-border pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
            5
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-forest-950">
              Trade-Off & Compromise Ledger
            </h2>
            <p className="text-xs text-stone-500">
              Visible record of shifted decisions, quantifiable cost impact, and individual concessions
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs text-stone-500">
          <Scale className="w-4 h-4 text-forest-700" />
          <span className="font-mono">{tradeoffs.length} Compromises</span>
        </div>
      </div>

      {tradeoffs.length === 0 ? (
        <div className="p-8 text-center text-stone-500 text-xs">
          No trade-off ledger entries yet. Run negotiation to register compromise concessions.
        </div>
      ) : (
        <div className="space-y-3">
          {tradeoffs.map((item) => {
            const isSaving = item.costDifferenceINR >= 0;
            return (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-surface-border p-4 shadow-xs text-xs space-y-3"
              >
                {/* Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-forest-50 text-forest-900 border border-forest-200">
                      {item.decisionArea}
                    </span>
                    <span className="font-mono text-stone-400 text-[11px]">#{item.id}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 font-mono">
                    <span className="text-stone-500 text-[11px]">Financial Delta:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        isSaving
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {isSaving
                        ? `Saved ₹${item.costDifferenceINR.toLocaleString("en-IN")}`
                        : `Spent +₹${Math.abs(item.costDifferenceINR).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                </div>

                {/* Decision Transition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-stone-50/70 p-2.5 rounded border border-stone-200">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 block mb-0.5">
                      Baseline Considered
                    </span>
                    <span className="font-medium text-stone-700 line-through decoration-rose-400">
                      {item.originalDecision}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-forest-700 block mb-0.5 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-forest-600" /> Agreed Compromise
                    </span>
                    <span className="font-bold text-forest-950">
                      {item.changedDecision}
                    </span>
                  </div>
                </div>

                {/* Parties Impacted */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded p-2 flex items-start space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 block text-[10px] uppercase tracking-wider">
                        Who Benefits:
                      </strong>
                      <span className="text-emerald-800 font-medium">
                        {item.whoBenefits.join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-100 rounded p-2 flex items-start space-x-1.5">
                    <UserMinus className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-900 block text-[10px] uppercase tracking-wider">
                        Concession Yielded By:
                      </strong>
                      <span className="text-amber-800 font-medium">
                        {item.whoConcedes.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Justification & Quantified Impact */}
                <div className="text-[11px] text-stone-600 space-y-1 bg-stone-50/40 p-2 rounded border border-stone-100">
                  <div className="flex items-start space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-forest-700 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-stone-800 font-semibold">Decision Rationale: </strong>
                      {item.reason}
                    </span>
                  </div>
                  {item.quantifiedImpact && (
                    <div className="pl-5 text-stone-500 font-mono text-[10px]">
                      ↳ Impact: {item.quantifiedImpact}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
