import React, { useState, useEffect } from 'react';
import { Sun, Sunset, Moon, Lock, Clock, CheckCircle2 } from 'lucide-react';
import { getBarberTimeSlots, getSlotStatus, formatDateKey } from '../../data/bookingStore';

const PERIOD_CONFIG = {
  morning:   { label: 'Morning (8:00 AM – 11:59 AM)',   icon: Sun,    color: 'text-amber-500' },
  afternoon: { label: 'Afternoon (12:00 PM – 4:59 PM)', icon: Sunset, color: 'text-orange-500' },
  evening:   { label: 'Evening (5:00 PM – 7:00 PM)',   icon: Moon,   color: 'text-indigo-400' },
};

export default function TimeSlotSelector({ selectedBarberId, selectedDate, selectedTimeId, onSelect, excludeSlotKey = null }) {
  const [, setTick] = useState(0);

  // Live timer tick every 15 seconds to update slot availability dynamically
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  if (!selectedDate || !selectedBarberId) {
    return (
      <section id="booking-time">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#E5A93C]/10 flex items-center justify-center">
            <span className="text-sm font-bold text-[#C88A22]">4</span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
              CHOOSE A TIME
            </h2>
            <p className="text-xs text-[#6E5D52]">
              Shop hours: 8:00 AM – 8:00 PM (1-hour appointments)
            </p>
          </div>
        </div>
        <div className="bg-[#FAF6F1] border border-[#E6DDD1] rounded-xl p-8 text-center">
          <p className="text-sm text-[#9E8B7F]">
            {!selectedBarberId ? 'Please select a barber first' : 'Please select a date first'}
          </p>
        </div>
      </section>
    );
  }

  const dateStr = formatDateKey(selectedDate);
  const barberSlots = getBarberTimeSlots(selectedBarberId);

  // Group slots by period
  const grouped = { morning: [], afternoon: [], evening: [] };
  barberSlots.forEach((slot) => {
    const status = getSlotStatus(selectedBarberId, dateStr, slot, selectedDate, excludeSlotKey);
    if (grouped[slot.period]) {
      grouped[slot.period].push({ ...slot, status });
    }
  });

  return (
    <section id="booking-time">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#E5A93C]/10 flex items-center justify-center">
          <span className="text-sm font-bold text-[#C88A22]">4</span>
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
            CHOOSE A TIME
          </h2>
          <p className="text-xs text-[#6E5D52]">
            8:00 AM – 8:00 PM • 1-hour appointment duration
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {Object.entries(grouped).map(([period, slots]) => {
          if (slots.length === 0) return null;
          const config = PERIOD_CONFIG[period];
          const PeriodIcon = config.icon;

          return (
            <div key={period}>
              {/* Period header */}
              <div className="flex items-center gap-2 mb-2.5">
                <PeriodIcon className={`w-4 h-4 ${config.color}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-[#6E5D52]">
                  {config.label}
                </span>
              </div>

              {/* Slot grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const isSelected = selectedTimeId === slot.timeId;
                  const isPastOrTooSoon = slot.status === 'past' || slot.status === 'too-soon';
                  const isDisabled = slot.status === 'booked' || isPastOrTooSoon || slot.status === 'unavailable';

                  return (
                    <button
                      key={slot.timeId}
                      type="button"
                      onClick={() => !isDisabled && onSelect(slot.timeId)}
                      disabled={isDisabled}
                      className={`relative flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 text-center transition-all duration-200 ${
                        isSelected
                          ? 'border-[#E5A93C] bg-gradient-to-b from-[#FDF8EF] to-[#FAF0DD] shadow-md shadow-[#E5A93C]/15 ring-1 ring-[#E5A93C]/30'
                          : isDisabled
                          ? 'border-[#EFE9E2] bg-[#FAF8F5] text-[#C5B9AB] cursor-not-allowed opacity-60'
                          : 'border-[#E6DDD1] bg-white hover:border-[#C88A22]/40 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-[#E5A93C]" />
                      )}

                      <span className={`text-xs sm:text-sm font-bold ${
                        isSelected
                          ? 'text-[#1E1915]'
                          : isDisabled
                          ? 'text-[#C5B9AB]'
                          : 'text-[#231B15]'
                      }`}>
                        {slot.startTime}
                      </span>

                      {/* Status label for disabled slots */}
                      {slot.status === 'booked' && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-[#C5B9AB] mt-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          Booked
                        </span>
                      )}
                      {isPastOrTooSoon && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-[#C5B9AB] mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          Unavailable
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
