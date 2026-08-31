import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function CancellationModal({ isOpen, onKeep, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onKeep}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-[scaleIn_0.25s_ease-out]">
        {/* Close button */}
        <button
          onClick={onKeep}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FAF6F1] flex items-center justify-center text-[#6E5D52] hover:bg-[#EFE9E2] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning icon */}
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-[#1E1915] font-['Cinzel',serif] mb-2">
            CANCEL APPOINTMENT
          </h3>
          <p className="text-sm text-[#6E5D52] leading-relaxed">
            Cancelling will release your appointment time so another customer can book it.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onKeep}
            className="w-full py-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
          >
            KEEP APPOINTMENT
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E5A93C] to-[#D97706] text-[#1A1614] font-bold text-sm shadow-md shadow-[#E5A93C]/20 hover:shadow-[#E5A93C]/30 active:scale-[0.98] transition-all"
          >
            CANCEL APPOINTMENT
          </button>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
