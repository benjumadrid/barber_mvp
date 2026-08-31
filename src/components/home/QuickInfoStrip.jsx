import React from 'react';
import { Clock, MapPin, Phone, Scissors, Armchair, ShieldCheck } from 'lucide-react';
import { MOCK_SHOP_INFO } from '../../data/shopData';

export default function QuickInfoStrip() {
  const iconMap = {
    Scissors: Scissors,
    Armchair: Armchair,
    Clock: Clock,
    ShieldCheck: ShieldCheck
  };

  return (
    <section className="relative z-20 -mt-8 sm:-mt-10 lg:-mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 4 Feature Pillars */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-luxury-lg border border-[#E6DDD1] mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-[#EFE9E2]">
          
          {MOCK_SHOP_INFO.pillars.map((pillar, idx) => {
            const IconComponent = iconMap[pillar.icon] || ShieldCheck;
            return (
              <div
                key={pillar.id}
                className={`flex flex-col items-center text-center ${idx !== 0 ? 'pt-4 sm:pt-0 sm:pl-6' : ''}`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#FAF6F1] border border-[#E2D7C8] flex items-center justify-center mb-3 text-[#D97706] shadow-sm">
                  <IconComponent className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#1E1915] tracking-wide uppercase font-['Cinzel',serif]">
                  {pillar.title}
                </h3>
                <p className="text-xs text-[#8C4717] font-bold mt-1">
                  {pillar.subtitle}
                </p>
              </div>
            );
          })}

        </div>
      </div>

      {/* Quick Schedule, Location & Phone Bar */}
      <div className="bg-[#FAF6F1] text-[#1E1915] rounded-2xl p-4 sm:p-5 shadow-luxury-md border border-[#E2D7C8]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E6DDD1] text-center sm:text-left">
          
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-2 sm:pt-0 sm:px-4">
            <div className="w-10 h-10 rounded-xl bg-[#E5A93C]/15 border border-[#E5A93C]/35 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <p className="text-[11px] text-[#6E5D52] font-bold uppercase tracking-wider">Mon - Sun</p>
              <p className="text-sm font-extrabold text-[#1E1915]">{MOCK_SHOP_INFO.hours.time}</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3 pt-3 sm:pt-0 sm:px-4">
            <div className="w-10 h-10 rounded-xl bg-[#E5A93C]/15 border border-[#E5A93C]/35 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <p className="text-[11px] text-[#6E5D52] font-bold uppercase tracking-wider">Location</p>
              <p className="text-sm font-extrabold text-[#1E1915]">{MOCK_SHOP_INFO.location.displayAddress}</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3 pt-3 sm:pt-0 sm:px-4">
            <div className="w-10 h-10 rounded-xl bg-[#E5A93C]/15 border border-[#E5A93C]/35 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <p className="text-[11px] text-[#6E5D52] font-bold uppercase tracking-wider">Call Us</p>
              <p className="text-sm font-extrabold text-[#1E1915]">{MOCK_SHOP_INFO.contact.phone}</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
