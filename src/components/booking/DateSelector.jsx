import React, { useRef, useEffect } from 'react';
import { getUpcomingDates, formatDisplayDate, formatDateKey } from '../../data/bookingStore';

export default function DateSelector({ selectedDate, onSelect }) {
  const dates = getUpcomingDates(14);
  const scrollRef = useRef(null);
  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : null;

  // Scroll selected date into view
  useEffect(() => {
    if (scrollRef.current && selectedDate) {
      const idx = dates.findIndex(d => formatDateKey(d) === selectedDateKey);
      if (idx >= 0) {
        const child = scrollRef.current.children[idx];
        if (child) {
          child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    }
  }, [selectedDateKey]);

  return (
    <section id="booking-date">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#E5A93C]/10 flex items-center justify-center">
          <span className="text-sm font-bold text-[#C88A22]">3</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
          PICK A DATE
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dates.map((date) => {
          const { dayName, month, day, isToday: isTodayDate } = formatDisplayDate(date);
          const dateKey = formatDateKey(date);
          const isSelected = selectedDateKey === dateKey;

          return (
            <button
              key={dateKey}
              onClick={() => onSelect(date)}
              className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-[72px] sm:w-20 h-[88px] sm:h-24 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-[#E5A93C] bg-gradient-to-b from-[#FDF8EF] to-[#FAF0DD] shadow-md shadow-[#E5A93C]/15'
                  : 'border-[#E6DDD1] bg-white hover:border-[#C88A22]/40 hover:shadow-sm'
              }`}
            >
              {/* Day name */}
              <span className={`text-[10px] sm:text-xs font-bold tracking-wider mb-1 ${
                isTodayDate && isSelected
                  ? 'text-[#C88A22]'
                  : isTodayDate
                  ? 'text-[#E5A93C]'
                  : isSelected
                  ? 'text-[#C88A22]'
                  : 'text-[#9E8B7F]'
              }`}>
                {dayName}
              </span>

              {/* Day number */}
              <span className={`text-xl sm:text-2xl font-extrabold leading-none ${
                isSelected ? 'text-[#1E1915]' : 'text-[#231B15]'
              }`}>
                {day}
              </span>

              {/* Month */}
              <span className={`text-[10px] sm:text-xs font-medium mt-0.5 ${
                isSelected ? 'text-[#C88A22]' : 'text-[#9E8B7F]'
              }`}>
                {month}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hide scrollbar CSS */}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </section>
  );
}
