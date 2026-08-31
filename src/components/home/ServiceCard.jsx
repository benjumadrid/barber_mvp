import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

export default function ServiceCard({ service }) {
  return (
    <div className="group bg-white rounded-2xl border border-[#E6DDD1] hover:border-[#E5A93C] overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-luxury-sm hover:shadow-luxury-lg hover:-translate-y-1">
      {/* Top Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#FAF6F1]">
        <img
          src={service.image}
          alt={service.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          style={service.imagePosition ? { objectPosition: service.imagePosition } : undefined}
          loading="lazy"
        />
        
        {/* Top Badges (Popular only, duration removed) */}
        {service.popular && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#E5A93C] to-[#D97706] text-[11px] font-bold text-white shadow-sm">
              Popular
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base sm:text-lg font-bold text-[#1E1915] group-hover:text-[#8C4717] transition-colors font-['Cinzel',serif]">
              {service.name}
            </h3>
            <span className="text-sm sm:text-base font-extrabold text-[#1E1915] shrink-0">
              {service.price} <span className="text-xs font-bold text-[#C88A22]">{service.currency}</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#6E5D52] leading-relaxed line-clamp-2">
            {service.description}
          </p>
        </div>

        {/* Features Checklist */}
        {service.features && (
          <ul className="space-y-1 pt-2 border-t border-[#EFE9E2]">
            {service.features.slice(0, 2).map((feature, idx) => (
              <li key={idx} className="text-xs text-[#5C4E44] flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#C88A22] shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Link
            to={`/booking?service=${service.id}`}
            className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#FAF6F1] group-hover:bg-[#E5A93C] text-[#1E1915] group-hover:text-white font-bold text-xs sm:text-sm border border-[#E2D7C8] group-hover:border-[#E5A93C] transition-all duration-200"
          >
            <span>Book This Service</span>
            <div className="w-7 h-7 rounded-full bg-white group-hover:bg-white/20 flex items-center justify-center shadow-sm transition-colors">
              <ArrowRight className="w-3.5 h-3.5 text-[#1E1915] group-hover:text-white" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
