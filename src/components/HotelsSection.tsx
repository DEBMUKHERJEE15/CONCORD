"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TripSetup,
  HotelDirectoryItem,
  HotelSearchResponse,
  SelectedHotelState,
  HotelAccommodationType,
  HotelOfferLive,
  HotelUserEstimate,
} from "../types";
import { HotelCard } from "./HotelCard";
import { HotelDetailModal } from "./HotelDetailModal";
import {
  Building2,
  Search,
  Filter,
  SlidersHorizontal,
  Compass,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  MapPin,
  RefreshCw,
  Loader2,
  HelpCircle,
  X,
} from "lucide-react";

interface HotelsSectionProps {
  trip: TripSetup;
  onSelectHotel: (selectedState: SelectedHotelState | undefined) => void;
  onUpdateRoomCount: (roomCount: number) => void;
}

export function HotelsSection({
  trip,
  onSelectHotel,
  onUpdateRoomCount,
}: HotelsSectionProps) {
  const [radiusKm, setRadiusKm] = useState<number>(trip.hotelSearchRadiusKm || 5);
  const [accommodationType, setAccommodationType] = useState<HotelAccommodationType | "all">("all");
  const [selectedSort, setSelectedSort] = useState<"distance" | "name" | "stars" | "price">("distance");
  const [minStars, setMinStars] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hotels, setHotels] = useState<HotelDirectoryItem[]>([]);
  const [totalFound, setTotalFound] = useState<number>(0);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [attribution, setAttribution] = useState<string>(
    "Data © OpenStreetMap contributors (ODbL) — community directory"
  );
  const [displayedCount, setDisplayedCount] = useState<number>(12);

  // Modal State
  const [activeModalHotel, setActiveModalHotel] = useState<HotelDirectoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Compute derived dates and rooms
  const nightsCount = (() => {
    try {
      const d1 = new Date(trip.departureDate);
      const d2 = new Date(trip.returnDate);
      const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return isNaN(diff) || diff < 1 ? 1 : diff;
    } catch {
      return 1;
    }
  })();

  const currentRooms = trip.roomCount || Math.max(1, Math.ceil(trip.travelerCount / 2));

  // Resolved coordinates from destination
  const destCoords = trip.destinationDetails?.coordinates;
  // Note: Photon coords are [lon, lat], so lat is [1] and lon is [0]
  const destLat = destCoords ? destCoords[1] : 15.2993; // default Goa lat if not resolved
  const destLon = destCoords ? destCoords[0] : 74.124;  // default Goa lon if not resolved
  const isCoordsVerified = Boolean(destCoords && destCoords.length === 2);

  // Perform Hotel Discovery Search
  const fetchHotels = useCallback(async () => {
    setIsLoading(true);
    setWarningMessage(null);
    try {
      const params = new URLSearchParams({
        lat: String(destLat),
        lon: String(destLon),
        radiusKm: String(radiusKm),
        limit: "50",
        destination: trip.destination,
      });

      if (accommodationType !== "all") {
        params.set("accommodationType", accommodationType);
      }
      if (minStars > 0) {
        params.set("minStars", String(minStars));
      }

      const res = await fetch(`/api/hotels/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Search request failed with HTTP ${res.status}`);
      }

      const data: HotelSearchResponse = await res.json();
      setHotels(data.hotels || []);
      setTotalFound(data.totalFound || 0);
      setAttribution(data.attribution);
      setProviderNotice(data.amadeusNotice || null);
      if (data.warning) {
        setWarningMessage(data.warning);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setWarningMessage(`Could not query OpenStreetMap directory: ${msg}`);
      setHotels([]);
      setTotalFound(0);
    } finally {
      setIsLoading(false);
    }
  }, [destLat, destLon, radiusKm, accommodationType, minStars, trip.destination]);

  // Initial fetch on mount or destination change
  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  // Filter and sort items
  const filteredAndSortedHotels = React.useMemo(() => {
    let result = [...hotels];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.address?.fullText?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (selectedSort === "distance") {
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      }
      if (selectedSort === "name") {
        return a.name.localeCompare(b.name);
      }
      if (selectedSort === "stars") {
        return (b.stars ?? 0) - (a.stars ?? 0);
      }
      if (selectedSort === "price") {
        const priceA = a.liveOffer?.pricePerNight ?? a.userEstimate?.nightlyRateINR ?? 999999;
        const priceB = b.liveOffer?.pricePerNight ?? b.userEstimate?.nightlyRateINR ?? 999999;
        return priceA - priceB;
      }
      return 0;
    });

    return result;
  }, [hotels, searchQuery, selectedSort]);

  // Handle hotel selection confirmation
  const handleHotelSelect = (
    hotel: HotelDirectoryItem,
    liveOffer?: HotelOfferLive,
    userEstimate?: HotelUserEstimate
  ) => {
    let totalStayINR = 0;
    let priceStatus = hotel.priceStatus;

    if (liveOffer) {
      totalStayINR = Math.round(liveOffer.totalStayPrice);
      priceStatus = "live_offer";
    } else if (userEstimate) {
      totalStayINR = Math.round(userEstimate.nightlyRateINR * nightsCount * currentRooms);
      priceStatus = "user_estimate";
    }

    onSelectHotel({
      directoryItem: hotel,
      selectedOffer: liveOffer,
      userEstimate,
      totalStayINR,
      priceStatus,
      checkInDate: trip.departureDate,
      checkOutDate: trip.returnDate,
      roomCount: currentRooms,
      guestsCount: trip.travelerCount,
      distanceKm: hotel.distanceKm,
    });
  };

  const handleManualQuickEstimate = (hotel: HotelDirectoryItem, nightlyRateINR: number) => {
    const userEstimate: HotelUserEstimate = {
      nightlyRateINR,
      currency: "INR",
      estimatedBy: "user",
      timestamp: new Date().toISOString(),
      notes: `User nightly estimate of ₹${nightlyRateINR.toLocaleString("en-IN")}`,
    };
    handleHotelSelect(hotel, undefined, userEstimate);
  };

  return (
    <div className="space-y-6">
      {/* Banner: Currently Selected Hotel if any */}
      {trip.selectedHotel && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-200 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                  Currently Selected Hotel
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase">
                  {trip.selectedHotel.priceStatus.replace("_", " ")}
                </span>
              </div>
              <h4 className="font-serif text-lg font-bold text-white">
                {trip.selectedHotel.directoryItem.name}
              </h4>
              <p className="text-xs text-slate-400">
                {trip.selectedHotel.directoryItem.address?.fullText || trip.destination} •{" "}
                {nightsCount} nights • {currentRooms} room{currentRooms > 1 ? "s" : ""} •{" "}
                {trip.travelerCount} guests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Stay Total</div>
              <div className="text-lg font-bold font-mono text-white">
                ₹{trip.selectedHotel.totalStayINR.toLocaleString("en-IN")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectHotel(undefined)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Remove hotel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search Header and Context */}
      <div className="bg-[#131d33] border border-slate-700/60 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <h3 className="font-serif text-xl font-bold text-white">Worldwide Hotel Discovery</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Search mapped hotels, hostels, and resorts around{" "}
              <span className="text-emerald-400 font-semibold">{trip.destination}</span> via OpenStreetMap Overpass API. No commercial key required.
            </p>
          </div>

          {/* Coordinates indicator */}
          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2 self-start lg:self-center">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isCoordsVerified
                ? `Center: ${destLat.toFixed(4)}°N, ${destLon.toFixed(4)}°E (Photon)`
                : `Center: ${destLat.toFixed(4)}°N, ${destLon.toFixed(4)}°E (Baseline)`}
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-700/60 text-xs">
          {/* Search Query */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-slate-400 mb-1">Search by Name or Street</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter hotel names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Radius selector */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Search Radius</label>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value={2}>2 km (Walking center)</option>
              <option value={5}>5 km (Standard area)</option>
              <option value={10}>10 km (Wider district)</option>
              <option value={25}>25 km (Greater region)</option>
            </select>
          </div>

          {/* Accommodation Type */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Accommodation Type</label>
            <select
              value={accommodationType}
              onChange={(e) => setAccommodationType(e.target.value as HotelAccommodationType | "all")}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 capitalize"
            >
              <option value="all">All Types</option>
              <option value="hotel">Hotels</option>
              <option value="resort">Resorts</option>
              <option value="hostel">Hostels</option>
              <option value="guest_house">Guest Houses</option>
              <option value="apartment">Apartments</option>
              <option value="bed_and_breakfast">Bed & Breakfast</option>
            </select>
          </div>

          {/* Room Count Selector */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Rooms Needed</label>
            <select
              value={currentRooms}
              onChange={(e) => onUpdateRoomCount(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                <option key={num} value={num}>
                  {num} Room{num > 1 ? "s" : ""} ({Math.round((trip.travelerCount / num) * 10) / 10} travelers/room)
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Sort Results By</label>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value as "distance" | "name" | "stars" | "price")}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="distance">Distance (Closest)</option>
              <option value="stars">Star Rating (High to Low)</option>
              <option value="price">Price (Low to High)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Refresh and Provider Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchHotels}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Querying Overpass...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Directory
                </>
              )}
            </button>
            <span className="text-slate-400">
              Found <strong className="text-white">{filteredAndSortedHotels.length}</strong> mapped properties
            </span>
          </div>

          {providerNotice && (
            <div className="text-[11px] text-slate-400 italic">
              {providerNotice}
            </div>
          )}
        </div>

        {/* Warning Banner if API error or fallback */}
        {warningMessage && (
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-600/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{warningMessage}</span>
          </div>
        )}
      </div>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800 bg-[#131d33] p-5 space-y-3 animate-pulse"
            >
              <div className="h-4 bg-slate-800 rounded w-1/3" />
              <div className="h-5 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
              <div className="h-10 bg-slate-900 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredAndSortedHotels.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-slate-800 bg-[#131d33] p-10 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-500 mx-auto" />
          <h4 className="font-serif text-lg font-bold text-white">No Accommodation Properties Found</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No properties were found within {radiusKm} km of {trip.destination} matching your filters.
            Try expanding the search radius to 10 km or 25 km, or reset the type filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setRadiusKm(25);
              setAccommodationType("all");
              setMinStars(0);
              setSearchQuery("");
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold"
          >
            Expand Radius to 25 km & Reset Filters
          </button>
        </div>
      ) : (
        /* Hotel Cards Grid */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedHotels.slice(0, displayedCount).map((hotel) => {
              const isSelected = trip.selectedHotel?.directoryItem.id === hotel.id;
              return (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  isSelected={isSelected}
                  onSelect={() => handleHotelSelect(hotel, hotel.liveOffer, hotel.userEstimate)}
                  onViewDetails={() => {
                    setActiveModalHotel(hotel);
                    setIsModalOpen(true);
                  }}
                  onSaveManualEstimate={(rate) => handleManualQuickEstimate(hotel, rate)}
                />
              );
            })}
          </div>

          {/* Load More Button */}
          {filteredAndSortedHotels.length > displayedCount && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setDisplayedCount((prev) => prev + 12)}
                className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Load More Hotels ({displayedCount} of {filteredAndSortedHotels.length} shown)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Attribution and Legal Notice Footer */}
      <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-slate-800">
        <p>{attribution}</p>
        <p className="mt-0.5 text-slate-500">
          OpenStreetMap data is mapped by community contributors and does not represent real-time inventory availability. Live pricing requires an active Amadeus provider configuration.
        </p>
      </div>

      {/* Detail & Estimate Modal */}
      <HotelDetailModal
        hotel={activeModalHotel}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveModalHotel(null);
        }}
        onConfirmSelection={handleHotelSelect}
        checkInDate={trip.departureDate}
        checkOutDate={trip.returnDate}
        nightsCount={nightsCount}
        roomCount={currentRooms}
        travelerCount={trip.travelerCount}
      />
    </div>
  );
}
