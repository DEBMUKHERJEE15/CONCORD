"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Compass,
  ArrowRight,
  ShieldCheck,
  Scale,
  Calendar,
  Users,
  IndianRupee,
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Search,
} from "lucide-react";
import { DestinationAutocomplete } from "@/components/DestinationAutocomplete";
import { DestinationObject, TripSetup } from "@/types";

interface LandingPageProps {
  onStartPlanning: (customSetup?: Partial<TripSetup>) => void;
  onExploreSample: () => void;
}

interface DestinationCardData {
  id: string;
  name: string;
  country: string;
  moods: string[];
  category: "beach" | "culture" | "mountain" | "food";
  estimatedPerPersonRange: string;
  durationDays: number;
  description: string;
  bestFor: string;
  curated: boolean;
}

const DESTINATION_CARDS: DestinationCardData[] = [
  {
    id: "dest-tokyo",
    name: "Tokyo",
    country: "Japan",
    moods: ["Culture", "Tech Art", "Ramen & Kaiseki"],
    category: "culture",
    estimatedPerPersonRange: "₹85,000 – ₹1,35,000",
    durationDays: 5,
    description: "4★ Shinjuku boutique hotel, high-speed subway passes, and iconic sights from teamLab Planets to Senso-ji.",
    bestFor: "Explorers & Foodies",
    curated: true,
  },
  {
    id: "dest-paris",
    name: "Paris",
    country: "France",
    moods: ["Art & Museums", "Seine Sunset", "Bistros"],
    category: "culture",
    estimatedPerPersonRange: "₹95,000 – ₹1,55,000",
    durationDays: 5,
    description: "Le Marais boutique stay, central taxi/rideshare pass, Louvre treasures, and evening river cruise.",
    bestFor: "Art Lovers & Slow Travelers",
    curated: true,
  },
  {
    id: "dest-goa",
    name: "Goa",
    country: "India",
    moods: ["Beach Relaxation", "Seafood", "Heritage"],
    category: "beach",
    estimatedPerPersonRange: "₹25,000 – ₹42,000",
    durationDays: 5,
    description: "Candolim courtyard heritage villa, private chauffeur Innova, catamaran sunset sailing, and Latin quarter walk.",
    bestFor: "Relaxation & Balanced Groups",
    curated: true,
  },
  {
    id: "dest-jaipur",
    name: "Jaipur",
    country: "India",
    moods: ["Royal Forts", "Palace Haveli", "Thali"],
    category: "culture",
    estimatedPerPersonRange: "₹22,000 – ₹36,000",
    durationDays: 4,
    description: "Courtyard haveli in Bani Park, dedicated tourist van, Amber Fort, and Nahargarh sunset dining.",
    bestFor: "Heritage & Culture Enthusiasts",
    curated: true,
  },
  {
    id: "dest-kolkata",
    name: "Kolkata",
    country: "India",
    moods: ["Colonial Heritage", "Street Food", "Art"],
    category: "food",
    estimatedPerPersonRange: "₹18,000 – ₹30,000",
    durationDays: 4,
    description: "Elgin Fairlawn heritage boutique stay, dedicated AC coach, Victoria Memorial, and artisanal Kumartuli.",
    bestFor: "Foodies & Budget Guardians",
    curated: true,
  },
  {
    id: "dest-london",
    name: "London",
    country: "United Kingdom",
    moods: ["West End", "Historic Castles", "Pubs"],
    category: "culture",
    estimatedPerPersonRange: "₹1,10,000 – ₹1,75,000",
    durationDays: 5,
    description: "Bloomsbury boutique stay, Visitor Oyster card pass, Tower of London, and traditional afternoon tea.",
    bestFor: "Explorers & City Lovers",
    curated: true,
  },
  {
    id: "dest-amalfi",
    name: "Amalfi Coast",
    country: "Italy",
    moods: ["Cliffside Views", "Mediterranean", "Wine"],
    category: "beach",
    estimatedPerPersonRange: "₹1,20,000 – ₹1,80,000",
    durationDays: 5,
    description: "Coastal boutique villa with sea views, private minivan transfers, and scenic lemon grove dining.",
    bestFor: "Comfort Seekers & Romantic Escapes",
    curated: false,
  },
  {
    id: "dest-reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    moods: ["Geothermal Lagoons", "Waterfalls", "Nature"],
    category: "mountain",
    estimatedPerPersonRange: "₹1,30,000 – ₹1,95,000",
    durationDays: 5,
    description: "Geothermal eco-lodge, all-terrain group transit, Golden Circle circuit, and blue lagoon soak.",
    bestFor: "Adventure & Low-Fatigue Rest",
    curated: false,
  },
];

