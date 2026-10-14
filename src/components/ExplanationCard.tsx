"use client";

import React from "react";
import { NegotiationResponse } from "@/types";
import { Sparkles, Check, ArrowRight, ShieldCheck, HeartHandshake } from "lucide-react";

interface ExplanationCardProps {
  explanation: NegotiationResponse["explanation"];
  gemmaModelUsed: string;
}

export function ExplanationCard({ explanation, gemmaModelUsed }: ExplanationCardProps) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-surface-border pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
            <HeartHandshake className="w-4 h-4 text-forest-800" />
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-forest-950">
              Grounded Consensus & Compromise Explanation
            </h2>
            <p className="text-xs text-stone-500">
              Authoritatively explained by Gemma 4 based on recorded trade-offs and verified metrics
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] font-mono text-stone-600 bg-forest-50 px-2.5 py-1 rounded-md border border-forest-200">
          <Sparkles className="w-3.5 h-3.5 text-forest-700" />
          <span>Gemma 4 Verified Grounding</span>
        </div>
      </div>

      {/* Consensus Headline Banner */}
      <div className="bg-forest-900 text-white rounded-lg p-4 mb-4 shadow-xs">
        <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 block mb-1">
          Final Negotiated Consensus
        </span>
        <h3 className="font-serif text-lg font-bold leading-snug">
          {explanation.headline}
        </h3>
      </div>

      {/* Detailed Narrative */}
      <div className="text-xs text-stone-700 leading-relaxed space-y-2 mb-4 bg-stone-50/60 p-4 rounded-lg border border-surface-border">
        {explanation.detailedCompromiseNarrative.split("\n\n").map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
      </div>

      {/* Traveler Outcomes Grid */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-forest-950 uppercase tracking-wider">
          Individual Traveler Compromise Ledger:
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {explanation.travelerOutcomes.map((t, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg border border-surface-border p-3.5 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                <div>
                  <span className="font-bold text-stone-900">{t.travelerName}</span>
                  <span className="text-[10px] text-stone-500 uppercase ml-1.5">
                    ({t.role.replace("_", " ")})
                  </span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-forest-100 text-forest-800">
                  {t.score}% Utility
                </span>
              </div>

              <div className="text-[11px] space-y-1">
                <div className="flex items-start space-x-1.5 text-emerald-900">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-emerald-950">Gained: </strong>
                    {t.gain}
                  </span>
                </div>

                <div className="flex items-start space-x-1.5 text-amber-900">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-amber-950">Concession: </strong>
                    {t.concession}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
