"use client";

import React, { useState } from "react";
import { X, Key, ShieldCheck, AlertCircle } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string) => void;
}

export function ApiKeyModal({ isOpen, onClose, apiKey, onSaveKey }: ApiKeyModalProps) {
  const [inputVal, setInputVal] = useState(apiKey);
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(inputVal.trim());
    onClose();
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText("GEMMA_API_KEY=your_key_here\nGEMMA_MODEL=gemma-4-26b-a4b-it");
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#131d33] rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h3 className="font-serif text-lg font-bold text-slate-100">Gemma 4 API Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            CONCORD strictly uses <strong>Gemma 4</strong> (<code className="font-mono bg-[#0f172a] border border-slate-700 text-emerald-400 px-1.5 py-0.5 rounded">gemma-4-26b-a4b-it</code>) via Google Gen AI SDK for negotiation proposals and explanations.
          </p>

          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Exposure Architecture:</strong> Keys provided here are used solely in server-side API requests for your session and are never logged, persisted in Git, or bundled.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Session Gemma API Key:
            </label>
            <input
              type="password"
              placeholder="Enter your Gemma API Key..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-700 rounded-lg font-mono bg-[#0f172a] text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Alternatively, you can set <code className="font-mono text-slate-300">GEMMA_API_KEY</code> in your server&apos;s <code className="font-mono text-slate-300">.env.local</code>.
            </p>
          </div>

          <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-1">
              <span>.env.local format:</span>
              <button
                type="button"
                onClick={handleCopyEnv}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                {copiedEnv ? "Copied!" : "Copy template"}
              </button>
            </div>
            <pre className="text-[10px] text-slate-300 font-mono">
              GEMMA_API_KEY=your_key_here{"\n"}GEMMA_MODEL=gemma-4-26b-a4b-it
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
          >
            Save Session Key
          </button>
        </div>
      </div>
    </div>
  );
}
