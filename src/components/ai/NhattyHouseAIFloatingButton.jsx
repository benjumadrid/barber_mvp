import React, { useState } from 'react';
import { Sparkles, MessageSquare, X } from 'lucide-react';
import NhattyHouseAIModal from './NhattyHouseAIModal';

export default function NhattyHouseAIFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
    setHasInteracted(true);
  };

  return (
    <>
      {/* ── Fixed Floating Button in Bottom-Right Viewport ──────── */}
      <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-3">
        {/* Main Floating Trigger Button */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isOpen ? 'Close Nhatty House AI' : 'Open Nhatty House AI Assistant'}
          className={`group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer border ${
            isOpen
              ? 'bg-[#1E1915] text-[#FAF6F1] border-white/20 hover:bg-[#28211C]'
              : 'bg-gradient-to-r from-[#1E1915] via-[#2A221C] to-[#1E1915] text-white border-[#E5A93C]/60 hover:border-[#E5A93C] shadow-[#E5A93C]/20 hover:shadow-[#E5A93C]/35 hover:-translate-y-0.5'
          }`}
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-[#E5A93C]/15 blur-md pointer-events-none group-hover:bg-[#E5A93C]/25 transition-all" />

          {/* Icon Badge */}
          <div className="relative w-7 h-7 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center text-[#1A1614] shadow-sm flex-shrink-0">
            {isOpen ? (
              <X className="w-4 h-4 stroke-[3]" />
            ) : (
              <Sparkles className="w-4 h-4 stroke-[2.5] animate-pulse" />
            )}
          </div>

          {/* Button Text */}
          <div className="text-left leading-tight pr-1">
            <span className="text-[10px] uppercase tracking-widest font-mono text-[#E5A93C] block font-bold">
              {isOpen ? 'Close' : 'AI Assistant'}
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-['Cinzel',serif] text-white tracking-wide block">
              Nhatty House AI
            </span>
          </div>

          {/* Pulse notification dot */}
          {!isOpen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>
      </div>

      {/* ── AI Modal Window ─────────────────────────────────────── */}
      <NhattyHouseAIModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
