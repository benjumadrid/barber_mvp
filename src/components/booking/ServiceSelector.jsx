import React from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import { MOCK_SERVICES } from '../../data/servicesData';

export default function ServiceSelector({ selectedServiceId, onSelect }) {
  return (
    <section id="booking-service">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#E5A93C]/10 flex items-center justify-center">
          <span className="text-sm font-bold text-[#C88A22]">1</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
          SELECT YOUR SERVICE
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MOCK_SERVICES.map((service) => {
          const isSelected = selectedServiceId === service.id;
          return (
            <button
              key={service.id}
              onClick={() => onSelect(service.id)}
              className={`group relative text-left w-full rounded-xl border-2 p-4 sm:p-5 transition-all duration-200 ${
                isSelected
                  ? 'border-[#E5A93C] bg-[#FDF8EF] shadow-md shadow-[#E5A93C]/10'
                  : 'border-[#E6DDD1] bg-white hover:border-[#C88A22]/40 hover:shadow-luxury-sm'
              }`}
            >
              {/* Selected check */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-5 h-5 text-[#E5A93C]" />
                </div>
              )}

              {/* Popular badge */}
              {service.popular && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E5A93C]/10 text-[10px] font-bold text-[#C88A22] mb-2">
                  <Star className="w-3 h-3 fill-[#E5A93C] text-[#E5A93C]" />
                  Popular
                </div>
              )}

              {/* Service name */}
              <h3 className={`font-bold text-sm sm:text-base mb-1 pr-6 ${
                isSelected ? 'text-[#1E1915]' : 'text-[#231B15]'
              }`}>
                {service.name}
              </h3>

              {/* Tagline */}
              <p className="text-xs text-[#6E5D52] mb-3 leading-relaxed">
                {service.tagline}
              </p>

              {/* Price row */}
              <div className="flex items-center justify-between">
                <span className={`text-base sm:text-lg font-extrabold ${
                  isSelected ? 'text-[#C88A22]' : 'text-[#1E1915]'
                }`}>
                  {service.price} <span className="text-xs font-semibold text-[#6E5D52]">ETB</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
