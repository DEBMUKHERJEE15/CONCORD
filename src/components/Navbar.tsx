"use client";

import React, { useEffect, useState } from "react";
import {
  Compass,
  Sparkles,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Bookmark,
  Menu,
  X,
  Plus,
} from "lucide-react";

interface NavbarProps {
  currentTab: "landing" | "planner" | "dashboard";
  onSelectTab: (tab: "landing" | "planner" | "dashboard") => void;
  onOpenKeyModal: () => void;
  hasCustomKey: boolean;
  onResetDefaults: () => void;
  savedTripsCount: number;
  onOpenSavedTrips: () => void;
  onStartPlanning: () => void;
}

export function Navbar({
  currentTab,
  onSelectTab,
  onOpenKeyModal,
  hasCustomKey,
  onResetDefaults,
  savedTripsCount,
  onOpenSavedTrips,
  onStartPlanning,
}: NavbarProps) {
  const [healthStatus, setHealthStatus] = useState<"checking" | "healthy" | "error">("checking");
  const [modelName, setModelName] = useState<string>("gemma-4-26b-a4b-it");
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setHealthStatus("healthy");
          setModelName(data.gemma?.model || "gemma-4-26b-a4b-it");
          setHasServerKey(Boolean(data.gemma?.hasServerApiKey));
        } else {
          setHealthStatus("error");
        }
      } catch {
        setHealthStatus("error");
      }
    }
    checkHealth();
  }, []);

  return (
    <header className="bg-[#131d33] border-b border-slate-700/80 sticky top-0 z-30 shadow-md backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab("landing")}>
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-xs">
            <Compass className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-xl font-bold tracking-tight text-slate-100">
                CONCORD
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 tracking-wider">
                Gemma 4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Group Trip Negotiator & Trade-Off Engine
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 text-xs font-semibold text-slate-300">
          <button
            onClick={() => onSelectTab("landing")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              currentTab === "landing"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                : "hover:text-white hover:bg-slate-800"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onSelectTab("planner")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              currentTab === "planner"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                : "hover:text-white hover:bg-slate-800"
            }`}
          >
            Trip Planner
          </button>
          <button
            onClick={() => onSelectTab("dashboard")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              currentTab === "dashboard"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                : "hover:text-white hover:bg-slate-800"
            }`}
          >
            Negotiation Results
          </button>
          <button
            onClick={onOpenSavedTrips}
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center space-x-1.5"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-400" />
            <span>Saved Plans</span>
            {savedTripsCount > 0 && (
              <span className="bg-emerald-600 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {savedTripsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center space-x-2.5 text-xs">
          {/* Model Status Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-[#0f172a] border border-slate-700 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-300 font-mono text-[11px] font-medium">
              {modelName}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Key Configuration Button */}
          <button
            onClick={onOpenKeyModal}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              hasServerKey || hasCustomKey
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60"
                : "bg-amber-950/60 border-amber-500/40 text-amber-200 hover:bg-amber-900/60"
            }`}
            title="Configure Gemma 4 API Key"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {hasServerKey
                ? "Server Key"
                : hasCustomKey
                ? "Session Key"
                : "Set Gemma Key"}
            </span>
            {hasServerKey || hasCustomKey ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            )}
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onStartPlanning}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Plan Trip</span>
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-700 bg-[#131d33] px-4 py-3 space-y-2 text-xs font-semibold animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => {
              onSelectTab("landing");
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-300 hover:text-emerald-300"
          >
            Product Overview
          </button>
          <button
            onClick={() => {
              onSelectTab("planner");
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-300 hover:text-emerald-300"
          >
            Interactive Trip Planner
          </button>
          <button
            onClick={() => {
              onSelectTab("dashboard");
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-300 hover:text-emerald-300"
          >
            Negotiation Results Dashboard
          </button>
          <button
            onClick={() => {
              onOpenSavedTrips();
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-300 hover:text-emerald-300 flex items-center justify-between"
          >
            <span>Saved Plans</span>
            {savedTripsCount > 0 && (
              <span className="bg-emerald-600 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {savedTripsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              onResetDefaults();
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-1.5 text-slate-400 hover:text-slate-200 border-t border-slate-800 pt-2 flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Defaults</span>
          </button>
        </div>
      )}
    </header>
  );
}
