import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Scissors, 
  User, 
  CalendarDays, 
  Clock, 
  Hash, 
  CreditCard, 
  FileCheck2, 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  CalendarCheck,
  ShieldCheck
} from 'lucide-react';

function ConfirmRow({ icon: Icon, label, value, badge = null }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FAF6F1] border border-[#E6DDD1] flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#C88A22]" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-[#9E8B7F]">{label}</p>
          <p className="text-sm font-semibold text-[#1E1915]">{value}</p>
        </div>
      </div>
      {badge}
    </div>
  );
}

export default function BookingConfirmation({
  bookingData,
  onBookAnother,
}) {
  if (!bookingData) return null;

  const paymentLabel = bookingData.paymentMethod === 'cbe' 
    ? 'CBE Bank Transfer' 
    : bookingData.paymentMethod === 'telebirr' 
    ? 'Telebirr Mobile Pay' 
    : 'Direct Transfer';

  const customerName = bookingData.customerName || bookingData.name;
  const serviceName = bookingData.serviceName;
  const barberName = bookingData.barberName;
  const dateDisplay = bookingData.dateDisplay;
  const timeDisplay = bookingData.timeDisplay;
  const arrivalReminder = bookingData.arrivalReminder || '10 mins early';
  const price = bookingData.price || bookingData.amountPaid || 0;

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Success animation */}
      <div className="mb-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 flex items-center justify-center mb-4 animate-[bounceIn_0.5s_ease-out]">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-wide mb-2">
          APPOINTMENT RESERVED
        </h2>
        <p className="text-sm text-[#6E5D52]">
          Your appointment has been confirmed and reserved. We look forward to seeing you at Lucy Hotel!
        </p>
      </div>

      {/* Arrival Reminder Banner */}
      <div className="bg-gradient-to-r from-[#FDF8EF] to-[#FAF2E3] border-2 border-[#E5A93C]/50 rounded-2xl p-4 sm:p-5 text-left mb-6 shadow-luxury-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E5A93C] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C88A22] block">
              Arrival Reminder
            </span>
            <p className="text-sm font-bold text-[#1E1915]">
              Please arrive by <span className="text-[#C88A22] font-extrabold">{arrivalReminder}</span>
            </p>
            <p className="text-xs text-[#6E5D52] mt-0.5">
              Please arrive 10 minutes before your {bookingData.startTime || timeDisplay} appointment at Lucy Hotel, Ground Floor.
            </p>
          </div>
        </div>
      </div>

      {/* Booking details card */}
      <div className="bg-white border border-[#E6DDD1] rounded-2xl p-6 shadow-luxury-md text-left mb-6 space-y-4">
        <div className="divide-y divide-[#EFE9E2]">
          <ConfirmRow 
            icon={Hash} 
            label="Booking Reference" 
            value={bookingData.ref} 
            badge={
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Confirmed
              </span>
            }
          />
          {customerName && (
            <ConfirmRow icon={User} label="Customer Name" value={customerName} />
          )}
          <ConfirmRow icon={Scissors} label="Service" value={serviceName} />
          <ConfirmRow icon={User} label="Barber" value={barberName} />
          <ConfirmRow icon={CalendarDays} label="Date" value={dateDisplay} />
          <ConfirmRow icon={Clock} label="Appointment Time" value={timeDisplay} />
          <ConfirmRow 
            icon={CreditCard} 
            label="Payment Method" 
            value={paymentLabel}
            badge={
              bookingData.paymentStatus === 'Verified' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                  Verified ✓
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C4717] bg-[#FAF2E3] border border-[#E5A93C]/40 px-2.5 py-0.5 rounded-full">
                  <Clock className="w-3 h-3 text-[#C88A22]" />
                  Verification Pending
                </span>
              )
            }
          />
        </div>

        {/* Verification Notice */}
        <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-xl p-3.5 text-xs text-[#5D4A3E]">
          <div className="flex items-start gap-2">
            {bookingData.paymentStatus === 'Verified' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5 stroke-[2.5]" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#C88A22] flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-[#1E1915] mb-0.5">
                {bookingData.paymentStatus === 'Verified' ? 'Payment Verified ✓' : 'Payment Submitted · Verification Pending'}
              </p>
              <p className="text-[11px] text-[#6E5D52] leading-relaxed">
                {bookingData.paymentStatus === 'Verified'
                  ? `Your payment receipt for reference ${bookingData.ref} has been reviewed and verified by Nhatty Barber House staff.`
                  : `The Nhatty Barber House receptionist will review and verify your payment receipt against reference `}
                {bookingData.paymentStatus !== 'Verified' && (
                  <span className="font-mono font-bold text-[#1E1915]">{bookingData.ref}</span>
                )}
                {bookingData.paymentStatus !== 'Verified' && '.'}
              </p>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t border-[#EFE9E2]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6E5D52]">Amount Paid</span>
          <span className="text-xl font-extrabold text-[#1E1915]">
            {price} <span className="text-xs font-semibold text-[#6E5D52]">ETB</span>
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {/* Primary: VIEW MY APPOINTMENT */}
        <Link
          to="/my-appointment"
          className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] shadow-lg shadow-[#E5A93C]/25 hover:shadow-[#E5A93C]/40 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
        >
          <CalendarCheck className="w-4 h-4 stroke-[2.5]" />
          <span>VIEW MY APPOINTMENT</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </Link>

        {/* Secondary: Book Another Appointment */}
        <button
          type="button"
          onClick={onBookAnother}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-[#E5A93C]/60 bg-[#FDF8EF] text-[#C88A22] font-bold text-sm hover:bg-[#FAF0DD] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Book Another Appointment
        </button>

        {/* Tertiary: Back to Home */}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#E6DDD1] bg-white text-[#6E5D52] font-semibold text-sm hover:bg-[#FAF6F1] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {/* Bounce keyframes */}
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
