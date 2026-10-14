import React from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="bg-[#181a15] border-b border-amber-500/30 text-amber-200 px-4 py-1.5 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 font-medium">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong className="font-semibold uppercase tracking-wider text-amber-300">
              Demo Data — Not Live Prices
            </strong>
            : Flight, hotel, and activity offers are simulated catalog entries for algorithmic negotiation.
          </span>
        </div>
        <div className="flex items-center space-x-2 text-amber-300/80">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Strictly Powered by Gemma 4 (<code className="font-mono text-[11px] bg-amber-950/80 border border-amber-500/40 text-amber-200 px-1.5 py-0.5 rounded">gemma-4-26b-a4b-it</code>)</span>
        </div>
      </div>
    </div>
  );
}
