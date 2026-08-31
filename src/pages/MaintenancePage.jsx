import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Scissors, 
  Phone, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Wrench,
  Lock
} from 'lucide-react';

/**
 * Nhatty Barber House — Luxury Maintenance Screen
 * 
 * Displayed exclusively to customer traffic when MAINTENANCE_MODE = true.
 * Ensures zero exposure of private customer records while maintaining high brand prestige.
 */
export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#140F0C] text-[#FAF6F1] flex flex-col justify-between relative overflow-hidden selection:bg-[#E5A93C] selection:text-[#140F0C]">
      
      {/* Ambient Luxury Glow Effects */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[#E5A93C]/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[450px] h-[450px] bg-[#C88A22]/08 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#E5A93C_0.75px,transparent_0.75px)] [background-size:28px_28px] opacity-5 pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E5A93C] via-[#D97706] to-[#B45309] flex items-center justify-center text-white shadow-lg shadow-[#E5A93C]/20">
            <Scissors className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-widest text-lg sm:text-xl text-[#FAF6F1] font-['Cinzel',serif] leading-tight flex items-center gap-1.5">
              NHATTY
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E5A93C]"></span>
            </span>
            <span className="text-[10px] tracking-[0.25em] text-[#E5A93C] font-bold uppercase">
              Barber House
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-[#C5B9AB]">
          <div className="w-2 h-2 rounded-full bg-[#E5A93C] animate-pulse" />
          <span>System Maintenance</span>
        </div>
      </header>

      {/* Main Central Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="w-full max-w-2xl mx-auto text-center space-y-8">
          
          {/* Central Luxury Badge */}
          <div className="inline-flex items-center justify-center">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#E5A93C]/20 via-[#DF9C2F]/10 to-transparent border border-[#E5A93C]/30 flex items-center justify-center shadow-2xl shadow-[#E5A93C]/10 backdrop-blur-md">
                <Wrench className="w-10 h-10 sm:w-12 sm:h-12 text-[#E5A93C] stroke-[1.75]" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#E5A93C] flex items-center justify-center text-[#140F0C]">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Typography & Messaging */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E5A93C]/10 border border-[#E5A93C]/25 text-xs font-bold text-[#E5A93C] tracking-wider uppercase">
              <span>Scheduled System Upgrade</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#FAF6F1] font-['Cinzel',serif] leading-tight">
              WE'LL BE BACK SHORTLY
            </h1>

            <p className="text-sm sm:text-base text-[#C5B9AB] max-w-lg mx-auto leading-relaxed">
              Our online booking and digital appointment services are temporarily unavailable while we perform routine system enhancements.
            </p>
            <p className="text-xs sm:text-sm text-[#8C7A6D]">
              Please check back soon. We apologize for any inconvenience.
            </p>
          </div>

          {/* Business & Location Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 text-left">
            
            {/* Urgent Assistance / Phone */}
            <div className="bg-[#1E1915]/80 border border-white/10 hover:border-[#E5A93C]/30 rounded-2xl p-4 transition-colors">
              <div className="flex items-center gap-2.5 text-[#E5A93C] mb-1.5">
                <Phone className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Direct Assistance</span>
              </div>
              <a 
                href="tel:0975357881" 
                className="text-sm font-extrabold text-[#FAF6F1] hover:text-[#E5A93C] transition-colors block"
              >
                0975 357 881
              </a>
              <span className="text-[11px] text-[#8C7A6D] block mt-0.5">Call for walk-in availability</span>
            </div>

            {/* Location */}
            <div className="bg-[#1E1915]/80 border border-white/10 hover:border-[#E5A93C]/30 rounded-2xl p-4 transition-colors">
              <div className="flex items-center gap-2.5 text-[#E5A93C] mb-1.5">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Branch Location</span>
              </div>
              <p className="text-xs font-bold text-[#FAF6F1] leading-snug">
                Lucy Hotel • Ground Floor
              </p>
              <span className="text-[11px] text-[#8C7A6D] block mt-0.5">Dessie Branch, Ethiopia</span>
            </div>

            {/* Operating Hours */}
            <div className="bg-[#1E1915]/80 border border-white/10 hover:border-[#E5A93C]/30 rounded-2xl p-4 transition-colors">
              <div className="flex items-center gap-2.5 text-[#E5A93C] mb-1.5">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Working Hours</span>
              </div>
              <p className="text-xs font-bold text-[#FAF6F1] leading-snug">
                8:00 AM – 8:00 PM
              </p>
              <span className="text-[11px] text-[#8C7A6D] block mt-0.5">Open 7 Days a Week</span>
            </div>

          </div>

        </div>
      </main>

      {/* Footer Bar with subtle Staff Portal Link */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6E5D52] border-t border-white/5">
        <p>© {new Date().getFullYear()} Nhatty Barber House. Lucy Hotel (Ground Floor) • Dessie Branch, Ethiopia.</p>
        
        {/* Discrete Staff Access (Never in maintenance mode) */}
        <Link 
          to="/barber-login" 
          className="inline-flex items-center gap-1.5 text-[11px] text-[#8C7A6D] hover:text-[#E5A93C] transition-colors py-1 px-2.5 rounded-lg hover:bg-white/[0.04]"
        >
          <Lock className="w-3 h-3 text-[#E5A93C]" />
          <span>Authorized Staff Access</span>
        </Link>
      </footer>

    </div>
  );
}
