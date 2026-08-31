import React from 'react';
import { Scissors, User, CalendarDays, Clock, ArrowRight, ShieldCheck, CreditCard, FileCheck2, Loader2, AlertCircle } from 'lucide-react';
import { MOCK_SERVICES } from '../../data/servicesData';
import { MOCK_BARBERS } from '../../data/barbersData';
import { getBarberTimeSlots, formatDisplayDate } from '../../data/bookingStore';

function SummaryRow({ icon: Icon, label, value, highlight = false, badge = null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-[#FAF6F1] border border-[#E6DDD1] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-[#C88A22]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider font-bold text-[#9E8B7F]">{label}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-sm font-semibold truncate ${
            highlight ? 'text-[#1E1915]' : value ? 'text-[#1E1915]' : 'text-[#C5B9AB] italic'
          }`}>
            {value || 'Not selected'}
          </p>
          {badge}
        </div>
      </div>
    </div>
  );
}

export default function BookingSummary({
  selectedServiceId,
  selectedBarberId,
  selectedDate,
  selectedTimeId,
  customerName,
  customerPhone,
  paymentMethod,
  receiptPreview,
  onConfirm,
  isConfirming = false,
  activeHint = null,
}) {
  const service = MOCK_SERVICES.find(s => s.id === selectedServiceId);
  const barber = selectedBarberId === 'any'
    ? { name: 'Any Available Barber' }
    : MOCK_BARBERS.find(b => b.id === selectedBarberId);
  
  const barberSlots = selectedBarberId ? getBarberTimeSlots(selectedBarberId) : [];
  const slot = barberSlots.find(s => s.timeId === selectedTimeId) || null;
  const dateDisplay = selectedDate ? formatDisplayDate(selectedDate) : null;

  const dateStr = dateDisplay
    ? `${dateDisplay.dayName === 'TODAY' ? 'Today' : dateDisplay.dayName}, ${dateDisplay.month} ${dateDisplay.day}`
    : null;

  const paymentDisplay = paymentMethod === 'cbe' 
    ? 'CBE Bank Transfer' 
    : paymentMethod === 'telebirr' 
    ? 'Telebirr Mobile Pay' 
    : null;

  const phoneDigits = (customerPhone || '').replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length >= 9 && phoneDigits.length <= 13;
  const isNameValid = (customerName || '').trim().length >= 2;

  const isComplete = Boolean(
    service && 
    barber && 
    selectedDate && 
    slot &&
    isNameValid &&
    isPhoneValid &&
    paymentMethod &&
    receiptPreview
  );

  const getMissingStepHint = () => {
    if (!service) return 'Step 1: Please choose a service';
    if (!barber) return 'Step 2: Please select a barber';
    if (!selectedDate) return 'Step 3: Please choose an appointment date';
    if (!slot) return 'Step 4: Please choose an appointment time slot';
    if (!customerName || customerName.trim().length < 2) return 'Step 5: Please enter your full name (min 2 letters)';
    if (!customerPhone || !isPhoneValid) return `Step 5: Phone number too short (${phoneDigits.length}/10 digits)`;
    if (!paymentMethod) return 'Step 6: Please select CBE or Telebirr';
    if (!receiptPreview) return 'Step 6: Please attach payment receipt screenshot';
    return null;
  };

  const missingHint = activeHint || getMissingStepHint();

  return (
    <>
      {/* Desktop Summary — sticky sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-28">
          <div className="bg-white border border-[#E6DDD1] rounded-3xl p-6 shadow-luxury-md">
            {/* Header */}
            <h3 className="text-sm font-bold text-[#1E1915] font-['Cinzel',serif] tracking-wide mb-5 pb-3 border-b border-[#EFE9E2]">
              BOOKING SUMMARY
            </h3>

            {/* Summary rows */}
            <div className="space-y-4 mb-6">
              <SummaryRow icon={Scissors} label="Service" value={service?.name} />
              <SummaryRow icon={User} label="Barber" value={barber?.name} />
              <SummaryRow icon={CalendarDays} label="Date" value={dateStr} />
              <SummaryRow icon={Clock} label="Time" value={slot?.display} />
              <SummaryRow 
                icon={CreditCard} 
                label="Payment" 
                value={paymentDisplay} 
                badge={receiptPreview ? (
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Receipt Attached ✓
                  </span>
                ) : null}
              />
            </div>

            {/* Price */}
            {service && (
              <div className="flex items-center justify-between py-3 border-t border-[#EFE9E2] mb-5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6E5D52]">Amount to Pay</span>
                <span className="text-xl font-extrabold text-[#1E1915]">
                  {service.price} <span className="text-xs font-semibold text-[#6E5D52]">ETB</span>
                </span>
              </div>
            )}

            {/* Missing Step Guide Notice */}
            {!isComplete && missingHint && (
              <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-800 animate-[fadeIn_0.2s_ease-out]">
                <AlertCircle className="w-4 h-4 text-[#C88A22] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Next Step Needed:</span>
                  <span className="text-[11px] text-[#8C4717]">{missingHint}</span>
                </div>
              </div>
            )}

            {/* Active Error Alert */}
            {activeHint && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-semibold animate-[fadeIn_0.2s_ease-out]">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{activeHint}</span>
              </div>
            )}

            {/* Confirm button */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-extrabold text-sm tracking-wide transition-all duration-200 cursor-pointer ${
                isConfirming
                  ? 'bg-[#E5A93C] text-[#1A1614] opacity-90 cursor-wait'
                  : isComplete
                  ? 'bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] shadow-lg shadow-[#E5A93C]/25 hover:shadow-[#E5A93C]/40 hover:brightness-105 active:scale-[0.98]'
                  : 'bg-gradient-to-r from-[#FAF2E3] to-[#FDF8EF] text-[#8C4717] border-2 border-[#E5A93C]/50 hover:border-[#E5A93C] shadow-xs active:scale-[0.99]'
              }`}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>CONFIRMING RESERVATION...</span>
                </>
              ) : isComplete ? (
                <>
                  <span>COMPLETE & CONFIRM APPOINTMENT</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              ) : (
                <>
                  <span>COMPLETE DETAILS TO CONFIRM</span>
                  <ArrowRight className="w-4 h-4 stroke-[2]" />
                </>
              )}
            </button>

            {/* Secure badge */}
            <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-[#9E8B7F]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Your chair is guaranteed at Lucy Hotel</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Persistent Bottom Action Bar (Desktop & Mobile) ──────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E6DDD1] shadow-[0_-4px_25px_rgba(60,44,30,0.12)]">
        {/* Desktop Sticky Bottom Bar */}
        <div className="hidden lg:flex items-center justify-between max-w-6xl mx-auto px-6 py-3 gap-6">
          <div className="flex items-center gap-3 text-xs text-[#5D4A3E] min-w-0 overflow-hidden">
            <span className="font-extrabold text-[#1E1915] truncate">
              {service ? service.name : '1. Service'}
            </span>
            <span className="text-[#C5B9AB]">·</span>
            <span className="text-[#6E5D52] truncate">
              {barber ? barber.name : '2. Barber'}
            </span>
            <span className="text-[#C5B9AB]">·</span>
            <span className="text-[#6E5D52] whitespace-nowrap">
              {dateStr || '3. Date'}
            </span>
            <span className="text-[#C5B9AB]">·</span>
            <span className="text-[#6E5D52] whitespace-nowrap">
              {slot ? slot.startTime : '4. Time'}
            </span>
            <span className="text-[#C5B9AB]">·</span>
            <span className={`whitespace-nowrap font-medium ${isNameValid && isPhoneValid ? 'text-emerald-700 font-bold' : 'text-[#8C4717]'}`}>
              {isNameValid && isPhoneValid ? '5. Details ✓' : !isPhoneValid && customerPhone ? `5. Phone (${phoneDigits.length}/10)` : '5. Details'}
            </span>
            {receiptPreview && (
              <>
                <span className="text-[#C5B9AB]">·</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                  <FileCheck2 className="w-3 h-3" /> Receipt ✓
                </span>
              </>
            )}
            {service && (
              <>
                <span className="text-[#C5B9AB]">·</span>
                <span className="font-extrabold text-[#C88A22] whitespace-nowrap">
                  {service.price} ETB
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              isConfirming
                ? 'bg-[#E5A93C] text-[#1A1614] opacity-90 cursor-wait'
                : isComplete
                ? 'bg-gradient-to-r from-[#E5A93C] to-[#D97706] text-[#1A1614] shadow-md shadow-[#E5A93C]/20 hover:shadow-[#E5A93C]/35 active:scale-[0.98]'
                : 'bg-gradient-to-r from-[#FAF2E3] to-[#FDF8EF] text-[#8C4717] border border-[#E5A93C]/60 hover:border-[#E5A93C]'
            }`}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>CONFIRMING...</span>
              </>
            ) : isComplete ? (
              <>
                <span>COMPLETE & CONFIRM APPOINTMENT</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            ) : (
              <>
                <span>{missingHint ? `Next: ${missingHint}` : 'COMPLETE DETAILS'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2]" />
              </>
            )}
          </button>
        </div>

        {/* Mobile Sticky Bottom Bar */}
        <div className="lg:hidden px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8C4717] truncate">
              {isComplete ? 'Ready to confirm' : missingHint ? missingHint : 'Step needed'}
            </p>
            {service ? (
              <p className="text-xs font-bold text-[#1E1915] truncate">
                {service.name} • {service.price} ETB
                {slot ? ` • ${slot.startTime}` : ''}
              </p>
            ) : (
              <p className="text-xs text-[#9E8B7F]">Select service to start</p>
            )}
          </div>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
              isConfirming
                ? 'bg-[#E5A93C] text-[#1A1614] opacity-90 cursor-wait'
                : isComplete
                ? 'bg-gradient-to-r from-[#E5A93C] to-[#D97706] text-[#1A1614] shadow-md active:scale-[0.98]'
                : 'bg-[#FAF2E3] text-[#8C4717] border border-[#E5A93C]/50'
            }`}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Confirming...</span>
              </>
            ) : (
              <>
                <span>{isComplete ? 'Confirm' : 'Check Steps'}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
