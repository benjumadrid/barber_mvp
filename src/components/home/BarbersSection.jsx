import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import BarberCard from './BarberCard';
import { MOCK_BARBERS } from '../../data/barbersData';

export default function BarbersSection({ barbers = [] }) {
  const displayBarbers = (barbers && barbers.length > 0) ? barbers : MOCK_BARBERS;

  return (
    <section id="barbers" className="py-16 sm:py-24 bg-[#FAF6F1] border-t border-b border-[#E6DDD1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-[3px] bg-[#E5A93C] rounded-full"></span>
              <span className="text-xs uppercase tracking-[0.2em] text-[#8C4717] font-bold">
                Certified Team
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-tight">
              OUR BARBERS
            </h2>
            <p className="text-[#6E5D52] text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              All 8 of our barbers are certified professionals with 5+ years of experience delivering master cuts, beard sculpting, and facial treatments at Nhatty Barber (Dessie Branch).
            </p>
          </div>

          <Link
            to="/booking"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#8C4717] hover:text-[#C88A22] group transition-colors shrink-0"
          >
            <span>Book with Any Barber</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C88A22]" />
          </Link>
        </div>

        {/* Barbers Grid (Clean 4-column desktop layout for 8 barbers) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayBarbers.map((barber) => (
            <BarberCard key={barber.id} barber={barber} />
          ))}
        </div>

        {/* Barber Trust Assurance Note */}
        <div className="mt-10 text-center">
          <p className="text-xs sm:text-sm text-[#6E5D52]">
            Prefer a general appointment? You can also select <span className="text-[#1E1915] font-extrabold">"Any Barber"</span> during booking.
          </p>
        </div>

      </div>
    </section>
  );
}
