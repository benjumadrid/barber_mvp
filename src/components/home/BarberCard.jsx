import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Calendar, Scissors, ShieldCheck } from 'lucide-react';

export default function BarberCard({ barber }) {
  return (
    <div className="group relative bg-white border border-[#E6DDD1] hover:border-[#E5A93C] rounded-2xl p-5 text-center transition-all duration-300 flex flex-col items-center justify-between shadow-luxury-sm hover:shadow-luxury-lg hover:-translate-y-1.5 overflow-hidden">
      
      {/* Decorative top glow on hover */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-36 h-36 bg-[#E5A93C]/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Styled Barber Emblem (No photo) */}
      <div className="relative mb-4 z-10">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[3px] bg-gradient-to-tr from-[#E5A93C] via-[#FAF6F1] to-[#D97706] group-hover:scale-105 transition-all duration-300 shadow-md">
          <div className="w-full h-full rounded-full bg-gradient-to-b from-[#FAF6F1] to-[#EDE6DD] flex flex-col items-center justify-center text-[#1E1915] border border-white">
            <Scissors className="w-6 h-6 text-[#C88A22] stroke-[2.2] group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-[10px] font-extrabold tracking-wider text-[#8C4717] mt-0.5 font-['Cinzel',serif]">
              {barber.initials}
            </span>
          </div>
        </div>

        {/* Certified Badge */}
        <div
          className="absolute -bottom-1 -right-1 bg-gradient-to-br from-[#E5A93C] to-[#D97706] text-white p-1.5 rounded-full shadow-md ring-2 ring-white"
          title="Certified Barber"
        >
          <Award className="w-3.5 h-3.5" />
        </div>

        {/* Status Dot */}
        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" title="Available for booking" />
      </div>

      {/* Info */}
      <div className="space-y-1.5 mb-4 z-10">
        <h3 className="text-base sm:text-lg font-extrabold text-[#1E1915] group-hover:text-[#8C4717] transition-colors font-['Cinzel',serif]">
          {barber.name}
        </h3>

        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF6F1] border border-[#E2D7C8] text-[11px] font-bold text-[#8C4717]">
          <ShieldCheck className="w-3 h-3 text-[#C88A22]" />
          <span>Certified Barber</span>
        </div>

        <p className="text-xs font-extrabold text-[#C88A22] pt-1">
          5+ Years Experience
        </p>

        <p className="text-[11px] text-[#6E5D52] max-w-[180px] leading-relaxed pt-0.5">
          
        </p>
      </div>

      {/* Booking Button */}
      <Link
        to={`/booking?barber=${barber.id}`}
        className="relative z-10 w-full py-2.5 px-3 rounded-xl bg-[#FAF6F1] group-hover:bg-gradient-to-r group-hover:from-[#E5A93C] group-hover:to-[#D97706] text-[#1E1915] group-hover:text-white text-xs font-bold border border-[#E2D7C8] group-hover:border-transparent transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-md"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>Book with {barber.name}</span>
      </Link>
    </div>
  );
}