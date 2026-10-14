"use client";

import React, { useState } from "react";
import { ValidationReport } from "@/types";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ConstraintValidationPanelProps {
  validation: ValidationReport | null;
}

export function ConstraintValidationPanel({ validation }: ConstraintValidationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!validation) {
    return (
      <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-xs">
        <div className="flex items-center space-x-2 mb-3 border-b border-surface-border pb-3">
          <div className="w-7 h-7 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
            6
          </div>
          <h2 className="font-serif text-base font-bold text-forest-950">
            Deterministic Constraint Validation
          </h2>
        </div>
        <div className="p-6 text-center text-stone-500 text-xs">
          Constraint validation will run upon resolving conflicts.
        </div>
      </div>
    );
  }

  const passCount = validation.checks.filter((c) => c.status === "PASS").length;
  const totalCount = validation.checks.length;

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-surface-border pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
            6
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-forest-950">
              Deterministic Constraint Validation
            </h2>
            <p className="text-xs text-stone-500">
              Rigorous mathematical verification against budget ceilings, offer IDs, and traveler floors
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              validation.overallValid
                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                : "bg-rose-100 text-rose-900 border border-rose-300"
            }`}
          >
            {validation.overallValid ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>ALL HARD CONSTRAINTS PASSED ({passCount}/{totalCount})</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-700" />
                <span>HARD CONSTRAINTS VIOLATED ({passCount}/{totalCount})</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="text-xs text-stone-600 mb-3 bg-stone-50 p-2.5 rounded border border-stone-200">
        <strong>Validation Summary: </strong>
        {validation.summaryNote}
      </div>

      {/* Grid of checks */}
      <div className="space-y-2">
        {validation.checks.map((check) => {
          const isPass = check.status === "PASS";
          const isExpanded = expandedId === check.id;

          return (
            <div
              key={check.id}
              className={`rounded-lg border text-xs transition-colors ${
                isPass
                  ? "bg-white border-surface-border hover:border-stone-300"
                  : "bg-rose-50/50 border-rose-300"
              }`}
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : check.id)}
                className="p-3 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2.5">
                  {isPass ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold text-stone-900 block">
                      {check.name}
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono">
                      Category: {check.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded ${
                      isPass
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {check.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-stone-100 text-[11px] space-y-1.5 bg-stone-50/60 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700">
                    <div>
                      <strong className="text-stone-500 block uppercase text-[9px] tracking-wider">
                        Constraint Rule:
                      </strong>
                      <span className="font-mono text-stone-800">{check.expected}</span>
                    </div>
                    <div>
                      <strong className="text-stone-500 block uppercase text-[9px] tracking-wider">
                        Evaluated Value:
                      </strong>
                      <span className="font-mono text-stone-800">{check.actual}</span>
                    </div>
                  </div>
                  <div className="text-stone-600 pt-1 border-t border-stone-200">
                    <strong>Audit Detail: </strong>
                    {check.details}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
