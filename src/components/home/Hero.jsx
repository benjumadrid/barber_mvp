import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, MapPin, Clock, Calendar, Shield } from 'lucide-react';
import heroBarberImg from '../../assets/hero_barber2.jpg';

export default function Hero({ shopInfo }) {
  return (
    <section className="relative w-full min-h-screen lg:h-screen lg:max-h-screen bg-white pt-[68px] lg:pt-[72px] flex flex-col justify-center overflow-hidden">

      {/* Subtle warm gold ambient glows */}
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(229,169,60,0.15) 0%, transparent 70%)' }}
      />

      <div className="w-full h-full flex-1 grid grid-cols-1 lg:grid-cols-[50%_50%] xl:grid-cols-[48%_52%] items-stretch">

        {/* ══════════════════════════════════════
            LEFT — Bold, Large & Spacious Content Area
        ══════════════════════════════════════ */}
        <div className="flex flex-col justify-center px-6 sm:px-12 lg:pl-16 lg:pr-10 xl:pl-24 xl:pr-14 py-6 lg:py-4 max-w-2xl xl:max-w-3xl mx-auto lg:mx-0 w-full h-full">
          <div className="space-y-4 sm:space-y-5 lg:space-y-4 xl:space-y-5 my-auto">

            {/* ─ Floating Circular Hygiene Badge (Large) ─ */}
            <div className="relative w-[92px] h-[92px] sm:w-[104px] sm:h-[104px]">
              {/* Outer spinning dashed gold ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: '2px dashed #E5A93C',
                  animation: 'badgeSpin 12s linear infinite',
                }}
              />

              {/* Inner stable dark disc */}
              <div
                className="absolute inset-[6px] rounded-full flex flex-col items-center justify-center text-center gap-0.5"
                style={{
                  background: '#0B0A08',
                  border: '1.5px solid rgba(229,169,60,0.55)',
                  boxShadow: '0 4px 22px rgba(0,0,0,0.25)',
                }}
              >
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#E5A93C' }} />
                <p
                  className="font-extrabold leading-tight uppercase"
                  style={{ fontSize: '8px', color: '#FFFFFF', letterSpacing: '0.08em' }}
                >
                  100%<br />Hygiene
                </p>
                <p
                  className="font-bold uppercase"
                  style={{ fontSize: '7px', color: '#E5A93C', letterSpacing: '0.12em' }}
                >
                  Top Quality
                </p>
              </div>
            </div>

            {/* ─ Certification Badge ─ */}
            <div
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full text-xs sm:text-[13px] font-bold tracking-wider"
              style={{
                background: 'rgba(229,169,60,0.08)',
                border: '1px solid rgba(229,169,60,0.25)',
              }}
            >
              <span className="flex items-center gap-1.5" style={{ color: '#D97706' }}>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                WAHL CERTIFIED
              </span>
              <span className="w-px h-3" style={{ background: 'rgba(229,169,60,0.3)' }} />
              <span className="flex items-center gap-1.5" style={{ color: '#6B5A4E' }}>
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#E5A93C' }} />
                Lucy Hotel · Dessie Branch
              </span>
            </div>

            {/* ─ Main Headline (Big & Bold) ─ */}
            <div className="space-y-1">
              <h1
                className="font-extrabold tracking-tight leading-[0.98] uppercase"
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 'clamp(2.8rem, 4.8vw, 4.6rem)',
                  color: '#111111',
                }}
              >
                Look Good.
                <br />
                Feel Good.
              </h1>
              <p
                className="font-bold italic leading-snug pt-1"
                style={{
                  fontSize: 'clamp(1.5rem, 2.6vw, 2.3rem)',
                  color: '#E5A93C',
                }}
              >
                Be Your Best.
              </p>
              <div
                className="w-12 h-0.5 rounded-full mt-2.5"
                style={{ backgroundColor: '#E5A93C', opacity: 0.6 }}
              />
            </div>

            {/* ─ Description (Original Text, Bold & Large) ─ */}
            <p
              className="text-sm sm:text-[15px] lg:text-base leading-relaxed max-w-lg"
              style={{ color: '#6B5A4E' }}
            >
              Professional cuts. Premium service. Every time.
              Bespoke grooming experience with a respected
              master barber at Nhatty Barber House.
            </p>

            {/* ─ Information Rows (Large & Clear) ─ */}
            <div className="space-y-2.5 pt-1">

              <div className="flex items-center gap-3.5">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(229,169,60,0.1)', border: '1px solid rgba(229,169,60,0.2)' }}
                >
                  <Clock className="w-4 h-4" style={{ color: '#E5A93C' }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#B5A090' }}>
                    Opening Hours
                  </p>
                  <p className="text-sm sm:text-[15px] font-bold leading-tight" style={{ color: '#1A1614' }}>
                    8:00 AM – 8:00 PM <span className="text-xs font-normal text-[#8A786A]">· Mon – Sun</span>
                  </p>
                </div>
              </div>

              <div className="h-px" style={{ background: 'rgba(0,0,0,0.06)' }} />

              <div className="flex items-center gap-3.5">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(229,169,60,0.1)', border: '1px solid rgba(229,169,60,0.2)' }}
                >
                  <MapPin className="w-4 h-4" style={{ color: '#E5A93C' }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#B5A090' }}>
                    Location
                  </p>
                  <p className="text-sm sm:text-[15px] font-bold leading-tight" style={{ color: '#1A1614' }}>
                    Lucy Hotel <span className="text-xs font-normal text-[#8A786A]">· Dessie Branch, Ethiopia</span>
                  </p>
                </div>
              </div>

              <div className="h-px" style={{ background: 'rgba(0,0,0,0.06)' }} />

              <div className="flex items-center gap-3.5">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(229,169,60,0.1)', border: '1px solid rgba(229,169,60,0.2)' }}
                >
                  <Calendar className="w-4 h-4" style={{ color: '#E5A93C' }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#B5A090' }}>
                    Book by Appointment
                  </p>
                  <p className="text-sm sm:text-[15px] font-bold leading-tight" style={{ color: '#1A1614' }}>
                    Zero Wait Time <span className="text-xs font-normal text-[#8A786A]">· Instant online booking</span>
                  </p>
                </div>
              </div>

            </div>

            {/* ─ Single CTA (Large & Prominent) ─ */}
            <div className="pt-2">
              <Link
                to="/booking"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-extrabold text-sm sm:text-[15px] tracking-wider transition-all duration-200 active:scale-[0.98] hover:brightness-110 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #E5A93C, #D97706)',
                  color: '#111111',
                  boxShadow: '0 8px 25px rgba(229,169,60,0.32)',
                }}
              >
                BOOK YOUR APPOINTMENT
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </Link>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════
            RIGHT — Seamless Full-Height Photo
        ══════════════════════════════════════ */}
        <div className="relative w-full h-[450px] sm:h-[550px] lg:h-full min-h-full overflow-hidden">
          <img
            src={heroBarberImg}
            alt="Nhatty Barber House – Professional Master Cut"
            className="w-full h-full object-cover object-[50%_15%] block"
            loading="eager"
          />
        </div>

      </div>

      {/* Keyframe for badge outer ring spin */}
      <style>{`
        @keyframes badgeSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

    </section>
  );
}