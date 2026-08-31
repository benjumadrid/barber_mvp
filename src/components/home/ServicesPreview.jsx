import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Award } from 'lucide-react';
import ServiceCard from './ServiceCard';

export default function ServicesPreview({ services = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Services' },
    { id: 'haircut', label: 'Haircuts' },
    { id: 'combo', label: 'Combos & Facial' },
    { id: 'beard', label: 'Beard Sculpting' },
    { id: 'vip', label: 'VIP Royal' }
  ];

  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(s => s.category === selectedCategory);

  return (
    <section id="services" className="py-16 sm:py-24 bg-[#F4EFEB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-[3px] bg-[#E5A93C] rounded-full"></span>
              <span className="text-xs uppercase tracking-[0.2em] text-[#8C4717] font-bold">
                Signature Grooming
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-tight">
              OUR SERVICES
            </h2>
            <p className="text-[#6E5D52] text-sm sm:text-base mt-1.5 max-w-xl">
              Precision haircuts, hot towel facial steam treatments, and beard sculpting tailored to perfection.
            </p>
          </div>

          <Link
            to="/booking"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#8C4717] hover:text-[#C88A22] group transition-colors"
          >
            <span>Book Appointment</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C88A22]" />
          </Link>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-[#E5A93C] to-[#D97706] text-white shadow-md'
                  : 'bg-white text-[#6E5D52] hover:text-[#1E1915] hover:bg-[#FAF6F1] border border-[#E6DDD1]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        {/* Bottom Excellence & Quality Banner */}
        <div className="mt-12 p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-white via-[#FAF6F1] to-white border border-[#E6DDD1] shadow-luxury-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center shrink-0 shadow-md shadow-[#E5A93C]/20">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-[11px] uppercase tracking-[0.2em] font-extrabold text-[#C88A22]">The Gold Standard</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C]" />
                <span className="text-[11px] text-[#6E5D52] font-semibold">Dessie Branch</span>
              </div>
              <p className="text-base sm:text-lg font-extrabold text-[#1E1915] font-['Cinzel',serif]">
                Dessie's #1 Choice for Master Grooming & Luxury Care
              </p>
              <p className="text-xs sm:text-sm text-[#6E5D52] mt-0.5 max-w-2xl">
                Uncompromising hygiene standards, precision Wahl master craftsmanship, and bespoke VIP service tailored to every client.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF6F1] border border-[#E2D7C8] text-[#8C4717] font-bold text-xs shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#C88A22]" />
            <span>100% Quality & Hygiene Standard</span>
          </div>
        </div>

      </div>
    </section>
  );
}
