import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Scissors, AlertTriangle } from 'lucide-react';

import { MOCK_SERVICES } from '../data/servicesData';
import { MOCK_BARBERS } from '../data/barbersData';
import {
  formatDateKey,
  formatDisplayDate,
  bookSlot,
  cancelBooking,
  getBarberTimeSlots,
  getSlotStatus,
  isSlotInPast,
  getActiveBooking,
  subscribeToBookingStore,
} from '../data/bookingStore';

import BookingProgress from '../components/booking/BookingProgress';
import ServiceSelector from '../components/booking/ServiceSelector';
import BarberSelector from '../components/booking/BarberSelector';
import DateSelector from '../components/booking/DateSelector';
import TimeSlotSelector from '../components/booking/TimeSlotSelector';
import CustomerDetailsForm from '../components/booking/CustomerDetailsForm';
import PaymentSection from '../components/booking/PaymentSection';
import BookingSummary from '../components/booking/BookingSummary';
import BookingConfirmation from '../components/booking/BookingConfirmation';
import CancellationModal from '../components/booking/CancellationModal';

const SESSION_CONFIRMED_KEY = 'nhatty_session_confirmed_booking_v2';

export default function BookingPlaceholder() {
  const [searchParams] = useSearchParams();

  // ── 1. Page Entry: ALWAYS scroll to absolute top immediately ────
  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [searchParams]);

  // ── Booking selections (Draft State) ──────────────────────────
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [selectedBarberId, setSelectedBarberId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeId, setSelectedTimeId] = useState(null);

  // ── Customer details ──────────────────────────────────────────
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // ── Payment state ─────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [slotError, setSlotError] = useState('');
  const [activeHint, setActiveHint] = useState(null);

  // ── Confirmation state (Only true after CURRENT session confirms) ──
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ── Route & CTA Navigation Handler (Always Fresh Draft) ───────
  useEffect(() => {
    try {
      sessionStorage.removeItem(SESSION_CONFIRMED_KEY);
    } catch (e) {}

    setIsConfirming(false);
    setIsConfirmed(false);
    setBookingData(null);

    const serviceParam = searchParams.get('service');
    const barberParam = searchParams.get('barber');

    setSelectedServiceId(serviceParam && MOCK_SERVICES.find(s => s.id === serviceParam) ? serviceParam : null);
    setSelectedBarberId(barberParam && (barberParam === 'any' || MOCK_BARBERS.find(b => b.id === barberParam)) ? barberParam : null);
    setSelectedDate(null);
    setSelectedTimeId(null);
    setSlotError('');
    setActiveHint(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
    setPaymentMethod(null);
    setReceiptPreview(null);
    setReceiptFileName('');
    setReceiptError('');
    setFormErrors({});
  }, [searchParams]);

  // ── Reset slot when barber or date changes ────────────────────
  useEffect(() => {
    setSelectedTimeId(null);
    setSlotError('');
  }, [selectedBarberId, selectedDate]);

  // ── Sync bookingData live when on confirmation screen ──────────
  useEffect(() => {
    if (!isConfirmed || !bookingData?.ref) return;

    const syncLiveBooking = () => {
      const active = getActiveBooking();
      if (active && (active.ref === bookingData.ref || active.id === bookingData.id)) {
        setBookingData(active);
      }
    };

    const unsubscribe = subscribeToBookingStore(syncLiveBooking);
    window.addEventListener('nhatty_booking_store_changed', syncLiveBooking);
    window.addEventListener('storage', syncLiveBooking);

    return () => {
      unsubscribe();
      window.removeEventListener('nhatty_booking_store_changed', syncLiveBooking);
      window.removeEventListener('storage', syncLiveBooking);
    };
  }, [isConfirmed, bookingData?.ref, bookingData?.id]);

  // ── Controlled subtle scroll with visual focus highlight ──────
  const scrollToSection = useCallback((id, highlight = false) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        const navbarHeight = 70;
        const topCushion = window.innerWidth < 640 ? 100 : 130;
        const targetScrollY = window.scrollY + rect.top - navbarHeight - topCushion;
        
        window.scrollTo({
          top: Math.max(0, targetScrollY),
          behavior: 'smooth',
        });

        if (highlight) {
          el.classList.add('ring-4', 'ring-[#E5A93C]/60', 'rounded-2xl', 'transition-all', 'duration-300');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-[#E5A93C]/60');
          }, 2000);
        }
      }
    }, 80);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  const handleServiceSelect = (id) => {
    setSelectedServiceId(id);
    setActiveHint(null);
    scrollToSection('booking-barber', false);
  };

  const handleBarberSelect = (id) => {
    setSelectedBarberId(id);
    setActiveHint(null);
    scrollToSection('booking-date', false);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setActiveHint(null);
    scrollToSection('booking-time', false);
  };

  const handleSlotSelect = (timeId) => {
    setSelectedTimeId(timeId);
    setSlotError('');
    setActiveHint(null);
    scrollToSection('booking-details', false);
  };

  const handleNameChange = (val) => {
    setCustomerName(val);
    if (formErrors.name && val.trim().length >= 2) {
      setFormErrors(prev => ({ ...prev, name: null }));
    }
    setActiveHint(null);
  };

  const handlePhoneChange = (val) => {
    setCustomerPhone(val);
    const digits = val.replace(/\D/g, '');
    if (formErrors.phone && digits.length >= 9) {
      setFormErrors(prev => ({ ...prev, phone: null }));
    }
    setActiveHint(null);
  };

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    setReceiptError('');
    setActiveHint(null);
  };

  const handleReceiptUpload = (dataUrl, fileName) => {
    setReceiptPreview(dataUrl);
    setReceiptFileName(fileName);
    setReceiptError('');
    setActiveHint(null);
    if (!paymentMethod) {
      setPaymentMethod('cbe');
    }
  };

  const handleReceiptRemove = () => {
    setReceiptPreview(null);
    setReceiptFileName('');
    setReceiptError('');
  };

  // ── Smart Validation & Section Guidance ───────────────────────
  const validate = () => {
    // 1. Service check
    if (!selectedServiceId) {
      setActiveHint('Step 1: Please choose a grooming service.');
      scrollToSection('booking-service', true);
      return false;
    }

    // 2. Barber check
    if (!selectedBarberId) {
      setActiveHint('Step 2: Please select a barber or choose Any Barber.');
      scrollToSection('booking-barber', true);
      return false;
    }

    // 3. Date check
    if (!selectedDate) {
      setActiveHint('Step 3: Please choose an appointment date.');
      scrollToSection('booking-date', true);
      return false;
    }

    // 4. Time slot check
    if (!selectedTimeId) {
      setSlotError('Please choose an appointment time slot.');
      setActiveHint('Step 4: Please choose an appointment time slot.');
      scrollToSection('booking-time', true);
      return false;
    }

    // Submission-level guard: ensure chosen slot is not past/too-soon or taken
    if (selectedDate && selectedBarberId) {
      const slots = getBarberTimeSlots(selectedBarberId);
      const chosenSlot = slots.find((s) => s.timeId === selectedTimeId);
      if (chosenSlot) {
        const dateKey = formatDateKey(selectedDate);
        const status = getSlotStatus(selectedBarberId, dateKey, chosenSlot, selectedDate);
        if (status === 'past' || status === 'too-soon') {
          const err = 'This time slot is in the past or starts too soon (minimum 20 minutes advance booking required). Please choose a later time.';
          setSlotError(err);
          setActiveHint(err);
          scrollToSection('booking-time', true);
          return false;
        }
        if (status === 'booked') {
          const err = 'This appointment time was just taken by another customer. Please choose another time.';
          setSlotError(err);
          setActiveHint(err);
          scrollToSection('booking-time', true);
          return false;
        }
      }
    }

    // 5. Customer info check
    const errors = {};
    if (!customerName || customerName.trim().length < 2) {
      errors.name = 'Please enter your full name (at least 2 characters)';
    }
    const digits = (customerPhone || '').replace(/\D/g, '');
    if (!customerPhone || digits.length < 9) {
      errors.phone = `Phone number is incomplete (${digits.length}/10 digits). Please enter at least 9–10 digits.`;
    }
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (errors.name) {
        setActiveHint('Step 5: Please enter your full name (min 2 letters).');
      } else if (errors.phone) {
        setActiveHint(`Step 5: Phone number is incomplete (${digits.length}/10 digits).`);
      }
      scrollToSection('booking-details', true);
      return false;
    }

    // 6. Payment method check
    if (!paymentMethod) {
      setReceiptError('Please select CBE or Telebirr as your payment method.');
      setActiveHint('Step 6: Please choose CBE or Telebirr as your payment method.');
      scrollToSection('booking-payment', true);
      return false;
    }

    // 7. Receipt check
    if (!receiptPreview) {
      setReceiptError('Please upload a screenshot of your payment receipt.');
      setActiveHint('Step 6: Please attach your payment receipt screenshot.');
      scrollToSection('booking-payment', true);
      return false;
    }

    setActiveHint(null);
    return true;
  };

  // ── Confirm booking with double-booking race protection ────────
  const handleConfirm = async () => {
    if (!validate()) {
      return;
    }

    setIsConfirming(true);

    try {
      // Simulate realistic network latency
      await new Promise((r) => setTimeout(r, 500));

      const dateStr = formatDateKey(selectedDate);
      const dateInfo = formatDisplayDate(selectedDate);
      const service = MOCK_SERVICES.find(s => s.id === selectedServiceId);
      const dateDisplayStr = `${dateInfo.dayName === 'TODAY' ? 'Today' : dateInfo.dayName}, ${dateInfo.month} ${dateInfo.day}, ${dateInfo.year}`;
      
      const result = bookSlot(
        selectedBarberId,
        dateStr,
        selectedTimeId,
        { 
          name: customerName, 
          customerName,
          phone: customerPhone, 
          customerPhone,
          notes: customerNotes,
          customerNotes,
          serviceId: selectedServiceId,
          serviceName: service?.name || 'Service',
          dateDisplay: dateDisplayStr,
          paymentMethod,
          paymentStatus: 'Verification Pending',
          amountPaid: service?.price || 0,
          price: service?.price || 0,
          receiptFileName: receiptFileName || 'receipt.png',
          receiptPreview: receiptPreview || null,
        }
      );

      if (result.success && result.booking) {
        const b = result.booking;
        setBookingData(b);
        setIsConfirmed(true);
        setSlotError('');
        setActiveHint(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Slot collision / double-booking caught!
        const errMsg = result.error || 'Sorry, this time was just booked by another customer. Please choose another time.';
        setSlotError(errMsg);
        setActiveHint(errMsg);
        scrollToSection('booking-time', true);
      }
    } catch (err) {
      console.error('Booking confirmation error:', err);
      setSlotError('An unexpected error occurred. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  // ── Cancel booking (Releases the slot from mock database) ──────
  const handleCancelConfirm = () => {
    if (bookingData) {
      cancelBooking(bookingData.actualBarberId || bookingData.barberId, bookingData.dateStr, bookingData.timeId);
    }
    sessionStorage.removeItem(SESSION_CONFIRMED_KEY);
    setShowCancelModal(false);
    resetForm();
  };

  // ── Book Another Appointment (Leaves existing bookings in DB intact) ──
  const resetForm = () => {
    setIsConfirmed(false);
    setIsConfirming(false);
    setBookingData(null);
    setSelectedServiceId(null);
    setSelectedBarberId(null);
    setSelectedDate(null);
    setSelectedTimeId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
    setPaymentMethod(null);
    setReceiptPreview(null);
    setReceiptFileName('');
    setReceiptError('');
    setSlotError('');
    setActiveHint(null);
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Progress tracking (6 steps) ──────────────────────────────
  const phoneDigits = customerPhone.replace(/\D/g, '');
  const completedSteps = {
    service: !!selectedServiceId,
    barber: !!selectedBarberId,
    datetime: selectedDate !== null && !!selectedTimeId,
    details: customerName.trim().length >= 2 && phoneDigits.length >= 9,
    payment: !!paymentMethod && !!receiptPreview,
    confirm: isConfirmed,
  };

  return (
    <div className="min-h-screen bg-[#F4EFEB]">
      <div className="pt-24 pb-36 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Back link */}
        <div className="mb-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#6E5D52] hover:text-[#1E1915] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Page header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF8EF] border border-[#E5A93C]/20 text-xs font-bold text-[#C88A22]">
            <Scissors className="w-3.5 h-3.5" />
            <span>Nhatty Barber House • Lucy Hotel</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
            BOOK YOUR APPOINTMENT
          </h1>
          <p className="text-xs sm:text-sm text-[#6E5D52] max-w-md mx-auto">
            Select your service, barber, time slot, and complete your reservation
          </p>
        </div>

        {/* Progress bar */}
        {!isConfirmed && (
          <div className="mb-8">
            <BookingProgress completedSteps={completedSteps} />
          </div>
        )}

        {/* ── Confirmed state / Success Screen ────────────────── */}
        {isConfirmed ? (
          <>
            <BookingConfirmation
              bookingData={bookingData}
              onBookAnother={resetForm}
            />
            <CancellationModal
              isOpen={showCancelModal}
              onKeep={() => setShowCancelModal(false)}
              onCancel={handleCancelConfirm}
            />
          </>
        ) : (
          /* ── Booking form (two-column on desktop) ─────────── */
          <>
            <div className="flex gap-8">
              {/* Left: Booking steps */}
              <div className="flex-1 min-w-0 space-y-10">
                {/* Step 1: Service */}
                <ServiceSelector
                  selectedServiceId={selectedServiceId}
                  onSelect={handleServiceSelect}
                />

                {/* Step 2: Barber */}
                <BarberSelector
                  selectedBarberId={selectedBarberId}
                  onSelect={handleBarberSelect}
                />

                {/* Step 3: Date */}
                <DateSelector
                  selectedDate={selectedDate}
                  onSelect={handleDateSelect}
                />

                {/* Step 4: Time */}
                <div className="space-y-3">
                  <TimeSlotSelector
                    selectedBarberId={selectedBarberId}
                    selectedDate={selectedDate}
                    selectedTimeId={selectedTimeId}
                    onSelect={handleSlotSelect}
                  />
                  {slotError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2 text-xs text-red-700 font-medium">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>{slotError}</span>
                    </div>
                  )}
                </div>

                {/* Step 5: Customer Details */}
                <CustomerDetailsForm
                  name={customerName}
                  phone={customerPhone}
                  notes={customerNotes}
                  onNameChange={handleNameChange}
                  onPhoneChange={handlePhoneChange}
                  onNotesChange={setCustomerNotes}
                  errors={formErrors}
                />

                {/* Step 6: Payment & Receipt */}
                <PaymentSection
                  selectedServiceId={selectedServiceId}
                  paymentMethod={paymentMethod}
                  onSelectPaymentMethod={handlePaymentMethodSelect}
                  receiptPreview={receiptPreview}
                  receiptFileName={receiptFileName}
                  onReceiptUpload={handleReceiptUpload}
                  onReceiptRemove={handleReceiptRemove}
                  receiptError={receiptError}
                  setReceiptError={setReceiptError}
                />
              </div>

              {/* Right: Sticky summary sidebar on desktop */}
              <div className="hidden lg:block w-80 flex-shrink-0">
                <BookingSummary
                  selectedServiceId={selectedServiceId}
                  selectedBarberId={selectedBarberId}
                  selectedDate={selectedDate}
                  selectedTimeId={selectedTimeId}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  paymentMethod={paymentMethod}
                  receiptPreview={receiptPreview}
                  onConfirm={handleConfirm}
                  isConfirming={isConfirming}
                  activeHint={activeHint}
                />
              </div>
            </div>

            {/* Persistent bottom action bar on mobile */}
            <div className="lg:hidden">
              <BookingSummary
                selectedServiceId={selectedServiceId}
                selectedBarberId={selectedBarberId}
                selectedDate={selectedDate}
                selectedTimeId={selectedTimeId}
                customerName={customerName}
                customerPhone={customerPhone}
                paymentMethod={paymentMethod}
                receiptPreview={receiptPreview}
                onConfirm={handleConfirm}
                isConfirming={isConfirming}
                activeHint={activeHint}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