interface WeekendEscapeTemplate {
  title: string;
  destination: string;
  duration: string;
  tag: string;
  budgetPerPerson: string;
  highlight: string;
}

const WEEKEND_ESCAPES: WeekendEscapeTemplate[] = [
  {
    title: "Goa 3-Day Coastal Reset",
    destination: "Goa",
    duration: "3 Days / 2 Nights",
    tag: "Beach & Chill",
    budgetPerPerson: "₹18,500 / person",
    highlight: "Candolim boutique villa, dedicated chauffeur, catamaran sunset, and coastal thali.",
  },
  {
    title: "Jaipur 3-Day Royal Whirlwind",
    destination: "Jaipur",
    duration: "3 Days / 2 Nights",
    tag: "Royal Forts",
    budgetPerPerson: "₹16,000 / person",
    highlight: "Heritage haveli courtyard, dedicated AC van, Amber fort guided tour, and Chokhi Dhani evening.",
  },
  {
    title: "Kolkata 3-Day Heritage & Food Trail",
    destination: "Kolkata",
    duration: "3 Days / 2 Nights",
    tag: "Food & Walk",
    budgetPerPerson: "₹14,500 / person",
    highlight: "Park Street stay, colonial walk, Howrah ferry boat, and authentic Bengali bhoj banquet.",
  },
];

