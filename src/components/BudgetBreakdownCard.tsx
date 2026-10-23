"use client";

import React from "react";
import { TripBudgetCalculation } from "../types";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Building2,
  Car,
  Compass,
  UtensilsCrossed,
  Bus,
  Receipt,
  PiggyBank,
} from "lucide-react";

interface BudgetBreakdownCardProps {
  budget: TripBudgetCalculation;
  sharedBudgetINR: number;
}

export function BudgetBreakdownCard({ budget, sharedBudgetINR }: BudgetBreakdownCardProps) {
  const isOverBudget = budget.isOverBudget;
  const budgetUtilization = sharedBudgetINR > 0
    ? Math.min(100, Math.round((budget.totalTripCostINR / sharedBudgetINR) * 100))
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified_live":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-2.5 h-2.5" /> Verified Live
          </span>
        );
      case "user_estimate":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <HelpCircle className="w-2.5 h-2.5" /> User Estimate
          </span>
        );
      case "demo":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Demo Catalog
          </span>
        );
      case "estimate":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Standard Est.
          </span>
        );
      case "missing":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            Unpriced / Missing
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#131d33] border border-slate-700/60 rounded-xl p-5 shadow-lg space-y-4 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-white">Trip Budget & Cost Breakdown</h3>
            <p className="text-xs text-slate-400">
              Deterministic calculation independent of LLM • Exact arithmetic in integer minor units
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Group Shared Budget</div>
          <div className="text-lg font-bold text-white">₹{sharedBudgetINR.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Over-budget Warning if applicable */}
      {isOverBudget && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-600/40 text-red-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-red-200">Budget Overrun Detected:</span> Total cost exceeds group budget by{" "}
            <span className="font-mono font-bold text-white">₹{budget.budgetOverrunINR.toLocaleString("en-IN")}</span>. Concord will flag this itinerary as infeasible unless compromised.
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Budget Allocation: {budgetUtilization}%</span>
          <span>
            {budget.remainingBudgetINR >= 0 ? (
              <span className="text-emerald-400 font-medium">₹{budget.remainingBudgetINR.toLocaleString("en-IN")} Remaining</span>
            ) : (
              <span className="text-red-400 font-medium">₹{budget.budgetOverrunINR.toLocaleString("en-IN")} Deficit</span>
            )}
          </span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isOverBudget ? "bg-red-500" : budgetUtilization > 90 ? "bg-amber-400" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, budgetUtilization)}%` }}
          />
        </div>
      </div>

      {/* Itemized Categories */}
      <div className="divide-y divide-slate-800/80 text-xs">
        {/* Accommodation */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-medium text-slate-200 flex items-center gap-2">
                <span>Accommodation ({budget.nightsCount} nights, {budget.roomCount} rooms)</span>
                {getStatusBadge(budget.categories.accommodation.status)}
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                {budget.categories.accommodation.label}
              </div>
            </div>
          </div>
          <div className="font-mono font-semibold text-white">
            ₹{budget.categories.accommodation.amountINR.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Transport */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-teal-400" />
            <div>
              <div className="font-medium text-slate-200 flex items-center gap-2">
                <span>Intercity Transport</span>
                {getStatusBadge(budget.categories.transport.status)}
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                {budget.categories.transport.label}
              </div>
            </div>
          </div>
          <div className="font-mono font-semibold text-white">
            ₹{budget.categories.transport.amountINR.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Activities */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <div>
              <div className="font-medium text-slate-200 flex items-center gap-2">
                <span>Activities & Excursions ({budget.travelerCount} travelers)</span>
                {getStatusBadge(budget.categories.activities.status)}
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                {budget.categories.activities.label}
              </div>
            </div>
          </div>
          <div className="font-mono font-semibold text-white">
            ₹{budget.categories.activities.amountINR.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Dining */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
            <div>
              <div className="font-medium text-slate-200 flex items-center gap-2">
                <span>Food & Dining Package</span>
                {getStatusBadge(budget.categories.dining.status)}
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                {budget.categories.dining.label}
              </div>
            </div>
          </div>
          <div className="font-mono font-semibold text-white">
            ₹{budget.categories.dining.amountINR.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Local Transport */}
        <div className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="font-medium text-slate-200 flex items-center gap-2">
                <span>Daily Local Transit</span>
                {getStatusBadge(budget.categories.localTransport.status)}
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                {budget.categories.localTransport.label}
              </div>
            </div>
          </div>
          <div className="font-mono font-semibold text-white">
            ₹{budget.categories.localTransport.amountINR.toLocaleString("en-IN")}
          </div>
        </div>

        {/* Taxes & Fees */}
        {budget.categories.taxesAndFees.amountINR > 0 && (
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400" />
              <div>
                <div className="font-medium text-slate-200">Taxes & Additional Fees</div>
                <div className="text-[11px] text-slate-400">{budget.categories.taxesAndFees.label}</div>
              </div>
            </div>
            <div className="font-mono font-semibold text-white">
              ₹{budget.categories.taxesAndFees.amountINR.toLocaleString("en-IN")}
            </div>
          </div>
        )}

        {/* Contingency Buffer */}
        <div className="py-2.5 flex items-center justify-between bg-slate-900/40 px-2 rounded">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-medium text-emerald-300 flex items-center gap-1.5">
                <span>{budget.categories.contingency.percent}% Contingency Buffer</span>
                <span className="text-[10px] text-emerald-500 font-mono">(Explicit Safety Buffer)</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Guards against incidental expenses, tips, and surge pricing
              </div>
            </div>
          </div>
          <div className="font-mono font-semibold text-emerald-400">
            ₹{budget.categories.contingency.amountINR.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Summary Totals */}
      <div className="pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-[11px] text-slate-400">Total Group Estimated Cost:</div>
          <div className="text-xl font-bold font-serif text-white">
            ₹{budget.totalTripCostINR.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-[11px] text-slate-400">Cost Per Traveler ({budget.travelerCount} travelers):</div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            ₹{budget.costPerTravelerINR.toLocaleString("en-IN")}{" "}
            <span className="text-xs text-slate-400 font-sans font-normal">/ person</span>
          </div>
        </div>
      </div>

      {/* Formula & Transparency Explanation */}
      <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 font-mono leading-relaxed overflow-x-auto">
        <div className="text-slate-300 font-semibold mb-0.5">Deterministic Formula:</div>
        <div>{budget.formulaExplanation}</div>
        <div className="mt-1 text-slate-400">
          remainingBudget = groupBudget (₹{sharedBudgetINR.toLocaleString("en-IN")}) - totalTripCost (₹{budget.totalTripCostINR.toLocaleString("en-IN")}) ={" "}
          <span className={budget.remainingBudgetINR >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
            ₹{budget.remainingBudgetINR.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
}
