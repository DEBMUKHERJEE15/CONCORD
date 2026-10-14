"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import {
  MapPin,
  Search,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Globe,
} from "lucide-react";
import { DestinationObject } from "@/types";
import { searchPhoton, createManualDestination } from "@/lib/destinations";

interface DestinationAutocompleteProps {
  id?: string;
  label: string;
  value: string;
  selectedDestination?: DestinationObject;
  onChange: (text: string, destination?: DestinationObject) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  theme?: "dark" | "light";
  helperText?: string;
}

export function DestinationAutocomplete({
  id: customId,
  label,
  value,
  selectedDestination,
  onChange,
  placeholder = "Search worldwide city, town, or landmark...",
  required = false,
  disabled = false,
  theme = "dark",
  helperText,
}: DestinationAutocompleteProps) {
  const generatedId = useId();
  const inputId = customId || `dest-input-${generatedId}`;

  const [inputValue, setInputValue] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<DestinationObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isThrottled, setIsThrottled] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestQueryRef = useRef<string>("");

  // Sync internal input value with prop if changed externally
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const query = inputValue.trim();

    // If query is the same as the selected destination's display name, do not search
    if (selectedDestination && (query === selectedDestination.displayName || query === selectedDestination.name)) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      setErrorMsg(null);
      setIsThrottled(false);
      return;
    }

    latestQueryRef.current = query;
    setIsLoading(true);
    setErrorMsg(null);
    setIsThrottled(false);

    // Cancel previous inflight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const response = await searchPhoton(query, {
          limit: 6,
          lang: "en",
          signal: controller.signal,
        });

        // Ignore stale responses
        if (latestQueryRef.current !== query) return;

        setResults(response.results);
        if (response.isThrottled) {
          setIsThrottled(true);
        }
        if (response.error) {
          setErrorMsg(response.error);
        }
        setIsOpen(true);
        setHighlightedIndex(-1);
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          if (latestQueryRef.current === query) {
            setErrorMsg("Place search network issue. You can enter manually.");
          }
        }
      } finally {
        if (latestQueryRef.current === query) {
          setIsLoading(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue, selectedDestination]);

  const handleSelect = (dest: DestinationObject) => {
    setInputValue(dest.displayName);
    onChange(dest.displayName, dest);
    setIsOpen(false);
    setResults([]);
    setErrorMsg(null);
  };

  const handleManualUse = (text: string) => {
    if (!text.trim()) return;
    const manualDest = createManualDestination(text);
    setInputValue(manualDest.displayName);
    onChange(manualDest.displayName, manualDest);
    setIsOpen(false);
    setResults([]);
    setErrorMsg(null);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("", undefined);
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      return;
    }

    if (e.key === "Enter") {
      if (isOpen && highlightedIndex >= 0 && results[highlightedIndex]) {
        e.preventDefault();
        handleSelect(results[highlightedIndex]);
      } else if (isOpen && results.length === 0 && inputValue.trim().length >= 2) {
        e.preventDefault();
        handleManualUse(inputValue);
      }
    }
  };

  const isDark = theme === "dark";

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className={`block text-xs font-semibold ${
            isDark ? "text-slate-200" : "text-stone-800"
          }`}
        >
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {selectedDestination && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${
              selectedDestination.isVerified
                ? isDark
                  ? "bg-teal-950/80 text-teal-300 border border-teal-800/60"
                  : "bg-forest-50 text-forest-800 border border-forest-200"
                : isDark
                ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {selectedDestination.isVerified ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-teal-400" />
                <span>Verified Location</span>
              </>
            ) : (
              <>
                <HelpCircle className="w-3 h-3 text-amber-400" />
                <span>Manual Entry</span>
              </>
            )}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Loader2 className={`w-4 h-4 animate-spin ${isDark ? "text-teal-400" : "text-forest-600"}`} />
          ) : (
            <MapPin className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-stone-400"}`} />
          )}
        </div>

        <input
          id={inputId}
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value, undefined);
          }}
          onFocus={() => {
            if (results.length > 0 || inputValue.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${inputId}-dropdown`}
          className={`w-full pl-9 pr-8 py-2 text-xs rounded-lg border transition-colors focus:outline-hidden focus:ring-2 ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          } ${
            isDark
              ? "bg-slate-900/90 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:ring-teal-500 focus:border-teal-500"
              : "bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:ring-forest-600 focus:border-forest-600"
          }`}
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute inset-y-0 right-0 pr-2.5 flex items-center transition-colors cursor-pointer ${
              isDark ? "text-slate-400 hover:text-slate-200" : "text-stone-400 hover:text-stone-600"
            }`}
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {helperText && !isOpen && (
        <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-stone-500"}`}>
          {helperText}
        </p>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          id={`${inputId}-dropdown`}
          role="listbox"
          className={`absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border shadow-xl animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? "bg-slate-900 border-slate-700/90 text-slate-100 divide-y divide-slate-800"
              : "bg-white border-stone-200 text-stone-900 divide-y divide-stone-100"
          }`}
        >
          {results.length > 0 && (
            <div className="py-1">
              {results.map((dest, idx) => {
                const isSelected = highlightedIndex === idx;
                return (
                  <div
                    key={dest.id || idx}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(dest)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 text-xs cursor-pointer flex items-start justify-between gap-2 transition-colors ${
                      isSelected
                        ? isDark
                          ? "bg-teal-950/60 text-teal-200"
                          : "bg-forest-50 text-forest-900"
                        : isDark
                        ? "hover:bg-slate-800 text-slate-200"
                        : "hover:bg-stone-50 text-stone-800"
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <Globe className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isDark ? "text-teal-400" : "text-forest-600"}`} />
                      <div className="truncate">
                        <div className="font-semibold text-xs leading-tight truncate">{dest.name}</div>
                        <div className={`text-[11px] truncate ${isDark ? "text-slate-400" : "text-stone-500"}`}>
                          {dest.displayName}
                        </div>
                      </div>
                    </div>
                    {dest.country && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 uppercase tracking-wider ${
                          isDark ? "bg-slate-800 text-slate-300" : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {dest.country}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && results.length === 0 && (
            <div className="p-3 text-center text-xs flex items-center justify-center gap-2">
              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? "text-teal-400" : "text-forest-600"}`} />
              <span className={isDark ? "text-slate-400" : "text-stone-500"}>Searching worldwide places...</span>
            </div>
          )}

          {/* No results or error fallback */}
          {!isLoading && results.length === 0 && inputValue.trim().length >= 2 && (
            <div className="p-3 space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  {errorMsg ? (
                    <span className="text-amber-400 font-medium">{errorMsg}</span>
                  ) : isThrottled ? (
                    <span className="text-amber-400 font-medium">Rate limit reached on geocoding service.</span>
                  ) : (
                    <span className={isDark ? "text-slate-300" : "text-stone-600"}>
                      No exact matches found for &ldquo;{inputValue}&rdquo;.
                    </span>
                  )}
                  <p className={`mt-0.5 ${isDark ? "text-slate-400" : "text-stone-500"}`}>
                    You can still use this as a custom destination:
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleManualUse(inputValue)}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded font-medium flex items-center justify-between border transition-colors ${
                  isDark
                    ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-teal-300"
                    : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-forest-800"
                }`}
              >
                <span>Use &ldquo;<strong>{inputValue.trim()}</strong>&rdquo; (Manual / Unverified)</span>
                <span className="text-[10px] font-mono">Press Enter ↵</span>
              </button>
            </div>
          )}

          {/* Attribution footer per requirement */}
          <div
            className={`px-3 py-1.5 text-[10px] flex items-center justify-between ${
              isDark ? "bg-slate-950/80 text-slate-500 border-t border-slate-800" : "bg-stone-50 text-stone-400 border-t border-stone-100"
            }`}
          >
            <span>Place search powered by Photon / OpenStreetMap.</span>
            <span>Worldwide</span>
          </div>
        </div>
      )}
    </div>
  );
}
