"use client";

import React from "react";
import { NegotiationTimelineEvent } from "@/types";
import {
  AlertTriangle,
  FileText,
  ShieldX,
  RefreshCw,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface NegotiationTimelineProps {
  timeline: NegotiationTimelineEvent[];
  roundNumber: number;
}

export function NegotiationTimeline({ timeline, roundNumber }: NegotiationTimelineProps) {
  const getStageIcon = (stage: NegotiationTimelineEvent["stage"]) => {
    switch (stage) {
      case "conflict_detected":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "initial_proposal":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "objection":
        return <ShieldX className="w-4 h-4 text-rose-600" />;
      case "counterproposal":
        return <RefreshCw className="w-4 h-4 text-purple-600" />;
      case "accepted_compromise":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Clock className="w-4 h-4 text-stone-500" />;
    }
  };

  const getStageBadge = (stage: NegotiationTimelineEvent["stage"]) => {
    switch (stage) {
      case "conflict_detected":
        return "bg-amber-100 text-amber-900 border-amber-200";
      case "initial_proposal":
        return "bg-blue-100 text-blue-900 border-blue-200";
      case "objection":
        return "bg-rose-100 text-rose-900 border-rose-200";
      case "counterproposal":
        return "bg-purple-100 text-purple-900 border-purple-200";
      case "accepted_compromise":
        return "bg-emerald-100 text-emerald-900 border-emerald-200";
      default:
        return "bg-stone-100 text-stone-800 border-stone-200";
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 border-b border-surface-border pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
            4
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-forest-950">
              Negotiation Timeline & Conflict Resolution
            </h2>
            <p className="text-xs text-stone-500">
              Chronological log of proposals, recorded objections, counterproposals, and consensus
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 font-medium">
          Round {roundNumber} of 3
        </span>
      </div>

      {timeline.length === 0 ? (
        <div className="p-8 text-center text-stone-500 text-xs">
          Click &ldquo;Resolve Conflicts&rdquo; above to execute Gemma 4 multi-agent negotiation.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
          {timeline.map((evt, idx) => {
            const isLast = idx === timeline.length - 1;
            return (
              <div key={idx} className="relative group text-xs">
                {/* Node icon circle */}
                <div
                  className={`absolute -left-6 top-0 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center shadow-xs ${
                    isLast ? "border-emerald-600 ring-2 ring-emerald-100" : "border-stone-300"
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-stone-400 group-hover:bg-forest-700" />
                </div>

                <div className="bg-white rounded-lg border border-surface-border p-3.5 shadow-xs transition-shadow hover:shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="p-1 rounded bg-stone-50 border border-stone-200">
                        {getStageIcon(evt.stage)}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getStageBadge(
                          evt.stage
                        )}`}
                      >
                        {evt.stage.replace("_", " ")}
                      </span>
                      <span className="text-stone-700 font-semibold">{evt.actor}</span>
                    </div>

                    <span className="text-[10px] font-mono text-stone-400">
                      {evt.timestamp}
                    </span>
                  </div>

                  <h4 className="font-semibold text-forest-950 text-xs mb-1">
                    {evt.title}
                  </h4>
                  <p className="text-stone-600 text-[11px] leading-relaxed">
                    {evt.detail}
                  </p>

                  {evt.concessionNote && (
                    <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded border border-amber-200/60 font-medium">
                      <strong className="text-amber-800">Concession Registered: </strong>
                      {evt.concessionNote}
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
