"use client";

import React, { useState } from "react";
import { HotelDirectoryItem, HotelOfferLive, HotelUserEstimate } from "../types";
import {
  X,
  Building2,
  MapPin,
  Star,
  Globe,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface HotelDetailModalProps {
  hotel: HotelDirectoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSelection: (
    hotel: HotelDirectoryItem,
    liveOffer?: HotelOfferLive,
    userEstimate?: HotelUserEstimate
  ) => void;
  checkInDate: string;
  checkOutDate: string;
  nightsCount: number;
  roomCount: number;
  travelerCount: number;
}

export function HotelDetailModal({
  hotel,
  isOpen,
  onClose,
  onConfirmSelection,
  checkInDate,
  checkOutDate,
  nightsCount,
  roomCount,
  travelerCount,
}: HotelDetailModalProps) {
  const [manualRateInput, setManualRateInput] = useState<string>(
    hotel?.userEstimate ? String(hotel.userEstimate.nightlyRateINR) : ""
  );
  const [showRawTags, setShowRawTags] = useState(false);

  if (!isOpen || !hotel) return null;

  const hasLiveOffer = Boolean(hotel.liveOffer);
  const hasUserEstimate = Boolean(hotel.userEstimate);

  const parsedManualRate = parseFloat(manualRateInput);
  const isManualValid = !isNaN(parsedManualRate) && parsedManualRate > 0;

  const handleSelectWithLive = () => {
    if (hotel.liveOffer) {
      onConfirmSelection(hotel, hotel.liveOffer, undefined);
      onClose();
    }
  };

  const handleSelectWithManual = () => {
    if (isManualValid) {
      const userEstimate: HotelUserEstimate = {
        nightlyRateINR: parsedManualRate,
        currency: "INR",
        estimatedBy: "user",
        timestamp: new Date().toISOString(),
        notes: `User-entered nightly estimate of ₹${parsedManualRate.toLocaleString("en-IN")}`,
      };
      onConfirmSelection(hotel, undefined, userEstimate);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131d33] border border-slate-700 max-w-2xl w-full rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-700/80 flex items-start justify-between bg-[#16223d]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {hotel.accommodationType.replace("_", " ")}
              </span>
              <span className="text-xs text-slate-400">
                OSM ID: {hotel.osmType}/{hotel.osmId}
              </span>
              {hotel.stars !== undefined && hotel.stars > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{hotel.stars} Stars</span>
                </div>
              )}
            </div>
            <h3 className="font-serif text-xl font-bold text-white">{hotel.name}</h3>
            {hotel.distanceKm !== undefined && (
              <div className="flex items-center gap-1 text-xs text-emerald-400 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{hotel.distanceKm.toFixed(1)} km from destination coordinate center</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Geographic and Contact Details */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Directory Information
            </h4>

            {hotel.address?.fullText && (
              <div className="text-xs text-slate-300">
                <span className="font-medium text-slate-400">Address: </span>
                {hotel.address.fullText}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {hotel.contact?.phone && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a href={`tel:${hotel.contact.phone}`} className="hover:text-emerald-400 underline">
                    {hotel.contact.phone}
                  </a>
                </div>
              )}

              {hotel.contact?.website && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a
                    href={hotel.contact.website.startsWith("http") ? hotel.contact.website : `https://${hotel.contact.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-400 underline flex items-center gap-1 truncate"
                  >
                    {hotel.contact.website} <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}

              {hotel.wheelchairAccessible && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Wheelchair Accessible
                </div>
              )}
            </div>

            {hotel.amenities && hotel.amenities.length > 0 && (
              <div>
                <div className="text-[11px] text-slate-400 mb-1.5 font-medium">Mapped Amenities:</div>
                <div className="flex flex-wrap gap-1.5">
                  {hotel.amenities.map((amenity, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Amadeus Offer if Available */}
          {hasLiveOffer && hotel.liveOffer && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" /> Live Amadeus Room Offer
                </div>
                <span className="text-[10px] text-emerald-500 font-mono">
                  Verified {hotel.liveOffer.currency}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-400">Room Category:</div>
                  <div className="font-medium text-white">{hotel.liveOffer.roomType || "Standard Room"}</div>
                </div>
                <div>
                  <div className="text-slate-400">Nightly Rate:</div>
                  <div className="font-mono font-bold text-emerald-400">
                    {hotel.liveOffer.currency} {hotel.liveOffer.pricePerNight.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Total Stay ({nightsCount} nights, {roomCount} rooms):</div>
                  <div className="font-mono font-bold text-white text-base">
                    {hotel.liveOffer.currency} {hotel.liveOffer.totalStayPrice.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Taxes & Fees:</div>
                  <div className="text-slate-300">
                    {hotel.liveOffer.taxesIncluded
                      ? "Included in total"
                      : `${hotel.liveOffer.currency} ${hotel.liveOffer.taxesAndFees || 0} extra`}
                  </div>
                </div>
              </div>

              {hotel.liveOffer.cancellationPolicy && (
                <div className="text-xs text-slate-400 border-t border-emerald-500/20 pt-2">
                  <span className="font-medium text-slate-300">Cancellation:</span>{" "}
                  {hotel.liveOffer.cancellationPolicy}
                </div>
              )}

              <button
                type="button"
                onClick={handleSelectWithLive}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow"
              >
                <CheckCircle2 className="w-4 h-4" /> Select with Verified Live Rate
              </button>
            </div>
          )}

          {/* Pricing Status & User Manual Estimation */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {hasLiveOffer
                  ? "Optional: Override with Custom Estimate"
                  : "Directory Listing: Price Not Available"}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              OpenStreetMap is a community-contributed geographical directory and does not contain live commercial prices. To calculate the group trip budget and run negotiation optimization with this property, enter your anticipated nightly rate per room.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Nightly Rate Per Room (₹ INR):
              </label>
              <div className="flex items-center gap-2">
                <div className="relative w-full">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">₹</span>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    placeholder="e.g. 4500"
                    value={manualRateInput}
                    onChange={(e) => setManualRateInput(e.target.value)}
                    className="w-full text-sm pl-7 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={!isManualValid}
                  onClick={handleSelectWithManual}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shrink-0 transition-colors"
                >
                  Apply & Select
                </button>
              </div>
              {isManualValid && (
                <div className="text-[11px] text-teal-400 font-mono">
                  Calculated Stay Total: ₹
                  {(parsedManualRate * nightsCount * roomCount).toLocaleString("en-IN")} ({nightsCount} nights × {roomCount} room{roomCount > 1 ? "s" : ""})
                </div>
              )}
            </div>
          </div>

          {/* Raw OpenStreetMap Tags Accordion */}
          {hotel.rawTags && Object.keys(hotel.rawTags).length > 0 && (
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRawTags(!showRawTags)}
                className="w-full px-3 py-2 bg-slate-900/40 text-left text-xs font-mono text-slate-400 hover:text-white flex items-center justify-between"
              >
                <span>Raw OpenStreetMap Tags ({Object.keys(hotel.rawTags).length})</span>
                <span>{showRawTags ? "Hide ▲" : "Show ▼"}</span>
              </button>
              {showRawTags && (
                <div className="p-3 bg-slate-950/70 text-[11px] font-mono space-y-1 max-h-48 overflow-y-auto divide-y divide-slate-800">
                  {Object.entries(hotel.rawTags).map(([k, v]) => (
                    <div key={k} className="py-1 flex justify-between gap-4">
                      <span className="text-emerald-400 font-medium">{k}</span>
                      <span className="text-slate-300 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attribution Notice */}
          <div className="text-[11px] text-slate-400 italic text-center">
            {hotel.attribution}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#16223d] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
