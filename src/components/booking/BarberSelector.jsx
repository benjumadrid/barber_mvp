import React from 'react';
import { CheckCircle2, Shuffle, ShieldCheck } from 'lucide-react';
import { MOCK_BARBERS } from '../../data/barbersData';

export default function BarberSelector({ selectedBarberId, onSelect }) {
  const isAnySelected = selectedBarberId === 'any';

  return (
    <section id="booking-barber">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#E5A93C]/10 flex items-center justify-center">
          <span className="text-sm font-bold text-[#C88A22]">2</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
          CHOOSE YOUR BARBER
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* "Any Available Barber" card */}
        <button
          onClick={() => onSelect('any')}
          className={`group relative text-center rounded-xl border-2 p-4 transition-all duration-200 ${
            isAnySelected
              ? 'border-[#E5A93C] bg-[#FDF8EF] shadow-md shadow-[#E5A93C]/10'
              : 'border-[#E6DDD1] bg-white hover:border-[#C88A22]/40 hover:shadow-luxury-sm'
          }`}
        >
          {isAnySelected && (
            <div className="absolute top-2 right-2">
              <CheckCircle2 className="w-4 h-4 text-[#E5A93C]" />
            </div>
          )}
          <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
            isAnySelected
              ? 'bg-gradient-to-br from-[#E5A93C] to-[#D97706] text-white'
              : 'bg-[#FAF6F1] border border-[#E2D7C8] text-[#9E8B7F]'
          }`}>
            <Shuffle className="w-5 h-5" />
          </div>
          <h3 className={`font-bold text-xs sm:text-sm mb-0.5 ${
            isAnySelected ? 'text-[#1E1915]' : 'text-[#231B15]'
          }`}>
            Any Barber
          </h3>
          <p className="text-[10px] text-[#6E5D52]">Next available</p>
        </button>

        {/* Individual barber cards */}
        {MOCK_BARBERS.map((barber) => {
          const isSelected = selectedBarberId === barber.id;
          return (
            <button
              key={barber.id}
              onClick={() => onSelect(barber.id)}
              className={`group relative text-center rounded-xl border-2 p-4 transition-all duration-200 ${
                isSelected
                  ? 'border-[#E5A93C] bg-[#FDF8EF] shadow-md shadow-[#E5A93C]/10'
                  : 'border-[#E6DDD1] bg-white hover:border-[#C88A22]/40 hover:shadow-luxury-sm'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E5A93C]" />
                </div>
              )}

              {/* Initials monogram */}
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 font-bold text-sm ${
                isSelected
                  ? 'bg-gradient-to-br from-[#E5A93C] to-[#D97706] text-white'
                  : 'bg-[#FAF6F1] border border-[#E2D7C8] text-[#6E5D52]'
              }`}>
                {barber.initials}
              </div>

              {/* Name */}
              <h3 className={`font-bold text-xs sm:text-sm mb-0.5 ${
                isSelected ? 'text-[#1E1915]' : 'text-[#231B15]'
              }`}>
                {barber.name}
              </h3>

              {/* Certification */}
              <div className="flex items-center justify-center gap-1 text-[10px] text-[#6E5D52]">
                <ShieldCheck className="w-3 h-3 text-[#C88A22]" />
                <span>5+ Yrs</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
