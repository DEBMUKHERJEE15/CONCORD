"use client";

import React, { useState } from "react";
import { ItineraryCandidate, TravelerProfile } from "@/types";
import {
  X,
  Calendar,
  Clock,
  Car,
  Hotel,
  Compass,
  Utensils,
  Sun,
  Sunset,
  Moon,
  Coffee,
  CheckCircle,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";

interface ItineraryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: ItineraryCandidate;
  travelers: TravelerProfile[];
  onChooseThisPlan: () => void;
}

export function ItineraryDetailModal({
  isOpen,
  onClose,
  candidate,
  travelers,
  onChooseThisPlan,
}: ItineraryDetailModalProps) {
  const [activeDay, setActiveDay] = useState<number>(1);

  if (!isOpen) return null;

  const currentDaySchedule = candidate.daysSchedule.find((d) => d.dayNumber === activeDay) || candidate.daysSchedule[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-surface rounded-2xl border border-surface-border shadow-2xl max-w-4xl w-full p-5 sm:p-7 space-y-5 my-6 max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-surface-border pb-4 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-forest-100 text-forest-800 px-2 py-0.5 rounded">
                {candidate.strategyLabel}
              </span>
              <span className="text-xs text-stone-500 font-mono">
                {candidate.daysCount} Days / {candidate.daysCount - 1} Nights
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-forest-950 mt-1">
              {candidate.label}
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              {candidate.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cost & Metrics Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
          <div>
            <span className="text-[10px] text-stone-500 block uppercase font-semibold">Total Group Cost</span>
            <span className="font-mono text-base font-bold text-forest-950">
              ₹{candidate.costBreakdown.grandTotalINR.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 block uppercase font-semibold">Per Person Rate</span>
            <span className="font-mono text-base font-bold text-stone-800">
              ₹{candidate.costBreakdown.costPerPersonINR.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 block uppercase font-semibold">Remaining Buffer</span>
            <span
              className={`font-mono text-base font-bold ${
                candidate.costBreakdown.remainingBudgetINR >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              +₹{candidate.costBreakdown.remainingBudgetINR.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 block uppercase font-semibold">Average Transit</span>
            <span className="font-mono text-base font-bold text-stone-800">
              ~{candidate.metrics.averageTransitMinutesPerDay} m/day
            </span>
          </div>
        </div>

        {/* Day Selector Tabs */}
        <div className="flex items-center space-x-2 border-b border-surface-border pb-2 overflow-x-auto">
          {candidate.daysSchedule.map((d) => (
            <button
              key={d.dayNumber}
              onClick={() => setActiveDay(d.dayNumber)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeDay === d.dayNumber
                  ? "bg-forest-800 text-white shadow-xs"
                  : "bg-surface-subtle text-stone-600 hover:bg-surface-muted"
              }`}
            >
              Day {d.dayNumber} ({d.dateStr})
            </button>
          ))}
        </div>

        {/* Selected Day Schedule */}
        {currentDaySchedule && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-bold text-forest-950">
                  {currentDaySchedule.title}
                </h3>
                <span className="text-xs text-stone-500">Theme: {currentDaySchedule.theme}</span>
              </div>
              <div className="text-right text-xs">
                <span className="text-stone-500 text-[11px] block">Day Transit Load:</span>
                <span className="font-mono font-semibold text-stone-800">
                  {currentDaySchedule.dailyTransitMinutes} mins total
                </span>
              </div>
            </div>

            {/* Morning Slot */}
            <div className="bg-white p-3.5 rounded-xl border border-surface-border space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-600" /> Morning: {currentDaySchedule.morning.timeSlot}
                </span>
                <span className="font-mono text-[11px] text-stone-600">
                  {currentDaySchedule.morning.costPerPersonINR > 0
                    ? `₹${currentDaySchedule.morning.costPerPersonINR}/p`
                    : "Included / Transit"}
                </span>
              </div>
              <h4 className="font-bold text-stone-900 text-xs">{currentDaySchedule.morning.title}</h4>
              <p className="text-stone-600 text-[11px] leading-relaxed">{currentDaySchedule.morning.description}</p>
              {currentDaySchedule.morning.transitMinutes > 0 && (
                <div className="text-[10px] text-stone-500 font-mono">
                  Transit duration: ~{currentDaySchedule.morning.transitMinutes} minutes
                </div>
              )}
            </div>

            {/* Afternoon Slot (Rest / Activity) */}
            <div
              className={`p-3.5 rounded-xl border space-y-1.5 shadow-2xs ${
                currentDaySchedule.afternoon.isRest
                  ? "bg-purple-50/50 border-purple-200"
                  : "bg-white border-surface-border"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span
                  className={`flex items-center gap-1.5 ${
                    currentDaySchedule.afternoon.isRest ? "text-purple-900" : "text-amber-900"
                  }`}
                >
                  {currentDaySchedule.afternoon.isRest ? (
                    <Coffee className="w-4 h-4 text-purple-600" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-600" />
                  )}
                  Afternoon: {currentDaySchedule.afternoon.timeSlot}
                </span>
                {currentDaySchedule.afternoon.isRest ? (
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Dedicated Rest Block
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-stone-600">
                    ₹{currentDaySchedule.afternoon.costPerPersonINR}/p
                  </span>
                )}
              </div>
              <h4 className="font-bold text-stone-900 text-xs">{currentDaySchedule.afternoon.title}</h4>
              <p className="text-stone-600 text-[11px] leading-relaxed">{currentDaySchedule.afternoon.description}</p>
            </div>

            {/* Evening Slot */}
            <div className="bg-white p-3.5 rounded-xl border border-surface-border space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                <span className="flex items-center gap-1.5">
                  <Sunset className="w-4 h-4 text-blue-600" /> Evening: {currentDaySchedule.evening.timeSlot}
                </span>
                <span className="font-mono text-[11px] text-stone-600">
                  {currentDaySchedule.evening.costPerPersonINR > 0
                    ? `₹${currentDaySchedule.evening.costPerPersonINR}/p`
                    : "Included / Leisure"}
                </span>
              </div>
              <h4 className="font-bold text-stone-900 text-xs">{currentDaySchedule.evening.title}</h4>
              <p className="text-stone-600 text-[11px] leading-relaxed">{currentDaySchedule.evening.description}</p>
            </div>
          </div>
        )}

        {/* Accommodation & Transport Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface-subtle p-3.5 rounded-xl border border-surface-border">
          <div className="flex items-start space-x-2">
            <Hotel className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-900 block font-semibold">Accommodation Base:</strong>
              <span>
                {candidate.hotel.name} ({candidate.hotel.stars}★, {candidate.hotel.category}) in {candidate.hotel.locationArea}.
              </span>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Car className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-900 block font-semibold">Transit Fleet:</strong>
              <span>
                {candidate.transport.name} (~{candidate.metrics.averageTransitMinutesPerDay} m/day average).
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-surface-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
          >
            Close Details
          </button>

          <button
            type="button"
            onClick={() => {
              onChooseThisPlan();
              onClose();
            }}
            disabled={!candidate.isFeasible}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-forest-800 text-white hover:bg-forest-900 transition-colors shadow-xs disabled:opacity-50"
          >
            Choose This Plan (Agree Consensus)
          </button>
        </div>
      </div>
    </div>
  );
}
