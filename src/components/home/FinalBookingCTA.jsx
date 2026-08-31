import React from 'react';
import { Calendar, Scissors, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import Button from '../common/Button';

export default function FinalBookingCTA() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-[#FAF6F1] via-[#F4EFEB] to-[#FAF6F1] text-[#1E1915] relative overflow-hidden border-t border-[#E6DDD1]">
      {/* Subtle Warm Amber Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-[#E5A93C]/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
        
        {/* Top Icon Badge */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E5A93C] via-[#D97706] to-[#B45309] text-white shadow-lg shadow-[#E5A93C]/25 mx-auto">
          <Scissors className="w-7 h-7 stroke-[2.5]" />
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-tight leading-tight">
            YOUR NEXT CUT <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D97706] via-[#E5A93C] to-[#B45309]">
              STARTS HERE.
            </span>
          </h2>
          
          <p className="text-sm sm:text-base text-[#6E5D52] max-w-xl mx-auto font-medium">
            Experience premier Wahl-certified grooming at Lucy Hotel in Dessie, Ethiopia. Reserve your chair in advance with zero waiting time.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            to="/booking"
            variant="primary"
            size="lg"
            icon={Calendar}
            className="shadow-xl shadow-[#E5A93C]/30 text-sm sm:text-base px-8 py-3.5 font-extrabold text-white bg-gradient-to-r from-[#E5A93C] to-[#D97706] hover:brightness-105"
          >
            BOOK AN APPOINTMENT
          </Button>
        </div>

        {/* Perks */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#6E5D52] font-semibold">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#D97706]" />
            <span>Instant Confirmation</span>
          </span>
          <span className="text-[#D5C8B8]">•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D97706]" />
            <span>Wahl Certified Barbers</span>
          </span>
          <span className="text-[#D5C8B8]">•</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#D97706]" />
            <span>Zero Waiting Time</span>
          </span>
        </div>

      </div>
    </section>
  );
}
