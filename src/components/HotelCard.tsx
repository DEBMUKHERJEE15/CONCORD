"use client";

import React, { useState } from "react";
import { HotelDirectoryItem } from "../types";
import {
  Building2,
  MapPin,
  Star,
  Globe,
  Phone,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
} from "lucide-react";

interface HotelCardProps {
  hotel: HotelDirectoryItem;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
  onSaveManualEstimate: (nightlyRateINR: number) => void;
}

export function HotelCard({
  hotel,
  isSelected,
  onSelect,
  onViewDetails,
  onSaveManualEstimate,
}: HotelCardProps) {
  const [showQuickEstimate, setShowQuickEstimate] = useState(false);
  const [estimateInput, setEstimateInput] = useState<string>("");

  const hasLiveOffer = Boolean(hotel.liveOffer);
  const hasUserEstimate = Boolean(hotel.userEstimate);
  const isPriced = hasLiveOffer || hasUserEstimate;

  const handleEstimateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(estimateInput);
    if (!isNaN(parsed) && parsed > 0) {
      onSaveManualEstimate(parsed);
      setShowQuickEstimate(false);
    }
  };

  const getAccommodationBadgeClass = (type: string) => {
    switch (type.toLowerCase()) {
      case "resort":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "hostel":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "apartment":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "guest_house":
      case "bed_and_breakfast":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-slate-700/40 text-slate-300 border-slate-600/30";
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 p-4 flex flex-col justify-between ${
        isSelected
          ? "bg-[#16223d] border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg"
          : "bg-[#131d33] border-slate-700/60 hover:border-slate-600 hover:bg-[#15203a]"
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded border capitalize ${getAccommodationBadgeClass(
                hotel.accommodationType
              )}`}
            >
              {hotel.accommodationType.replace("_", " ")}
            </span>

            {/* Price Status Badge */}
            {hasLiveOffer ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Live Offer Available
              </span>
            ) : hasUserEstimate ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> User Estimate
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Price Not Available
              </span>
            )}
          </div>

          {/* Star Rating if present */}
          {hotel.stars !== undefined && hotel.stars > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{hotel.stars}★</span>
            </div>
          )}
        </div>

        {/* Hotel Name */}
        <h4 className="font-serif text-base font-bold text-white line-clamp-2 mb-1">
          {hotel.name}
        </h4>

        {/* Distance & Address */}
        <div className="space-y-1 mb-3 text-xs text-slate-400">
          {hotel.distanceKm !== undefined && (
            <div className="flex items-center gap-1 text-emerald-400 font-medium">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{hotel.distanceKm.toFixed(1)} km from destination center</span>
            </div>
          )}

          {hotel.address?.fullText && (
            <div className="line-clamp-2 text-slate-400 text-[11px]">
              {hotel.address.fullText}
            </div>
          )}
        </div>

        {/* Amenities Preview */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {hotel.amenities.slice(0, 3).map((amenity, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50"
              >
                {amenity}
              </span>
            ))}
            {hotel.amenities.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                +{hotel.amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Contact Links */}
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
          {hotel.contact?.website && (
            <a
              href={hotel.contact.website.startsWith("http") ? hotel.contact.website : `https://${hotel.contact.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
            >
              <Globe className="w-3 h-3 text-slate-400" /> Website
            </a>
          )}
          {hotel.contact?.phone && (
            <a
              href={`tel:${hotel.contact.phone}`}
              className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
            >
              <Phone className="w-3 h-3 text-slate-400" /> {hotel.contact.phone}
            </a>
          )}
        </div>
      </div>

      {/* Pricing and Action Footer */}
      <div className="pt-3 border-t border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            {hasLiveOffer && hotel.liveOffer ? (
              <div>
                <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Live Rate</div>
                <div className="text-base font-bold font-mono text-white">
                  ₹{Math.round(hotel.liveOffer.pricePerNight).toLocaleString("en-IN")}{" "}
                  <span className="text-xs text-slate-400 font-sans font-normal">/ night</span>
                </div>
              </div>
            ) : hasUserEstimate && hotel.userEstimate ? (
              <div>
                <div className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold">Manual Est.</div>
                <div className="text-base font-bold font-mono text-white">
                  ₹{hotel.userEstimate.nightlyRateINR.toLocaleString("en-IN")}{" "}
                  <span className="text-xs text-slate-400 font-sans font-normal">/ night</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Pricing</div>
                <div className="text-xs font-medium text-amber-300">Directory listing only</div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onViewDetails}
            className="text-xs text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            Details
          </button>
        </div>

        {/* Quick manual estimate form toggle if unpriced */}
        {showQuickEstimate ? (
          <form onSubmit={handleEstimateSubmit} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="500"
                step="100"
                placeholder="Rate/night (₹)"
                value={estimateInput}
                onChange={(e) => setEstimateInput(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Tagged as <span className="text-teal-400 font-semibold">USER ESTIMATE — NOT LIVE PRICES</span>
            </p>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            {isPriced ? (
              <button
                type="button"
                onClick={onSelect}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-md cursor-default"
                    : "bg-slate-800 hover:bg-emerald-600/90 text-slate-200 hover:text-white border border-slate-700"
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Selected for Trip
                  </>
                ) : (
                  "Select Hotel"
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowQuickEstimate(true)}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Set Nightly Estimate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
