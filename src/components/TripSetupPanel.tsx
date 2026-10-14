"use client";

import React, { useState } from "react";
import { TripSetup } from "@/types";
import { MapPin, Calendar, Users, IndianRupee, Tag, Plus, X } from "lucide-react";
import { DestinationAutocomplete } from "./DestinationAutocomplete";

interface TripSetupPanelProps {
  trip: TripSetup;
  onChange: (updated: TripSetup) => void;
  disabled?: boolean;
}

export function TripSetupPanel({ trip, onChange, disabled }: TripSetupPanelProps) {
  const [newInterest, setNewInterest] = useState("");

  const handleAddInterest = () => {
    if (newInterest.trim() && !trip.interests.includes(newInterest.trim())) {
      onChange({
        ...trip,
        interests: [...trip.interests, newInterest.trim()],
      });
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (tag: string) => {
    onChange({
      ...trip,
      interests: trip.interests.filter((i) => i !== tag),
    });
  };

  return (
    <div className="bg-[#131d33] rounded-2xl border border-slate-700/80 p-5 shadow-lg text-slate-100">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-slate-100">
              Trip Setup & Budget
            </h2>
            <p className="text-xs text-slate-400">
              Core travel parameters and shared financial ceiling
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded font-bold">
          {trip.travelerCount} Travelers
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Origin City */}
        <div>
          <DestinationAutocomplete
            id="panel-origin"
            label="Departure City (Origin)"
            placeholder="Search origin..."
            value={trip.origin}
            selectedDestination={trip.originDetails}
            onChange={(text, details) => {
              onChange({
                ...trip,
                origin: text,
                originDetails: details,
              });
            }}
            theme="dark"
            disabled={disabled}
            required
          />
        </div>

        {/* Destination City */}
        <div>
          <DestinationAutocomplete
            id="panel-dest"
            label="Worldwide Destination"
            placeholder="Search destination..."
            value={trip.destination}
            selectedDestination={trip.destinationDetails}
            onChange={(text, details) => {
              onChange({
                ...trip,
                destination: text,
                destinationDetails: details,
              });
            }}
            theme="dark"
            disabled={disabled}
            required
          />
        </div>

        {/* Departure & Return Dates */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Travel Dates
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={trip.departureDate}
              disabled={disabled}
              onChange={(e) => onChange({ ...trip, departureDate: e.target.value })}
              className="px-2.5 py-2 border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="date"
              value={trip.returnDate}
              disabled={disabled}
              onChange={(e) => onChange({ ...trip, returnDate: e.target.value })}
              className="px-2.5 py-2 border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Shared Total Budget in INR */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-amber-400" /> Shared Total Budget (INR)
          </label>
          <div className="relative">
            <input
              type="number"
              step="5000"
              min="20000"
              value={trip.sharedBudgetINR}
              disabled={disabled}
              onChange={(e) => onChange({ ...trip, sharedBudgetINR: Number(e.target.value) })}
              className="w-full px-2.5 py-2 border border-slate-700 rounded-lg bg-[#0f172a] focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-emerald-400"
            />
            <span className="absolute right-2 top-2 text-[11px] text-slate-400">
              ₹{(trip.sharedBudgetINR / trip.travelerCount).toLocaleString("en-IN")}/person
            </span>
          </div>
        </div>

        {/* Travel Style */}
        <div className="md:col-span-2">
          <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-emerald-400" /> Travel Style & Scope
          </label>
          <input
            type="text"
            value={trip.travelStyle}
            disabled={disabled}
            onChange={(e) => onChange({ ...trip, travelStyle: e.target.value })}
            className="w-full px-2.5 py-2 border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            placeholder="e.g. Balanced exploration, coastal relaxation, culture"
          />
        </div>

        {/* Number of Travelers */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-400" /> Number of Travelers
          </label>
          <input
            type="number"
            min={2}
            max={8}
            value={trip.travelerCount}
            disabled={true}
            className="w-full px-2.5 py-2 border border-slate-700 rounded-lg bg-[#0f172a]/60 text-slate-400 font-medium cursor-not-allowed"
          />
          <span className="text-[10px] text-slate-400">4 distinct traveler archetypes</span>
        </div>
      </div>

      {/* Shared Interests Tags */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <label className="block text-slate-300 font-semibold text-xs mb-1.5">
          Shared Group Interests:
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {trip.interests.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#1a233b] border border-slate-700 text-slate-200 text-xs font-medium"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(tag)}
                  className="text-slate-400 hover:text-rose-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          {!disabled && (
            <div className="inline-flex items-center space-x-1">
              <input
                type="text"
                placeholder="Add interest tag..."
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
                className="px-2.5 py-1 text-xs border border-slate-700 rounded-lg bg-[#0f172a] text-slate-200 w-36 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
              />
              <button
                type="button"
                onClick={handleAddInterest}
                className="p-1 rounded-lg bg-[#1a233b] border border-slate-700 hover:bg-slate-800 text-slate-300"
                title="Add tag"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
