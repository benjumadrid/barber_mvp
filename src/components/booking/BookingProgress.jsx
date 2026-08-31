import React from 'react';
import { Scissors, User, CalendarDays, ClipboardCheck, CreditCard, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { key: 'service', label: 'Service', icon: Scissors },
  { key: 'barber', label: 'Barber', icon: User },
  { key: 'datetime', label: 'Date & Time', icon: CalendarDays },
  { key: 'details', label: 'Details', icon: ClipboardCheck },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'confirm', label: 'Confirm', icon: CheckCircle2 },
];

export default function BookingProgress({ completedSteps = {} }) {
  // Determine which steps are completed based on selections
  const stepStatus = STEPS.map((step) => {
    if (completedSteps[step.key]) return 'completed';
    return 'upcoming';
  });

  // Find current step (first incomplete)
  const currentIdx = stepStatus.findIndex(s => s === 'upcoming');
  if (currentIdx >= 0) stepStatus[currentIdx] = 'current';

  return (
    <div className="bg-white border border-[#E6DDD1] rounded-2xl p-4 sm:p-5 shadow-luxury-sm">
      <div className="flex items-center justify-between relative max-w-2xl mx-auto">
        {/* Track line */}
        <div className="absolute top-5 sm:top-[22px] left-6 right-6 h-[2px] bg-[#EFE9E2] z-0" />

        {/* Completed portion of track */}
        {currentIdx > 0 && (
          <div
            className="absolute top-5 sm:top-[22px] left-6 h-[2px] bg-[#E5A93C] z-[1] transition-all duration-500"
            style={{ width: `${((currentIdx) / (STEPS.length - 1)) * 100}%` }}
          />
        )}

        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const status = stepStatus[idx];
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                  status === 'completed'
                    ? 'bg-[#E5A93C] text-white shadow-md'
                    : status === 'current'
                    ? 'bg-gradient-to-br from-[#E5A93C] to-[#D97706] text-[#1A1614] shadow-md ring-4 ring-[#E5A93C]/20'
                    : 'bg-[#FAF6F1] border border-[#E2D7C8] text-[#9E8B7F]'
                }`}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-semibold transition-colors ${
                  status === 'completed'
                    ? 'text-[#C88A22] font-bold'
                    : status === 'current'
                    ? 'text-[#1E1915] font-bold'
                    : 'text-[#9E8B7F]'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
