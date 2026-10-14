"use client";

import React from "react";
import { SavedTripSession } from "@/types";
import { X, Bookmark, Trash2, ArrowRight, FolderOpen, Plus } from "lucide-react";

interface SavedTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedTrips: SavedTripSession[];
  onLoadTrip: (session: SavedTripSession) => void;
  onDeleteTrip: (id: string) => void;
  onStartNewTrip: () => void;
}

export function SavedTripsModal({
  isOpen,
  onClose,
  savedTrips,
  onLoadTrip,
  onDeleteTrip,
  onStartNewTrip,
}: SavedTripsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#131d33] rounded-2xl border border-slate-700 shadow-2xl max-w-lg w-full p-6 space-y-4 my-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-5 h-5 text-emerald-400" />
            <h3 className="font-serif text-lg font-bold text-slate-100">
              My Saved Trip Plans
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-300">
          Saved in your browser&apos;s local storage. Reopen a previous negotiation or start fresh.
        </div>

        {savedTrips.length === 0 ? (
          <div className="p-8 text-center bg-[#0f172a] rounded-xl border border-dashed border-slate-700 text-slate-400 text-xs space-y-2">
            <FolderOpen className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="font-semibold text-slate-200">No saved trip plans yet</p>
            <p className="text-[11px] text-slate-400">
              When you choose or agree on an itinerary, click &ldquo;Save Plan&rdquo; to store it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {savedTrips.map((session) => (
              <div
                key={session.id}
                className="bg-[#1a233b] p-3.5 rounded-xl border border-slate-700/80 hover:border-emerald-500/50 transition-colors flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="truncate">
                  <h4 className="font-bold text-slate-100 text-xs truncate">{session.name}</h4>
                  <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
                    <span>
                      {session.trip.origin} → {session.trip.destination}
                    </span>
                    <span>• ₹{session.trip.sharedBudgetINR.toLocaleString("en-IN")}</span>
                    <span>• {session.trip.travelerCount} travelers</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Saved: {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onLoadTrip(session);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold hover:bg-emerald-500 transition-colors flex items-center space-x-1"
                  >
                    <span>Load</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteTrip(session.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
                    title="Delete plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
          <button
            type="button"
            onClick={() => {
              onStartNewTrip();
              onClose();
            }}
            className="flex items-center space-x-1.5 text-emerald-400 font-semibold hover:underline"
          >
            <Plus className="w-4 h-4" />
            <span>Start Blank Trip Plan</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
