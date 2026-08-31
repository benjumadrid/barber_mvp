import React, { useState } from 'react';
import { User, Phone, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CustomerDetailsForm({
  name,
  phone,
  notes,
  onNameChange,
  onPhoneChange,
  onNotesChange,
  errors = {},
}) {
  const [touched, setTouched] = useState({ name: false, phone: false });

  const digits = (phone || '').replace(/\D/g, '');
  const isPhoneValid = digits.length >= 9 && digits.length <= 13;
  const isNameValid = (name || '').trim().length >= 2;

  const handlePhoneInput = (val) => {
    onPhoneChange(val);
    if (!touched.phone) setTouched(prev => ({ ...prev, phone: true }));
  };

  const handleNameInput = (val) => {
    onNameChange(val);
    if (!touched.name) setTouched(prev => ({ ...prev, name: true }));
  };

  // Determine error messages
  const nameError = errors.name || (touched.name && name && !isNameValid ? 'Full name must be at least 2 characters' : null);
  const phoneError = errors.phone || (touched.phone && phone && !isPhoneValid ? `Phone number is incomplete (${digits.length}/10 digits). Please enter at least 9–10 digits.` : null);

  return (
    <section id="booking-details" className="scroll-mt-24 transition-all">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#E5A93C]/10 flex items-center justify-center">
          <span className="text-sm font-bold text-[#C88A22]">5</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
          YOUR DETAILS
        </h2>
      </div>

      <div className="space-y-5 bg-white border border-[#E6DDD1] rounded-2xl p-5 sm:p-6 shadow-sm">
        {/* Full Name */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#5D4A3E]">
              <User className="w-3.5 h-3.5 text-[#C88A22]" />
              Full Name <span className="text-red-500">*</span>
            </label>
            {isNameValid && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> Valid
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameInput(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              placeholder="Enter your full name"
              className={`w-full bg-[#FAF6F1]/50 border-2 rounded-xl px-4 py-3 text-sm text-[#1E1915] font-medium placeholder:text-[#C5B9AB] outline-none transition-all ${
                nameError
                  ? 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : isNameValid
                  ? 'border-emerald-300/80 focus:border-emerald-500'
                  : 'border-[#E6DDD1] focus:border-[#E5A93C] focus:bg-white focus:ring-2 focus:ring-[#E5A93C]/20'
              }`}
            />
          </div>
          {nameError ? (
            <p className="flex items-center gap-1 text-xs text-red-600 font-semibold mt-1.5 animate-[fadeIn_0.2s_ease-out]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{nameError}</span>
            </p>
          ) : (
            <p className="text-[11px] text-[#9E8B7F] mt-1">
              Please enter your first and last name for chair reservation.
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#5D4A3E]">
              <Phone className="w-3.5 h-3.5 text-[#C88A22]" />
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {phone && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isPhoneValid 
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                    : 'text-amber-700 bg-amber-50 border border-amber-200'
                }`}>
                  {digits.length} digits
                </span>
              )}
              {isPhoneValid && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Valid
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneInput(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
              placeholder="09XX XXX XXX or 07XX XXX XXX"
              className={`w-full bg-[#FAF6F1]/50 border-2 rounded-xl px-4 py-3 text-sm text-[#1E1915] font-medium placeholder:text-[#C5B9AB] outline-none transition-all ${
                phoneError
                  ? 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : isPhoneValid
                  ? 'border-emerald-300/80 focus:border-emerald-500'
                  : 'border-[#E6DDD1] focus:border-[#E5A93C] focus:bg-white focus:ring-2 focus:ring-[#E5A93C]/20'
              }`}
            />
          </div>
          {phoneError ? (
            <p className="flex items-center gap-1 text-xs text-red-600 font-semibold mt-1.5 animate-[fadeIn_0.2s_ease-out]">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{phoneError}</span>
            </p>
          ) : (
            <p className="text-[11px] text-[#9E8B7F] mt-1">
              Ethiopian mobile number (e.g., <span className="font-mono font-medium text-[#6E5D52]">0912 345 678</span> or <span className="font-mono font-medium text-[#6E5D52]">0712 345 678</span>).
            </p>
          )}
        </div>

        {/* Notes (optional) */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-[#5D4A3E] mb-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#C88A22]" />
            Special Requests / Notes <span className="text-[10px] font-normal text-[#9E8B7F]">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Any haircut preferences, fade style, or special skin considerations..."
            rows={2}
            className="w-full bg-[#FAF6F1]/50 border-2 border-[#E6DDD1] rounded-xl px-4 py-2.5 text-sm text-[#1E1915] font-medium placeholder:text-[#C5B9AB] outline-none transition-all focus:border-[#E5A93C] focus:bg-white focus:ring-2 focus:ring-[#E5A93C]/20 resize-none"
          />
        </div>
      </div>
    </section>
  );
}
