"use client";

import React from "react";
import { Check, RefreshCw, Layers, ThumbsUp, ThumbsDown } from "lucide-react";

interface NegotiationControlsBarProps {
  roundNumber: number;
  maxRounds: number;
  isAccepted: boolean;
  isLoading: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRequestNextRound: () => void;
  onOpenCompare: () => void;
  canNegotiateMore: boolean;
}

export function NegotiationControlsBar({
  roundNumber,
  maxRounds,
  isAccepted,
  isLoading,
  onAccept,
  onReject,
  onRequestNextRound,
  onOpenCompare,
  canNegotiateMore,
}: NegotiationControlsBarProps) {
  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center space-x-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-stone-900">Negotiation Status:</span>
          {isAccepted ? (
            <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              <Check className="w-3.5 h-3.5" />
              <span>Consensus Accepted</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              <span>Round {roundNumber} of {maxRounds} Active</span>
            </span>
          )}
        </div>
        <span className="text-stone-400">|</span>
        <span className="text-stone-500 hidden sm:inline">
          {isAccepted
            ? "Proposal finalized. Ready for booking export."
            : canNegotiateMore
            ? "Inspect compromise trade-offs or request another counter-round."
            : "Maximum 3 rounds reached. Please accept or reject final consensus."}
        </span>
      </div>

      <div className="flex items-center space-x-2 text-xs">
        {/* Compare button */}
        <button
          type="button"
          onClick={onOpenCompare}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 font-medium transition-colors shadow-2xs"
        >
          <Layers className="w-3.5 h-3.5 text-stone-600" />
          <span>Compare Matrix</span>
        </button>

        {!isAccepted && canNegotiateMore && (
          <button
            type="button"
            onClick={onRequestNextRound}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-forest-300 bg-forest-50 text-forest-900 hover:bg-forest-100 font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Counter-Round ({roundNumber + 1}/{maxRounds})</span>
          </button>
        )}

        {!isAccepted ? (
          <>
            <button
              type="button"
              onClick={onAccept}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-forest-800 text-white hover:bg-forest-900 font-semibold transition-colors shadow-xs"
            >
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-300" />
              <span>Accept Proposal</span>
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={isLoading}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium"
              title="Reject and reset"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onReject}
            className="text-stone-500 hover:text-stone-800 underline text-xs ml-2"
          >
            Re-open Negotiation
          </button>
        )}
      </div>
    </div>
  );
}