export function LandingPage({ onStartPlanning, onExploreSample }: LandingPageProps) {
  // Hero Quick Search State
  const [heroOrigin, setHeroOrigin] = useState("Mumbai");
  const [heroOriginDetails, setHeroOriginDetails] = useState<DestinationObject | undefined>(undefined);
  const [heroDestination, setHeroDestination] = useState("Goa");
  const [heroDestinationDetails, setHeroDestinationDetails] = useState<DestinationObject | undefined>(undefined);
  const [heroDepDate, setHeroDepDate] = useState("2026-11-12");
  const [heroRetDate, setHeroRetDate] = useState("2026-11-16");
  const [heroTravelers, setHeroTravelers] = useState(4);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>("all");

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartPlanning({
      origin: heroOrigin,
      originDetails: heroOriginDetails,
      destination: heroDestination,
      destinationDetails: heroDestinationDetails,
      departureDate: heroDepDate,
      returnDate: heroRetDate,
      travelerCount: heroTravelers,
    });
  };

  const filteredCards = selectedMoodFilter === "all"
    ? DESTINATION_CARDS
    : DESTINATION_CARDS.filter((c) => c.category === selectedMoodFilter);

  return (
    <div className="space-y-16 py-6 sm:py-10 text-slate-100">
      {/* 1. Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 px-4">
        <div className="inline-flex items-center space-x-2 bg-emerald-950/70 border border-emerald-500/30 px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-300 shadow-sm backdrop-blur-xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Powered by Google Gemma 4 & Deterministic Optimization</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-100 leading-[1.15]">
          Explore the world. <br />
          <span className="text-emerald-400 underline decoration-amber-400 decoration-4 underline-offset-8">
            Plan together.
          </span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Concord resolves budget and style conflicts across group travelers with transparent trade-offs and zero guesswork. Turn differing priorities into a trip everyone can agree on.
        </p>

        {/* Interactive Quick Search Bar with Photon Autocomplete */}
        <div className="max-w-4xl mx-auto mt-8 bg-[#131d33] border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl text-left backdrop-blur-md">
          <form onSubmit={handleHeroSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Origin Autocomplete */}
              <div>
                <DestinationAutocomplete
                  id="hero-origin-search"
                  label="Departure City (Origin)"
                  placeholder="e.g. Mumbai, London, New York..."
                  value={heroOrigin}
                  selectedDestination={heroOriginDetails}
                  onChange={(text, obj) => {
                    setHeroOrigin(text);
                    setHeroOriginDetails(obj);
                  }}
                  theme="dark"
                  required
                />
              </div>

              {/* Destination Autocomplete */}
              <div>
                <DestinationAutocomplete
                  id="hero-dest-search"
                  label="Worldwide Destination"
                  placeholder="e.g. Tokyo, Paris, Goa, Jaipur..."
                  value={heroDestination}
                  selectedDestination={heroDestinationDetails}
                  onChange={(text, obj) => {
                    setHeroDestination(text);
                    setHeroDestinationDetails(obj);
                  }}
                  theme="dark"
                  required
                />
              </div>

              {/* Dates */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Travel Dates
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={heroDepDate}
                    onChange={(e) => setHeroDepDate(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg bg-[#0f172a] border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <input
                    type="date"
                    value={heroRetDate}
                    onChange={(e) => setHeroRetDate(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg bg-[#0f172a] border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Travelers */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-400" /> Party Size
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={heroTravelers}
                    onChange={(e) => setHeroTravelers(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-slate-700 text-slate-200 text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value={2}>2 Travelers (Duo)</option>
                    <option value={3}>3 Travelers (Trio)</option>
                    <option value={4}>4 Travelers (Core 4 Archetypes)</option>
                    <option value={5}>5 Travelers</option>
                    <option value={6}>6 Travelers</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Global search powered by Photon / OpenStreetMap. No Google API key required.
              </span>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-98"
              >
                <span>Plan This Trip</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 2. Curated by Mood Filter & Trending Destinations */}
      <section className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Curated Worldwide Escapes
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-100 mt-1">
              Trending Group Destinations
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Explore conflict-free itineraries with pre-calculated compromise options
            </p>
          </div>

          {/* Mood Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Destinations" },
              { id: "culture", label: "Cultural Capitals" },
              { id: "beach", label: "Beach & Coast" },
              { id: "food", label: "Foodie Hotspots" },
              { id: "mountain", label: "Nature & Escapes" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedMoodFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedMoodFilter === f.id
                    ? "bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-bold"
                    : "bg-[#131d33] border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Destination Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="bg-[#131d33] border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition-all shadow-md group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                      {card.name}
                    </h3>
                    <span className="text-xs text-slate-400">{card.country}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    card.curated
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : "bg-blue-950/60 border-blue-500/40 text-blue-300"
                  }`}>
                    {card.curated ? "Curated Offers" : "Live Estimates"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {card.moods.map((mood) => (
                    <span
                      key={mood}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#0f172a] border border-slate-700 text-slate-300"
                    >
                      {mood}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {card.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Est. / person:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {card.estimatedPerPersonRange}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onStartPlanning({
                      destination: card.name,
                      origin: "Mumbai",
                    })
                  }
                  className="w-full py-2 px-3 rounded-xl bg-[#1a233b] hover:bg-emerald-600 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-emerald-500 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all"
                >
                  <span>Plan for {card.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Weekend Escapes Section (3-4 Day Templates) */}
      <section className="max-w-6xl mx-auto px-4 space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Quick Turnaround
          </span>
          <h2 className="font-serif text-2xl font-bold text-slate-100">
            Weekend Escapes & Short Breaks
          </h2>
          <p className="text-xs text-slate-400">
            High-efficiency 3-day getaways with pre-tested conflict resolution models
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {WEEKEND_ESCAPES.map((we) => (
            <div
              key={we.title}
              className="bg-[#131d33] border border-slate-700/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300">
                    {we.tag}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{we.duration}</span>
                </div>
                <h3 className="font-serif text-base font-bold text-slate-100">{we.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{we.highlight}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Baseline Cost</span>
                  <span className="font-mono text-xs font-bold text-emerald-400">{we.budgetPerPerson}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onStartPlanning({
                      destination: we.destination,
                      departureDate: "2026-11-13",
                      returnDate: "2026-11-15",
                    })
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
                >
                  <span>Use Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. How Concord Works: 3 Agents Architecture & Deterministic Integrity */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Truthful AI Architecture
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-100">
            The Three-Agent Negotiation & Validation Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Unlike chatbots that hallucinate numbers, Concord combines Gemma 4 reasoning with deterministic mathematical validation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Agent 1 */}
          <div className="bg-[#131d33] p-5 rounded-2xl border border-slate-700/80 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-serif font-bold text-slate-100 text-sm">Preference & Group Agent</h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Extracts individual preferences, weights, interest tags, and mandatory floors (individual budget caps, mobility accessibility, minimum satisfaction floors).
            </p>
            <div className="pt-2 font-mono text-[10px] text-emerald-300 font-semibold border-t border-slate-800">
              Role: Sticking point analysis & preference mapping
            </div>
          </div>

          {/* Agent 2 */}
          <div className="bg-[#131d33] p-5 rounded-2xl border border-slate-700/80 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-serif font-bold text-slate-100 text-sm">Negotiation & Optimization Agent</h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Uses hosted Gemma 4 to formulate multi-round consensus proposals, evaluate member objections, and suggest win-win concessions under the shared group budget.
            </p>
            <div className="pt-2 font-mono text-[10px] text-emerald-300 font-semibold border-t border-slate-800">
              Role: Multi-round trade-off negotiations
            </div>
          </div>

          {/* Agent 3 */}
          <div className="bg-[#131d33] p-5 rounded-2xl border border-slate-700/80 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-serif font-bold text-slate-100 text-sm">Validation & Explanation Agent</h3>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Runs 8 strict deterministic audits (budget ceiling, math consistency, accessibility compliance, traveler satisfaction floors, and zero cross-destination leakage).
            </p>
            <div className="pt-2 font-mono text-[10px] text-emerald-300 font-semibold border-t border-slate-800">
              Role: Independent deterministic verification
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <IndianRupee className="w-4 h-4 text-amber-400" />
              <span>Strict Budget Ceiling</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Over-budget proposals are automatically rejected by the deterministic engine.
            </p>
          </div>

          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Satisfaction Floors</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              No traveler is sacrificed behind an aggregate average; minimum individual floors are enforced.
            </p>
          </div>

          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Trade-off Ledger</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Every compromise is explicitly tracked with dollar delta, gainer, and conceder.
            </p>
          </div>

          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Zero-Hallucination Pricing</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              All calculations run in deterministic TypeScript with verified catalog offers.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Bottom Call to Action */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <div className="bg-[#131d33] border border-slate-700/80 p-8 rounded-3xl space-y-4 shadow-xl">
          <h3 className="font-serif text-2xl font-bold text-slate-100">
            Ready to plan a conflict-free group trip?
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-lg mx-auto">
            Test any worldwide destination with Photon autocomplete, or try our verified catalog for Goa, Jaipur, Tokyo, Paris, Kolkata, and London.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onStartPlanning()}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-sm transition-all shadow-md inline-flex items-center space-x-2 active:scale-98"
            >
              <span>Start Planning Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onExploreSample}
              className="px-5 py-3 rounded-xl bg-[#1a233b] hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition-colors"
            >
              View Negotiation Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
