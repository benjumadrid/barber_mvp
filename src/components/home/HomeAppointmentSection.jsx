import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Scissors, 
  User, 
  CalendarDays, 
  Clock, 
  CreditCard, 
  Sparkles, 
  ArrowRight, 
  CheckCheck, 
  Copy, 
  Navigation, 
  CalendarCheck,
  ShieldCheck,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { 
  getActiveBooking, 
  isAppointmentPast, 
  isAppointmentActive,
  formatAppointmentRelativeDate,
  subscribeToBookingStore 
} from '../../data/bookingStore';

export default function HomeAppointmentSection() {
  const location = useLocation();

  // Load the authoritative active/persisted appointment from single source of truth
  const getAuthoritativeAppointment = useCallback(() => {
    const appt = getActiveBooking();
    if (appt && typeof appt === 'object' && appt.ref) {
      return appt;
    }
    return null;
  }, []);

  const [appointment, setAppointment] = useState(() => getAuthoritativeAppointment());
  const [copiedRef, setCopiedRef] = useState(false);

  const loadAppointment = useCallback(() => {
    const active = getAuthoritativeAppointment();
    setAppointment(active);
  }, [getAuthoritativeAppointment]);

  // Re-sync immediately on route/location changes
  useEffect(() => {
    loadAppointment();
  }, [location, loadAppointment]);

  // Multi-tier reactive synchronization listeners
  useEffect(() => {
    loadAppointment();

    // 1. In-memory subscriber for same-tab updates (create, edit, cancel)
    const unsubscribe = subscribeToBookingStore(loadAppointment);

    // 2. Custom intra-tab window event
    const handleCustomChange = () => {
      loadAppointment();
    };
    window.addEventListener('nhatty_booking_store_changed', handleCustomChange);

    // 3. Native cross-tab storage event listener
    const handleStorageChange = (e) => {
      if (!e || !e.key || e.key.startsWith('nhatty_')) {
        loadAppointment();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Focus & visibility change synchronization
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAppointment();
      }
    };
    window.addEventListener('focus', loadAppointment);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('nhatty_booking_store_changed', handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', loadAppointment);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadAppointment]);

  if (!appointment) {
    return null;
  }

  const isCancelled = 
    appointment.status === 'Cancelled' || 
    appointment.status === 'Customer Cancelled' || 
    appointment.status === 'Cancelled — Refund Completed' || 
    appointment.bookingStatus === 'Cancelled' || 
    appointment.bookingStatus === 'Customer Cancelled' || 
    appointment.bookingStatus === 'Cancelled — Refund Completed';

  const isPast = isAppointmentPast(appointment);
  const displayDateStr = formatAppointmentRelativeDate(appointment.dateStr) || appointment.dateStr;

  const handleCopyRef = (e) => {
    e.preventDefault();
    if (!appointment?.ref) return;
    navigator.clipboard.writeText(appointment.ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const paymentLabel = appointment.paymentMethod === 'cbe' 
    ? 'CBE Bank Transfer' 
    : appointment.paymentMethod === 'telebirr' 
    ? 'Telebirr Mobile Pay' 
    : 'Direct Transfer';

  const customerName = appointment.customerName || appointment.name;
  const arrivalReminder = appointment.arrivalReminder || '10 mins early';

  return (
    <section id="my-appointment" className="py-16 sm:py-24 bg-[#FAF6F1] border-t border-[#E6DDD1] relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#E5A93C]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm ${
            isCancelled
              ? 'bg-red-50 border border-red-200 text-red-700'
              : isPast
              ? 'bg-slate-100 border border-slate-300 text-slate-700'
              : 'bg-[#FAF2E3] border border-[#E5A93C]/40 text-[#8C4717]'
          }`}>
            {!isCancelled && !isPast && <Sparkles className="w-4 h-4 text-[#C88A22] animate-pulse" />}
            {isPast && !isCancelled && <CheckCircle2 className="w-4 h-4 text-slate-600" />}
            <span>
              {isCancelled 
                ? 'Reservation Cancelled' 
                : isPast 
                ? 'Recent Appointment Record' 
                : 'Your Active Chair Reservation'}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-tight">
            {isPast && !isCancelled ? 'RECENT APPOINTMENT' : 'MY APPOINTMENT'}
          </h2>

          <p className="text-sm sm:text-base text-[#6E5D52]">
            {isCancelled
              ? 'Your reservation has been cancelled. You can view your record or book a new appointment anytime.'
              : isPast
              ? 'This was your previous grooming record at Lucy Hotel (Ground Floor), Dessie.'
              : 'You have a confirmed reservation with zero waiting time at Lucy Hotel (Ground Floor), Dessie.'}
          </p>
        </div>

        {/* ── Luxury Pass Preview Card ──────────────────────── */}
        <div className="bg-white rounded-3xl shadow-luxury-lg border border-[#E2D7C8] overflow-hidden">
          
          {/* Card Header */}
          <div className="bg-gradient-to-br from-[#1E1915] via-[#28211C] to-[#171310] text-white p-6 sm:p-7 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center text-[#1A1614] shadow-sm">
                  <Scissors className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold tracking-widest uppercase font-['Cinzel',serif] text-white block leading-tight">
                    Nhatty Barber House
                  </span>
                  <span className="text-[10px] tracking-[0.2em] font-bold text-[#E5A93C] uppercase">
                    {isCancelled 
                      ? 'Reservation Cancelled' 
                      : isPast 
                      ? 'VIP Completed Session' 
                      : 'VIP Confirmed Reservation'}
                  </span>
                </div>
              </div>

              {/* Reference & Copy */}
              <div className="flex items-center gap-2.5 self-start sm:self-auto bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/15">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#C5B9AB] block">Reference</span>
                  <span className="font-mono text-sm sm:text-base font-extrabold text-white">{appointment.ref}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="p-1 rounded-lg hover:bg-white/10 text-[#E5A93C] transition-colors cursor-pointer"
                  title="Copy Reference"
                >
                  {copiedRef ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Card Body Grid */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Service */}
              <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#9E8B7F]">
                  <Scissors className="w-3.5 h-3.5 text-[#C88A22]" />
                  <span>Service</span>
                </div>
                <p className="text-sm font-extrabold text-[#1E1915] font-['Cinzel',serif] truncate">
                  {appointment.serviceName}
                </p>
                <p className="text-xs font-bold text-[#8C4717]">
                  {appointment.price || appointment.amountPaid} ETB
                </p>
              </div>

              {/* Barber */}
              <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#9E8B7F]">
                  <User className="w-3.5 h-3.5 text-[#C88A22]" />
                  <span>Master Barber</span>
                </div>
                <p className="text-sm font-extrabold text-[#1E1915] font-['Cinzel',serif] truncate">
                  {appointment.barberName}
                </p>
                <p className="text-[11px] text-[#6E5D52]">
                  Wahl Certified
                </p>
              </div>

              {/* Date */}
              <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#9E8B7F]">
                  <CalendarDays className="w-3.5 h-3.5 text-[#C88A22]" />
                  <span>Date</span>
                </div>
                <p className="text-sm font-extrabold text-[#1E1915] truncate">
                  {displayDateStr}
                </p>
                <p className="text-[11px] text-[#6E5D52]">
                  Lucy Hotel Branch
                </p>
              </div>

              {/* Time Slot */}
              <div className="bg-[#FDF8EF] border-2 border-[#E5A93C]/60 rounded-2xl p-4 space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#8C4717]">
                  <Clock className="w-3.5 h-3.5 text-[#C88A22]" />
                  <span>Time Session</span>
                </div>
                <p className="text-sm font-extrabold text-[#1E1915] truncate">
                  {appointment.timeDisplay || `${appointment.startTime} – ${appointment.endTime}`}
                </p>
                <p className={`text-[10px] font-bold flex items-center gap-1 ${
                  isCancelled 
                    ? 'text-red-600' 
                    : isPast 
                    ? 'text-[#6E5D52]' 
                    : 'text-emerald-700'
                }`}>
                  {isCancelled ? (
                    <span>Slot Released</span>
                  ) : isPast ? (
                    <span>Session Completed</span>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Arrive by {arrivalReminder}</span>
                    </>
                  )}
                </p>
              </div>

            </div>

            {/* Payment & Verification Status Strip */}
            <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-[#C88A22] flex-shrink-0" />
                <span className="text-[#6E5D52]">
                  Payment Method: <span className="font-bold text-[#1E1915]">{paymentLabel}</span>
                </span>
              </div>

              {appointment.paymentStatus === 'Verified' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                  Verified ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C4717] bg-[#FAF2E3] border border-[#E5A93C]/40 px-3 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-[#C88A22]" />
                  Verification Pending
                </span>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                to="/my-appointment"
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] shadow-lg shadow-[#E5A93C]/25 hover:shadow-[#E5A93C]/40 hover:brightness-105 active:scale-[0.98] transition-all"
              >
                <CalendarCheck className="w-4 h-4 stroke-[2.5]" />
                <span>{isCancelled ? 'VIEW CANCELLED RECORD & HELP' : isPast ? 'VIEW RECENT APPOINTMENT RECORD' : 'VIEW & MANAGE FULL VIP PASS'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </Link>

              <a
                href="https://maps.google.com/?q=Lucy+Hotel+Dessie+Ethiopia"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border border-[#E6DDD1] bg-white text-[#1E1915] font-bold text-sm hover:bg-[#FAF6F1] transition-colors"
              >
                <Navigation className="w-4 h-4 text-[#C88A22]" />
                <span>Directions to Lucy Hotel</span>
              </a>
            </div>

          </div>

          {/* Card Footer Stub */}
          <div className="bg-[#FAF6F1] border-t border-[#E6DDD1] px-6 py-3.5 flex items-center justify-between text-xs text-[#9E8B7F]">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C88A22]" />
              <span className="font-semibold text-[#6E5D52]">Ground Floor, Lucy Hotel • Dessie</span>
            </div>
            <span className="text-[11px] font-bold text-[#8C4717]">Guest: {customerName}</span>
          </div>

        </div>

      </div>
    </section>
  );
}
