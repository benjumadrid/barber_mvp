import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Scissors, 
  User, 
  CalendarDays, 
  Clock, 
  CreditCard, 
  FileCheck2, 
  XCircle, 
  CalendarX, 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Edit3, 
  Loader2, 
  AlertTriangle,
  Info,
  ShieldCheck,
  Check,
  Copy,
  CheckCheck,
  MapPin,
  CalendarPlus,
  Navigation,
  Eye,
  X,
  CheckCircle2, 
  Phone,
  UploadCloud,
  ShieldAlert
} from 'lucide-react';

import { MOCK_SERVICES } from '../data/servicesData';
import { MOCK_BARBERS } from '../data/barbersData';
import { 
  getMyAppointment, 
  updateAppointment, 
  cancelAppointment,
  submitAdditionalPaymentReceipt,
  isAppointmentPast,
  isAppointmentActive,
  formatAppointmentRelativeDate,
  getAppointmentLifecycle
} from '../services/mockApi';
import { 
  APPOINTMENT_EDIT_WINDOW_MINUTES,
  formatDateKey, 
  formatDisplayDate,
  getActiveBooking,
  saveActiveBooking,
  getAllAppointments,
  subscribeToBookingStore,
} from '../data/bookingStore';

import ServiceSelector from '../components/booking/ServiceSelector';
import BarberSelector from '../components/booking/BarberSelector';
import DateSelector from '../components/booking/DateSelector';
import TimeSlotSelector from '../components/booking/TimeSlotSelector';
import CancellationModal from '../components/booking/CancellationModal';
import ReceiptZoomViewer from '../components/common/ReceiptZoomViewer';

export default function MyAppointmentPage() {
  const location = useLocation();
  const [appointment, setAppointment] = useState(() => getActiveBooking());
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceiptTab, setActiveReceiptTab] = useState('original'); // 'original' | 'additional'

  // ── Edit draft selections ─────────────────────────────────────
  const [editServiceId, setEditServiceId] = useState(null);
  const [editBarberId, setEditBarberId] = useState(null);
  const [editDate, setEditDate] = useState(null);
  const [editTimeId, setEditTimeId] = useState(null);
  const [editRefundMethod, setEditRefundMethod] = useState('telebirr');
  const [editRefundAccount, setEditRefundAccount] = useState('');

  // ── Additional Payment Receipt Upload State ───────────────────
  const [showAdditionalReceiptModal, setShowAdditionalReceiptModal] = useState(false);
  const [additionalReceiptFile, setAdditionalReceiptFile] = useState(null);
  const [additionalReceiptPreview, setAdditionalReceiptPreview] = useState(null);
  const [additionalReceiptError, setAdditionalReceiptError] = useState('');
  const [isSubmittingAdditional, setIsSubmittingAdditional] = useState(false);

  // ── Countdown timer for 11-minute editing window ──────────────
  const [currentTime, setCurrentTime] = useState(Date.now());

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Fetch appointment immediately and synchronously from single source of truth
  const fetchAppointment = useCallback(() => {
    const appt = getActiveBooking();
    setAppointment(appt);
    setLoading(false);
  }, []);

  // Sync on route / location change
  useEffect(() => {
    fetchAppointment();
  }, [location, fetchAppointment]);

  useEffect(() => {
    fetchAppointment();

    // 1. In-memory subscriber for same-tab / immediate booking mutations (create, edit, cancel)
    const unsubscribe = subscribeToBookingStore(() => {
      fetchAppointment();
    });

    // 2. Same-window custom event listener
    const handleCustomChange = () => {
      fetchAppointment();
    };
    window.addEventListener('nhatty_booking_store_changed', handleCustomChange);

    // 3. Cross-tab native storage event listener
    const handleStorageChange = (e) => {
      if (!e || !e.key || e.key.startsWith('nhatty_')) {
        fetchAppointment();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Focus & visibility synchronization
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAppointment();
      }
    };
    window.addEventListener('focus', fetchAppointment);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('nhatty_booking_store_changed', handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', fetchAppointment);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchAppointment]);

  // Live timer tick every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate remaining edit window seconds (with graceful fallback for legacy sessions)
  const getRemainingEditSeconds = () => {
    if (!appointment) return 0;
    
    let deadlineMs = 0;
    if (appointment.editDeadline) {
      deadlineMs = new Date(appointment.editDeadline).getTime();
    } else if (appointment.createdAt) {
      deadlineMs = new Date(appointment.createdAt).getTime() + APPOINTMENT_EDIT_WINDOW_MINUTES * 60 * 1000;
    } else {
      deadlineMs = currentTime + APPOINTMENT_EDIT_WINDOW_MINUTES * 60 * 1000;
    }

    if (!deadlineMs || isNaN(deadlineMs)) return 0;
    return Math.max(0, Math.floor((deadlineMs - currentTime) / 1000));
  };

  const remainingEditSeconds = getRemainingEditSeconds();
  const isEditWindowActive = remainingEditSeconds > 0 && (appointment?.status === 'Confirmed' || appointment?.bookingStatus === 'Confirmed');

  const formatCountdown = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Copy booking reference
  const handleCopyRef = () => {
    if (!appointment?.ref) return;
    navigator.clipboard.writeText(appointment.ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Add to Calendar (.ics file generator)
  const handleAddToCalendar = () => {
    if (!appointment) return;
    const title = `Nhatty Barber House - ${appointment.serviceName || 'Grooming'}`;
    const location = 'Lucy Hotel (Ground Floor), Dessie, Ethiopia';
    const description = `Appointment with ${appointment.barberName} for ${appointment.serviceName}. Ref: ${appointment.ref}. Please arrive 10 minutes early.`;
    
    const calendarText = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${title}\nDESCRIPTION:${description}\nLOCATION:${location}\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([calendarText], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nhatty_Barber_${appointment.ref}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Start Editing ─────────────────────────────────────────────
  const handleStartEditing = () => {
    if (!isEditWindowActive) return;
    setEditServiceId(appointment.serviceId || 'srv-1');
    setEditBarberId(appointment.barberId || appointment.actualBarberId || 'barber-1');
    
    if (appointment.dateStr) {
      const [y, m, d] = appointment.dateStr.split('-').map(Number);
      setEditDate(new Date(y, m - 1, d));
    } else {
      setEditDate(new Date());
    }

    setEditTimeId(appointment.timeId || null);
    setEditRefundMethod(appointment.refundMethod || 'telebirr');
    setEditRefundAccount(appointment.refundAccount || '');
    setEditError('');
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditError('');
  };

  // ── Confirm Edit Changes ──────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editServiceId || !editBarberId || !editDate || !editTimeId) {
      setEditError('Please select your desired service, barber, date, and appointment time.');
      return;
    }

    const newService = MOCK_SERVICES.find(s => s.id === editServiceId);
    const isOriginalVerified = appointment.paymentStatus === 'Verified' || (Number(appointment.paidAmount) > 0);
    const verifiedPaid = isOriginalVerified 
      ? (appointment.paidAmount !== undefined ? Number(appointment.paidAmount) : (Number(appointment.price) || 0))
      : 0;
    const newPrice = newService?.price || 0;
    const baselinePrice = appointment.originalPrice || appointment.price || (isOriginalVerified ? verifiedPaid : 400);
    const priceDiff = newPrice - baselinePrice;

    setIsUpdating(true);
    setEditError('');

    const newDateStr = formatDateKey(editDate);
    const dateInfo = formatDisplayDate(editDate);
    const newBarber = MOCK_BARBERS.find(b => b.id === editBarberId);
    const dateDisplayStr = `${dateInfo.dayName === 'TODAY' ? 'Today' : dateInfo.dayName}, ${dateInfo.month} ${dateInfo.day}, ${dateInfo.year}`;

    const updatePayload = {
      serviceId: editServiceId,
      serviceName: newService?.name || 'Service',
      barberId: editBarberId,
      barberName: newBarber?.name || 'Barber',
      dateStr: newDateStr,
      dateDisplay: dateDisplayStr,
      timeId: editTimeId,
      price: newPrice,
      refundMethod: null,
      refundAccount: null,
    };

    const res = await updateAppointment(appointment.id || appointment.ref, updatePayload);

    if (res.success && res.appointment) {
      setAppointment(res.appointment);
      setIsEditing(false);
      setIsUpdating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setEditError(res.error || 'Unable to update appointment. Please choose another time slot.');
      setIsUpdating(false);
    }
  };

  // ── Cancel Appointment ────────────────────────────────────────
  const handleCancelConfirm = async (refundDetails = {}) => {
    if (appointment) {
      const cancelled = await cancelAppointment(appointment.id || appointment.ref, refundDetails);
      setAppointment(cancelled);
    }
    setShowCancelModal(false);
    setIsEditing(false);
  };

  // ── Additional Payment Receipt Handlers ───────────────────────
  const handleAdditionalFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdditionalReceiptError('');

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setAdditionalReceiptError('Please upload an image file (JPG, PNG, or WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAdditionalReceiptError('Image size exceeds 5MB. Please choose a smaller file.');
      return;
    }

    setAdditionalReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawDataUrl = evt.target.result;
      if (typeof window === 'undefined' || !window.Image) {
        setAdditionalReceiptPreview(rawDataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Ultra high-definition canvas compression (max 1800px, 0.88 quality) to ensure razor-sharp text
        // when zooming in to inspect fine numbers/accounts, while maintaining light local storage footprint
        const maxDimension = 1800;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAdditionalReceiptPreview(compressedDataUrl);
        } catch (canvasErr) {
          setAdditionalReceiptPreview(rawDataUrl);
        }
      };
      img.onerror = () => {
        setAdditionalReceiptPreview(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setAdditionalReceiptError('Failed to read receipt image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAdditionalReceipt = async () => {
    if (!additionalReceiptPreview) {
      setAdditionalReceiptError('Please select a receipt screenshot first.');
      return;
    }

    setIsSubmittingAdditional(true);
    setAdditionalReceiptError('');

    const res = await submitAdditionalPaymentReceipt(appointment.id || appointment.ref, {
      receiptPreview: additionalReceiptPreview,
      receiptFileName: additionalReceiptFile?.name || 'additional_receipt.png',
      amount: appointment.remainingAmount
    });

    if (res.success && res.appointment) {
      setAppointment(res.appointment);
      setShowAdditionalReceiptModal(false);
      setAdditionalReceiptFile(null);
      setAdditionalReceiptPreview(null);
    } else {
      setAdditionalReceiptError(res.error || 'Failed to submit additional receipt.');
    }
    setIsSubmittingAdditional(false);
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4EFEB] flex items-center justify-center pt-24 pb-16">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#C88A22] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#6E5D52]">Retrieving your VIP reservation...</p>
        </div>
      </div>
    );
  }

  // Dynamic expiration check: actual date + end time has passed
  const isPast = isAppointmentPast(appointment, currentTime);

  // ── 1. Empty State (Only when no appointment record exists in storage) ──
  if (!appointment) {
    return (
      <div className="min-h-screen bg-[#F4EFEB] pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#E5A93C] to-[#D97706] blur-xl opacity-25 animate-pulse" />
            <div className="relative w-full h-full rounded-3xl bg-white border border-[#E6DDD1] flex items-center justify-center shadow-luxury-md">
              <CalendarX className="w-10 h-10 text-[#C88A22]" />
            </div>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FAF2E3] border border-[#E5A93C]/30 text-xs font-bold text-[#8C4717] mb-3 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#C88A22]" />
            <span>Nhatty Barber House • Dessie</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-wide mb-2">
            NO RESERVATION RECORD
          </h1>
          <p className="text-sm text-[#6E5D52] mb-8 leading-relaxed max-w-sm mx-auto">
            You don't have a reservation record yet. Book your master cut and facial steam with zero waiting time at Lucy Hotel.
          </p>

          <Link
            to="/booking"
            className="inline-flex items-center justify-center gap-2 w-full py-4 px-6 rounded-2xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] shadow-lg shadow-[#E5A93C]/25 hover:shadow-[#E5A93C]/40 hover:brightness-105 active:scale-[0.98] transition-all"
          >
            <span>BOOK AN APPOINTMENT</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </Link>

          <div className="mt-5">
            <Link
              to="/"
              className="text-xs font-semibold text-[#6E5D52] hover:text-[#1E1915] transition-colors"
            >
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Cancelled State ────────────────────────────────────────
  const isCancelledAppt = 
    appointment.status === 'Cancelled' || 
    appointment.status === 'Customer Cancelled' || 
    appointment.status === 'Cancelled — Refund Completed' ||
    appointment.bookingStatus === 'Cancelled' || 
    appointment.bookingStatus === 'Customer Cancelled' || 
    appointment.bookingStatus === 'Cancelled — Refund Completed';

  if (isCancelledAppt) {
    return (
      <div className="min-h-screen bg-[#F4EFEB] pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-3 shadow-sm">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
              RESERVATION CANCELLED
            </h1>
            <p className="text-xs sm:text-sm text-[#6E5D52]">
              This time slot has been successfully released for other clients.
            </p>
          </div>

          {/* Cancelled Ticket Record */}
          <div className="bg-white border border-[#E6DDD1] rounded-3xl p-6 shadow-luxury-md mb-6 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE9E2]">
              <span className="text-[11px] font-bold text-[#9E8B7F] uppercase tracking-wider">Archived Reference</span>
              <span className="font-mono font-bold text-sm text-[#1E1915] bg-[#FAF6F1] px-2.5 py-1 rounded-lg border border-[#EADBCA]">
                {appointment.ref}
              </span>
            </div>

            <div className="space-y-3 text-xs text-[#5D4A3E]">
              <div className="flex justify-between py-1 border-b border-[#FAF6F1]">
                <span className="text-[#9E8B7F]">Service</span>
                <span className="font-bold text-[#1E1915]">{appointment.serviceName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF6F1]">
                <span className="text-[#9E8B7F]">Barber</span>
                <span className="font-bold text-[#1E1915]">{appointment.barberName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF6F1]">
                <span className="text-[#9E8B7F]">Date & Time</span>
                <span className="font-bold text-[#1E1915]">{formatAppointmentRelativeDate(appointment.dateStr, currentTime)} • {appointment.timeDisplay}</span>
              </div>
            </div>

            <div className="bg-red-50/80 border border-red-200/80 rounded-xl p-3.5 text-xs text-red-700 font-medium">
              <p className="font-bold text-red-800 mb-0.5">Status: Cancelled</p>
              <p className="text-[11px] text-red-600">
                You can reserve a fresh appointment anytime at your convenience.
              </p>
            </div>
          </div>

          {/* ── Cancellation & Refund Help Section ────────────────────── */}
          <div className="bg-white border border-[#E6DDD1] rounded-3xl p-5 sm:p-6 shadow-luxury-md mb-6 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FAF2E3] border border-[#E5A93C]/40 flex items-center justify-center text-[#C88A22] flex-shrink-0 mt-0.5">
                <Phone className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-sm font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
                  Need Help With Your Cancellation?
                </h3>
                <p className="text-[11px] text-[#6E5D52] leading-relaxed">
                  If you have questions about your cancellation or payment/refund, please contact Nhatty Barber House using our support number or visit us at Lucy Hotel, Ground Floor, Dessie.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Call Us */}
              <a
                href="tel:0975357881"
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAF6F1] hover:bg-[#FAF2E3] border border-[#EADBCA] hover:border-[#E5A93C]/60 transition-all text-left group min-h-[54px] cursor-pointer"
                title="Call Nhatty Barber House Support"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E2D7C8] group-hover:border-[#E5A93C]/50 flex items-center justify-center text-[#C88A22] flex-shrink-0 shadow-xs">
                  <Phone className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#9E8B7F] block">
                    Call Nhatty Barber House
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-extrabold text-[#1E1915] group-hover:text-[#8C4717] transition-colors block">
                    0975 357 881
                  </span>
                </div>
              </a>

              {/* Option 2: Visit Us */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAF6F1] border border-[#EADBCA] text-left min-h-[54px]">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E2D7C8] flex items-center justify-center text-[#C88A22] flex-shrink-0 shadow-xs">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#9E8B7F] block">
                    Visit Us
                  </span>
                  <span className="text-xs font-bold text-[#1E1915] block leading-tight">
                    Lucy Hotel — Ground Floor, Dessie
                  </span>
                  <span className="text-[10px] text-[#6E5D52] block mt-0.5">
                    Speak with our team & receptionist
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10.5px] text-[#8C7A6D] italic bg-[#FAF6F1]/70 p-2.5 rounded-xl border border-[#E6DDD1]/60 leading-relaxed">
              For cancellation or refund assistance, please contact us directly or visit our barber house at Lucy Hotel, Ground Floor, Dessie.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              to="/booking"
              className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-2xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] shadow-lg shadow-[#E5A93C]/25 hover:shadow-[#E5A93C]/40 hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>BOOK A NEW APPOINTMENT</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </Link>

            <Link
              to="/"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-[#E6DDD1] bg-white text-[#6E5D52] font-semibold text-sm hover:bg-[#FAF6F1] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. Editing Interface Mode ─────────────────────────────────
  if (isEditing) {
    const currentService = MOCK_SERVICES.find(s => s.id === (appointment.serviceId || 'srv-1'));
    const newService = MOCK_SERVICES.find(s => s.id === editServiceId);
    
    const isOriginalVerified = appointment.paymentStatus === 'Verified' || (Number(appointment.paidAmount) > 0);
    const verifiedPaid = isOriginalVerified 
      ? (appointment.paidAmount !== undefined ? Number(appointment.paidAmount) : (Number(appointment.price) || 0))
      : 0;
    const newPrice = newService?.price || 0;
    const priceDiff = isOriginalVerified ? (newPrice - verifiedPaid) : 0;

    const currentBarber = MOCK_BARBERS.find(b => b.id === (appointment.barberId || appointment.actualBarberId));
    const newBarber = MOCK_BARBERS.find(b => b.id === editBarberId);
    const newDateInfo = editDate ? formatDisplayDate(editDate) : null;
    const newDateDisplay = newDateInfo 
      ? `${newDateInfo.dayName === 'TODAY' ? 'Today' : newDateInfo.dayName}, ${newDateInfo.month} ${newDateInfo.day}` 
      : 'Select date';

    const excludeKey = `${appointment.barberId || appointment.actualBarberId}:${appointment.dateStr}:${appointment.timeId}`;

    return (
      <div className="min-h-screen bg-[#F4EFEB] pt-24 pb-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={handleCancelEditing}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#6E5D52] hover:text-[#1E1915] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel Editing & Keep Current Appointment</span>
            </button>
          </div>

          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF2E3] border border-[#E5A93C]/40 text-xs font-bold text-[#8C4717]">
              <Edit3 className="w-3.5 h-3.5 text-[#C88A22]" />
              <span>Modify VIP Reservation • {appointment.ref}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-wide">
              UPDATE YOUR APPOINTMENT
            </h1>
            <p className="text-xs sm:text-sm text-[#6E5D52]">
              Select a new service, barber, date, or time slot. Your current chair remains reserved until confirmed.
            </p>
          </div>

          {/* Countdown Window Notice */}
          <div className="bg-gradient-to-r from-[#FAF4EA] to-[#FDF8EF] border border-[#E5A93C]/50 rounded-2xl p-4 flex items-center justify-between gap-3 mb-8 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs text-[#8C4717] font-semibold">
              <Clock className="w-4 h-4 text-[#C88A22] flex-shrink-0 animate-pulse" />
              <span>{APPOINTMENT_EDIT_WINDOW_MINUTES}-Minute Edit Window Active:</span>
              <span className="font-mono font-extrabold text-sm bg-white px-2.5 py-1 rounded-lg border border-[#EADBCA] text-[#1E1915] shadow-xs">
                {formatCountdown(remainingEditSeconds)} remaining
              </span>
            </div>
            <span className="text-[11px] text-[#9E8B7F] font-mono hidden sm:inline">
              Ref: {appointment.ref}
            </span>
          </div>

          {/* Edit Form */}
          <div className="space-y-8 bg-white border border-[#E6DDD1] rounded-3xl p-6 sm:p-8 shadow-luxury-md">
            {/* Step 1: Service */}
            <ServiceSelector
              selectedServiceId={editServiceId}
              onSelect={(id) => setEditServiceId(id)}
            />

            {/* Step 2: Barber */}
            <BarberSelector
              selectedBarberId={editBarberId}
              onSelect={(id) => setEditBarberId(id)}
            />

            {/* Step 3: Date */}
            <DateSelector
              selectedDate={editDate}
              onSelect={(date) => setEditDate(date)}
            />

            {/* Step 4: Time Slot */}
            <div className="space-y-2">
              <TimeSlotSelector
                selectedBarberId={editBarberId}
                selectedDate={editDate}
                selectedTimeId={editTimeId}
                onSelect={(timeId) => setEditTimeId(timeId)}
                excludeSlotKey={excludeKey}
              />
            </div>

            {/* Error banner */}
            {editError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2 text-xs text-red-700 font-medium">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            {/* Price Delta & Summary Comparison */}
            <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-5 space-y-4 text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#9E8B7F] font-['Cinzel',serif]">
                Reservation & Payment Adjustment
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current */}
                <div className="bg-white border border-[#E6DDD1] rounded-xl p-4 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase text-[#9E8B7F] tracking-wider block">
                    Current Reservation
                  </span>
                  <p className="font-bold text-[#1E1915] text-sm">{currentService?.name}</p>
                  <p className="text-[#6E5D52]">Barber: <span className="font-semibold text-[#1E1915]">{currentBarber?.name}</span></p>
                  <p className="text-[#6E5D52]">{formatAppointmentRelativeDate(appointment.dateStr, currentTime)} • {appointment.timeDisplay}</p>
                  <p className="text-[#8C4717] font-bold pt-1">
                    {isOriginalVerified ? `Already Paid: ${verifiedPaid} ETB` : `Total: ${currentService?.price} ETB (Pending)`}
                  </p>
                </div>

                {/* New */}
                <div className="bg-[#FDF8EF] border-2 border-[#E5A93C]/70 rounded-xl p-4 space-y-1.5 text-xs shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-[#C88A22] tracking-wider block flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> New Selection
                  </span>
                  <p className="font-bold text-[#1E1915] text-sm">{newService?.name || 'Select Service'}</p>
                  <p className="text-[#6E5D52]">Barber: <span className="font-semibold text-[#1E1915]">{newBarber?.name || 'Select Barber'}</span></p>
                  <p className="text-[#6E5D52]">{newDateDisplay} • {editTimeId ? `${editTimeId}` : 'Select Time'}</p>
                  <p className="text-[#1E1915] font-extrabold pt-1">
                    New Total: {newPrice} ETB
                  </p>
                </div>
              </div>

              {/* Price adjustment notice */}
              {priceDiff < 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400/80 text-left space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-950 font-['Cinzel',serif] tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Service Downgrade — Cash Change Due at Shop</span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                    New total: <strong className="text-[#1E1915]">{newPrice} ETB</strong> · Original service: <strong className="text-[#1E1915]">{baselinePrice} ETB</strong> (Price Difference: <strong>{Math.abs(priceDiff)} ETB</strong>).
                  </p>
                  <div className="bg-white/95 border border-emerald-300 p-3 rounded-xl text-xs font-bold text-emerald-950 flex items-start gap-2 shadow-xs">
                    <span className="text-base flex-shrink-0">💵</span>
                    <span className="leading-snug">
                      You will receive your <strong>{Math.abs(priceDiff)} ETB</strong> change in cash in person when you go to get your haircut at Nhatty Barber House (Lucy Hotel, Ground Floor).
                    </span>
                  </div>
                  <p className="text-[10.5px] text-emerald-700 font-semibold">
                    * 100% of the price difference is returned to you. The 75% refund policy applies only to cancelled appointments.
                  </p>
                </div>
              ) : priceDiff === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="block font-bold">New total: {newPrice} ETB</span>
                    <span className="text-[11px] font-normal text-emerald-700">Same service price. No additional payment or refund required.</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-xs text-[#8C4717] font-semibold bg-[#FAF4EA] border border-[#EADBCA] p-3.5 rounded-xl">
                  <Info className="w-4 h-4 text-[#C88A22] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-bold text-sm text-[#1E1915]">New total: {newPrice} ETB</span>
                    <span className="block text-[#6E5D52] mt-0.5">Original service: {baselinePrice} ETB</span>
                    <span className="block font-extrabold text-[#C88A22] mt-1">Additional payment required: +{priceDiff} ETB</span>
                    <span className="text-[11px] font-normal text-[#6E5D52] mt-0.5 block">
                      Your original payment is preserved. Settle the remaining {priceDiff} ETB at Lucy Hotel front desk.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] shadow-lg shadow-[#E5A93C]/25 hover:shadow-[#E5A93C]/40 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>UPDATING RESERVATION...</span>
                  </>
                ) : (
                  <>
                    <span>CONFIRM CHANGES</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={isUpdating}
                className="py-4 px-6 rounded-2xl border border-[#E6DDD1] bg-white text-[#6E5D52] font-semibold text-sm hover:bg-[#FAF6F1] transition-colors cursor-pointer"
              >
                Discard & Keep Current
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. Premium VIP Boarding Pass / Reservation Ticket View ────
  const paymentLabel = appointment.paymentMethod === 'cbe' 
    ? 'CBE Bank Transfer' 
    : appointment.paymentMethod === 'telebirr' 
    ? 'Telebirr Mobile Pay' 
    : 'Direct Transfer';

  const customerName = appointment.customerName || appointment.name;
  const arrivalReminder = appointment.arrivalReminder || '10 mins early';
  const displayDateStr = formatAppointmentRelativeDate(appointment.dateStr, currentTime);

  return (
    <div className="min-h-screen bg-[#F4EFEB] pt-24 pb-28 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        
        {/* Navigation Bar / Top Breadcrumb */}
        <div className="flex items-center justify-between mb-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#6E5D52] hover:text-[#1E1915] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <span className="text-[11px] font-bold tracking-wider text-[#9E8B7F] uppercase">
            Lucy Hotel • Dessie
          </span>
        </div>

        {/* ── 11-Minute Live Modification Window Banner (Only while active) ── */}
        {!isPast && isEditWindowActive && (
          <div className="mb-5 bg-gradient-to-r from-[#FAF2E3] via-[#FDF8EF] to-[#FAF2E3] border-2 border-[#E5A93C] rounded-2xl p-4 shadow-luxury-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-[fadeIn_0.3s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] text-[#1A1614] flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
                <Edit3 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8C4717]">
                    {APPOINTMENT_EDIT_WINDOW_MINUTES}-Minute Edit Window Active
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#E5A93C]/25 text-[10px] font-bold text-[#8C4717] animate-pulse">
                    Live
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#1E1915] mt-0.5">
                  Remaining time to modify: <span className="text-[#8C4717] font-mono text-sm font-extrabold ml-1">{formatCountdown(remainingEditSeconds)}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartEditing}
              className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] text-xs font-black tracking-wide hover:brightness-105 active:scale-95 shadow-md transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>EDIT APPOINTMENT</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        )}

        {/* ── 🌟 ULTRA-PREMIUM VIP RESERVATION TICKET ─────────── */}
        <div className="bg-white rounded-3xl shadow-luxury-lg border border-[#E2D7C8] overflow-hidden relative mb-6 transition-all">
          
          {/* Top Pass Header: Deep Obsidian & Radiant Gold */}
          <div className="bg-gradient-to-br from-[#1E1915] via-[#28211C] to-[#171310] text-white p-6 sm:p-7 relative overflow-hidden">
            {/* Ambient Gold Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#E5A93C]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[#D97706]/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top Bar: Brand & Verified Seal */}
            <div className="flex items-center justify-between gap-2 relative z-10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#D97706] flex items-center justify-center text-[#1A1614] shadow-sm">
                  <Scissors className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold tracking-widest uppercase font-['Cinzel',serif] text-white block leading-tight">
                    Nhatty Barber House
                  </span>
                  <span className="text-[9px] tracking-[0.2em] font-bold text-[#E5A93C] uppercase">
                    {isPast ? 'Recent Appointment Record' : 'VIP Guest Reservation Pass'}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              {isPast ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/20 border border-slate-400/30 text-slate-200 text-xs font-bold shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-300" />
                  <span>COMPLETED</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold shadow-xs">
                  <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>CONFIRMED</span>
                </div>
              )}
            </div>

            {/* Big Reference Number & Customer Name */}
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 relative z-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#C5B9AB]">
                  Booking Reference
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FBF4EC] tracking-wider font-['Cinzel',serif]">
                    {appointment.ref}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#E5A93C] transition-colors cursor-pointer"
                    title="Copy Reference Number"
                  >
                    {copiedRef ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#C5B9AB]">
                  {isPast ? 'Attended By' : 'Reserved For'}
                </p>
                <p className="text-sm sm:text-base font-extrabold text-white capitalize mt-0.5 truncate max-w-[200px]">
                  {customerName || 'Distinguished Guest'}
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Perforation Line with Circular Notches */}
          <div className="relative h-6 bg-white flex items-center justify-between px-4">
            {/* Left Notch */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F4EFEB] border-r border-[#E2D7C8] shadow-inner" />
            
            {/* Dashed Line */}
            <div className="w-full border-t-2 border-dashed border-[#EADBCA] mx-3" />
            
            {/* Right Notch */}
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F4EFEB] border-l border-[#E2D7C8] shadow-inner" />
          </div>

          {/* Main Ticket Body */}
          <div className="p-6 sm:p-7 space-y-6">
            
            {/* Hero Grid: Service & Master Barber Showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Service Box */}
              <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-4 space-y-1 transition-all hover:border-[#E5A93C]/50">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#9E8B7F]">
                  <Scissors className="w-3.5 h-3.5 text-[#C88A22]" />
                  <span>Selected Service</span>
                </div>
                <p className="text-base font-extrabold text-[#1E1915] font-['Cinzel',serif] pt-0.5">
                  {appointment.serviceName}
                </p>
                <p className="text-[11px] text-[#6E5D52] font-semibold">
                  60-Minute Master Grooming
                </p>
                {appointment.originalServiceName && appointment.originalServiceName !== appointment.serviceName && (
                  <p className="text-[10px] text-[#8C4717] font-semibold bg-[#FAF2E3] px-2 py-0.5 rounded border border-[#E5A93C]/30 inline-block mt-0.5">
                    Changed from: {appointment.originalServiceName} ({appointment.originalPrice} ETB)
                  </p>
                )}
              </div>

              {/* Master Barber Box */}
              <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-4 space-y-1 transition-all hover:border-[#E5A93C]/50">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#9E8B7F]">
                  <User className="w-3.5 h-3.5 text-[#C88A22]" />
                  <span>Dedicated Barber</span>
                </div>
                <p className="text-base font-extrabold text-[#1E1915] font-['Cinzel',serif] pt-0.5">
                  {appointment.barberName}
                </p>
                <p className="text-[11px] text-[#6E5D52] font-semibold">
                  Wahl Certified Professional
                </p>
              </div>
            </div>

            {/* Schedule & Timing Centerpiece Box */}
            <div className="bg-gradient-to-br from-[#FDF8EF] via-[#FAF2E3] to-[#FDF8EF] border-2 border-[#E5A93C]/60 rounded-2xl p-5 shadow-luxury-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5A93C]/25 pb-3">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-5 h-5 text-[#C88A22]" />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8C4717] block">
                      Appointment Date
                    </span>
                    <p className="text-sm sm:text-base font-extrabold text-[#1E1915]">
                      {displayDateStr}
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-auto text-[11px] font-bold bg-[#E5A93C]/20 border border-[#E5A93C]/40 text-[#8C4717] px-3 py-1 rounded-full">
                  Lucy Hotel, Ground Floor
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-[#C88A22]" />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8C4717] block">
                      Scheduled Session Time
                    </span>
                    <p className="text-base sm:text-lg font-black text-[#1E1915] tracking-tight">
                      {appointment.timeDisplay || `${appointment.startTime} – ${appointment.endTime}`}
                    </p>
                  </div>
                </div>

                {isPast ? (
                  <div className="bg-white/80 border border-[#E5A93C]/40 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-[#6E5D52] font-bold self-start sm:self-auto shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Session Completed</span>
                  </div>
                ) : (
                  <div className="bg-white/80 border border-[#E5A93C]/40 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-[#8C4717] font-bold self-start sm:self-auto shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Arrive by {arrivalReminder}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Receipt Section (Payment Submitted & Verification Pending / Verified) */}
            <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-xs ${
                  appointment.paymentStatus === 'Verified' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
                    : 'bg-white border-[#E2D7C8] text-[#C88A22]'
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#9E8B7F] block">
                    {appointment.paymentStatus === 'Verified' ? 'Payment Status' : 'Payment Submitted'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs font-bold text-[#1E1915]">{paymentLabel}</p>
                    {appointment.paymentStatus === 'Verified' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" /> Verified ✓
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#8C4717] bg-[#FAF2E3] border border-[#E5A93C]/40 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-[#C88A22]" /> Verification Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {(appointment.receiptPreview || appointment.originalReceiptPreview || appointment.additionalReceiptPreview) && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveReceiptTab(appointment.additionalReceiptPreview && !appointment.receiptPreview && !appointment.originalReceiptPreview ? 'additional' : 'original');
                      setShowReceiptModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#8C4717] bg-white border border-[#EADBCA] px-3 py-1.5 rounded-xl hover:bg-[#FAF4EA] transition-colors cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#C88A22]" />
                    <span>View Receipt</span>
                  </button>
                )}

                {(() => {
                  const isEditedAppt = Boolean(
                    appointment.isEdited ||
                    (appointment.originalServiceId && appointment.serviceId && appointment.originalServiceId !== appointment.serviceId) ||
                    (appointment.originalPrice !== undefined && Number(appointment.originalPrice) !== Number(appointment.price))
                  );
                  const isUpgradeWithBalanceDue = Boolean(
                    !isPast &&
                    isEditedAppt &&
                    appointment.adjustmentType === 'additional_payment' &&
                    Number(appointment.remainingAmount) > 0
                  );
                  const isDowngraded = Boolean(
                    appointment.adjustmentType === 'downgrade_refund_at_shop' ||
                    (appointment.overpaymentAmount > 0) ||
                    (appointment.originalPrice && Number(appointment.originalPrice) > Number(appointment.price))
                  );
                  const overpayChange = appointment.overpaymentAmount || (Number(appointment.originalPrice) - Number(appointment.price)) || 0;
                  const receiptSubmitted = appointment.submittedAmount || appointment.originalSubmittedAmount || appointment.originalPrice || appointment.price;

                  return (
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E8B7F] block">
                        {isUpgradeWithBalanceDue ? 'Total Price' : (isDowngraded ? 'Service Price' : (appointment.paymentStatus === 'Verified' ? 'Total Paid' : 'Total Amount'))}
                      </span>
                      <p className="text-lg font-black text-[#1E1915]">
                        {appointment.price} <span className="text-xs font-bold text-[#8C4717]">ETB</span>
                      </p>
                      <div className="text-[10.5px] font-bold text-[#8C4717] mt-0.5">
                        {isUpgradeWithBalanceDue ? (
                          <>
                            <span>Verified Paid: {appointment.paidAmount || 0} ETB</span>
                            <span className="text-amber-800 font-extrabold block sm:inline sm:ml-1">
                              • +{appointment.remainingAmount} ETB Due
                            </span>
                          </>
                        ) : isDowngraded && overpayChange > 0 ? (
                          <div className="text-[10.5px] font-bold text-emerald-800 mt-0.5">
                            <span className="block text-[#6E5D52]">Receipt: {receiptSubmitted} ETB</span>
                            <span className="text-emerald-700 font-extrabold block">
                              {appointment.shopRefundHandedOver 
                                ? `✓ +${overpayChange} ETB Change Collected` 
                                : `💵 +${overpayChange} ETB Change at Shop`}
                            </span>
                          </div>
                        ) : appointment.refundAmount > 0 ? (
                          <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                            <span>75% Refund Due: {appointment.refundAmount} ETB</span>
                            <span className="text-slate-500 block text-[9.5px]">({appointment.refundStatus})</span>
                          </div>
                        ) : (
                          <span>
                            {appointment.paymentStatus === 'Verified' 
                              ? `Paid: ${appointment.price} ETB (Verified)` 
                              : `Submitted: ${appointment.price} ETB (Verification Pending)`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Additional Payment Requirement Card — Strictly for Genuine Upgrades with Remaining Balance */}
            {(() => {
              const isEditedAppt = Boolean(
                appointment.isEdited ||
                (appointment.originalServiceId && appointment.serviceId && appointment.originalServiceId !== appointment.serviceId) ||
                (appointment.originalPrice !== undefined && Number(appointment.originalPrice) !== Number(appointment.price))
              );
              const isUpgradeWithBalanceDue = Boolean(
                !isPast &&
                isEditedAppt &&
                appointment.adjustmentType === 'additional_payment' &&
                Number(appointment.remainingAmount) > 0
              );

              if (!isUpgradeWithBalanceDue) return null;

              return (
                <div className="p-4 rounded-2xl bg-[#FAF2E3] border-2 border-[#E5A93C]/70 text-left space-y-2 shadow-xs">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#8C4717] font-['Cinzel',serif] tracking-wide">
                        <CreditCard className="w-4 h-4 text-[#C88A22]" />
                        <span>Service Upgrade — Additional Payment Due</span>
                      </div>
                      <p className="text-xs text-[#6E5D52] leading-relaxed">
                        You upgraded your appointment to <strong className="text-[#1E1915]">{appointment.serviceName}</strong> ({appointment.price} ETB).
                        Your previous payment for <strong className="text-[#1E1915]">{appointment.originalServiceName || 'original service'}</strong> ({appointment.originalPrice || 0} ETB) is registered.
                      </p>
                      <p className="text-sm font-black text-[#1E1915] font-mono pt-0.5">
                        Remaining Balance Due: <span className="text-amber-900 text-base">{appointment.remainingAmount} ETB</span>
                      </p>
                    </div>

                    <div className="self-end sm:self-center">
                      {appointment.additionalPaymentStatus === 'Pending Verification' ? (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <div className="bg-amber-100/90 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
                            <Clock className="w-4 h-4 text-amber-800 animate-pulse flex-shrink-0" />
                            <div>
                              <span className="block text-[11px] font-extrabold">Additional Receipt Submitted</span>
                              <span className="text-[10px] font-normal text-amber-800">Verification Pending by Staff</span>
                            </div>
                          </div>
                          {appointment.additionalReceiptPreview && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveReceiptTab('additional');
                                setShowReceiptModal(true);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-amber-950 bg-white border border-amber-300 px-3 py-1.5 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer shadow-xs"
                              title="Inspect attached additional receipt"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#C88A22]" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAdditionalReceiptModal(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] text-xs font-extrabold shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                        >
                          <UploadCloud className="w-4 h-4 stroke-[2.5]" />
                          <span>Submit Additional Receipt ({appointment.remainingAmount} ETB)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Service Downgrade / Overpayment Cash Return Card */}
            {(() => {
              const isDowngraded = Boolean(
                appointment.adjustmentType === 'downgrade_refund_at_shop' ||
                (appointment.overpaymentAmount > 0) ||
                (appointment.originalPrice && Number(appointment.originalPrice) > Number(appointment.price))
              );
              const overpayChange = appointment.overpaymentAmount || (Number(appointment.originalPrice) - Number(appointment.price)) || 0;
              const receiptSubmitted = appointment.submittedAmount || appointment.originalSubmittedAmount || appointment.originalPrice || appointment.price;
              const isHandedOver = Boolean(appointment.shopRefundHandedOver);

              if (!isDowngraded || isPast || overpayChange <= 0) return null;

              return (
                <div className={`p-4 rounded-2xl border-2 text-left space-y-2 shadow-xs animate-[fadeIn_0.3s_ease-out] ${
                  isHandedOver ? 'bg-emerald-50 border-emerald-500/80' : 'bg-emerald-50/70 border-emerald-400/80'
                }`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-950 font-['Cinzel',serif] tracking-wide">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{isHandedOver ? 'Cash Change Collected at Front Desk' : 'Service Adjustment — Cash Change Due at Shop'}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isHandedOver ? 'bg-emerald-200 text-emerald-950 border border-emerald-400' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {isHandedOver ? '✓ Collected at Shop' : '💵 Due Upon Arrival'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed font-semibold">
                    You changed your service to <strong className="text-[#1E1915]">{appointment.serviceName}</strong> ({appointment.price} ETB).
                    Your payment receipt for <strong className="text-[#1E1915]">{appointment.originalServiceName || 'original service'}</strong> ({receiptSubmitted} ETB) leaves an overpayment of <strong className="text-emerald-950 font-mono font-black">{overpayChange} ETB</strong>.
                  </p>
                  {isHandedOver ? (
                    <div className="bg-white/95 border border-emerald-400 p-3 rounded-xl text-xs font-bold text-emerald-950 flex items-start gap-2 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Your <strong>{overpayChange} ETB</strong> change was successfully handed over in cash at Nhatty Barber House front desk.
                      </span>
                    </div>
                  ) : (
                    <div className="bg-white/95 border border-emerald-300 p-3 rounded-xl text-xs font-bold text-emerald-950 flex items-start gap-2 shadow-xs">
                      <span className="text-base flex-shrink-0">💵</span>
                      <span className="leading-snug">
                        You will receive your <strong>{overpayChange} ETB</strong> change in cash in person when you go to get your haircut at Nhatty Barber House (Lucy Hotel, Ground Floor).
                      </span>
                    </div>
                  )}
                  <p className="text-[10.5px] text-emerald-700 font-semibold">
                    * No service fee is deducted. 100% of the price difference is returned to you in cash.
                  </p>
                </div>
              );
            })()}

            {/* Check-In Instructions / Completed Session Historical Policy */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-white via-[#FAF6F1] to-white border border-[#E6DDD1] flex items-start gap-3 text-xs text-[#5D4A3E]">
              {isPast ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#8C4717] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-[#1E1915]">Completed Grooming Session</p>
                    <p className="text-[11px] text-[#6E5D52] mt-0.5 leading-relaxed">
                      This reservation took place on <span className="font-semibold text-[#1E1915]">{displayDateStr}</span>. Your appointment history is saved here for your reference. Ready for your next fresh cut?
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-[#1E1915]">Zero-Waiting VIP Priority Policy</p>
                    <p className="text-[11px] text-[#6E5D52] mt-0.5 leading-relaxed">
                      Your chair is exclusively held for your designated hour. Simply show reference <span className="font-mono font-bold text-[#1E1915]">{appointment.ref}</span> to the host at Lucy Hotel ground floor lounge.
                    </p>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Ticket Bottom Stub */}
          <div className="bg-[#FAF6F1] border-t border-[#E6DDD1] px-6 py-4 flex items-center justify-between text-[11px] text-[#9E8B7F]">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#C88A22]" />
              <span className="font-semibold text-[#6E5D52]">Lucy Hotel (Ground Floor), Dessie</span>
            </div>

            <span className="font-mono font-bold tracking-widest text-[#9E8B7F] uppercase hidden sm:inline">
              ★ NHATTY-VIP-PASS ★
            </span>
          </div>

        </div>

        {/* ── Quick Utility Actions Bar ────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          {/* Add to Calendar */}
          <button
            type="button"
            onClick={handleAddToCalendar}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-white border border-[#E6DDD1] text-[#1E1915] font-bold text-xs hover:bg-[#FAF6F1] hover:border-[#E5A93C]/60 shadow-xs transition-all cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4 text-[#C88A22]" />
            <span>Add to Calendar</span>
          </button>

          {/* Get Directions */}
          <a
            href="https://maps.google.com/?q=Lucy+Hotel+Dessie+Ethiopia"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-white border border-[#E6DDD1] text-[#1E1915] font-bold text-xs hover:bg-[#FAF6F1] hover:border-[#E5A93C]/60 shadow-xs transition-all"
          >
            <Navigation className="w-4 h-4 text-[#C88A22]" />
            <span>Get Directions</span>
          </a>

          {/* Copy Reference */}
          <button
            type="button"
            onClick={handleCopyRef}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-white border border-[#E6DDD1] text-[#1E1915] font-bold text-xs hover:bg-[#FAF6F1] hover:border-[#E5A93C]/60 shadow-xs transition-all cursor-pointer"
          >
            {copiedRef ? (
              <>
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied Ref!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#C88A22]" />
                <span>Copy Ref Code</span>
              </>
            )}
          </button>
        </div>

        {/* ── Main Appointment Actions & Payment Notice ────────── */}
        <div className="space-y-4">
          {/* Edit Appointment Primary Action (Only while active and within 11 min) */}
          {!isPast && isEditWindowActive && (
            <button
              type="button"
              onClick={handleStartEditing}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl border-2 border-[#E5A93C] bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] font-black text-sm tracking-wide hover:brightness-105 shadow-lg shadow-[#E5A93C]/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4 stroke-[2.5]" />
              <span>EDIT APPOINTMENT · {formatCountdown(remainingEditSeconds)} REMAINING</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          )}

          {/* ── Professional Payment Status Notice ───────────── */}
          <div className="bg-white border border-[#E6DDD1] rounded-2xl p-4 sm:p-5 shadow-luxury-sm text-left">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                appointment.paymentStatus === 'Verified'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                  : 'bg-[#FAF2E3] border-[#E5A93C]/40 text-[#C88A22]'
              }`}>
                {appointment.paymentStatus === 'Verified' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#C88A22]" />
                )}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1E1915]">
                    {appointment.paymentStatus === 'Verified' ? 'Payment Verified' : 'Payment Submitted'}
                  </span>
                  {appointment.paymentStatus === 'Verified' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[10px] font-extrabold text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                      Verified ✓
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF2E3] border border-[#E5A93C]/40 text-[10px] font-bold text-[#8C4717]">
                      <Clock className="w-3 h-3 text-[#C88A22]" />
                      Verification Pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6E5D52] leading-relaxed">
                  {isPast
                    ? (appointment.paymentStatus === 'Verified'
                        ? 'This completed session was verified and finalized by Nhatty Barber House staff.'
                        : 'Your payment receipt was submitted with this booking record.')
                    : (appointment.paymentStatus === 'Verified'
                        ? 'Your payment receipt has been reviewed and verified by Nhatty Barber House staff. Your appointment is completely confirmed.'
                        : 'Your payment receipt has been submitted successfully, but it has not been verified yet. The Nhatty Barber House receptionist will review and verify your payment. If there is any issue with the receipt or payment, the team will assist you at the barber house.')}
                </p>
              </div>
            </div>
          </div>

          {/* If past: Big Book Next Appointment Primary Action */}
          {isPast ? (
            <Link
              to="/booking"
              className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-2xl font-extrabold text-sm tracking-wide bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] shadow-lg shadow-[#E5A93C]/25 hover:shadow-[#E5A93C]/40 hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>BOOK YOUR NEXT APPOINTMENT</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </Link>
          ) : (
            <>
              {/* Cancellation Button (only for active appointments) */}
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-red-200 bg-red-50/70 text-red-600 font-bold text-xs sm:text-sm hover:bg-red-100 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>I Can't Make It (Cancel Reservation)</span>
              </button>

              {/* Book Another Appointment */}
              <Link
                to="/booking"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-[#E6DDD1] bg-white text-[#6E5D52] font-semibold text-xs sm:text-sm hover:bg-[#FAF6F1] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Book Another Appointment</span>
              </Link>
            </>
          )}
        </div>

        {/* Cancellation Confirmation Modal */}
        <CancellationModal
          isOpen={showCancelModal}
          onKeep={() => setShowCancelModal(false)}
          onCancel={handleCancelConfirm}
          appointment={appointment}
        />

        {/* Receipt Image Lightbox Modal */}
        {showReceiptModal && (appointment.receiptPreview || appointment.originalReceiptPreview || appointment.additionalReceiptPreview) && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-[#E6DDD1] p-5 sm:p-6 space-y-4 relative">
              <div className="flex items-center justify-between border-b border-[#EFE9E2] pb-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#1E1915] uppercase tracking-wider font-['Cinzel',serif]">
                  <FileCheck2 className="w-4 h-4 text-[#C88A22]" />
                  <span>Payment Receipts</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1 rounded-lg text-[#9E8B7F] hover:text-[#1E1915] hover:bg-black/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs if additional receipt exists */}
              {(appointment.additionalReceiptPreview || (appointment.additionalSubmittedAmount > 0)) && (
                <div className="flex items-center gap-2 bg-[#FAF6F1] p-1 rounded-xl border border-[#E6DDD1]">
                  <button
                    type="button"
                    onClick={() => setActiveReceiptTab('original')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeReceiptTab === 'original'
                        ? 'bg-[#140F0C] text-[#FAF6F1] shadow-xs'
                        : 'text-[#6E5D52] hover:text-[#1E1915]'
                    }`}
                  >
                    Original Receipt ({appointment.originalPrice || appointment.price} ETB)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveReceiptTab('additional')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeReceiptTab === 'additional'
                        ? 'bg-[#140F0C] text-[#FAF6F1] shadow-xs'
                        : 'text-[#6E5D52] hover:text-[#1E1915]'
                    }`}
                  >
                    Additional Receipt ({appointment.additionalSubmittedAmount || appointment.remainingAmount} ETB)
                  </button>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden border border-[#E6DDD1] bg-black/5 flex items-center justify-center min-h-[160px]">
                {activeReceiptTab === 'additional' && appointment.additionalReceiptPreview ? (
                  <ReceiptZoomViewer
                    src={appointment.additionalReceiptPreview}
                    alt="Additional Receipt Preview"
                    fileName={appointment.additionalReceiptFileName || 'additional_receipt.png'}
                    theme="light"
                    maxHeightClass="max-h-[46vh] sm:max-h-[52vh]"
                  />
                ) : (
                  <ReceiptZoomViewer
                    src={appointment.originalReceiptPreview || appointment.receiptPreview}
                    alt="Original Receipt Preview"
                    fileName={appointment.receiptFileName || 'payment_receipt.png'}
                    theme="light"
                    maxHeightClass="max-h-[46vh] sm:max-h-[52vh]"
                  />
                )}
              </div>

              <div className="text-center text-[11px] text-[#9E8B7F]">
                <p>Reference: <span className="font-mono font-bold text-[#1E1915]">{appointment.ref}</span></p>
                {activeReceiptTab === 'additional' && (
                  <p className="text-amber-800 font-semibold mt-0.5">Additional Payment Status: {appointment.additionalPaymentStatus}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Additional Receipt Upload Modal */}
        {showAdditionalReceiptModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#E6DDD1] p-6 space-y-4 relative text-left">
              <div className="flex items-center justify-between border-b border-[#EFE9E2] pb-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#1E1915] uppercase tracking-wider font-['Cinzel',serif]">
                  <UploadCloud className="w-4 h-4 text-[#C88A22]" />
                  <span>Submit Additional Receipt</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdditionalReceiptModal(false)}
                  className="p-1 rounded-lg text-[#9E8B7F] hover:text-[#1E1915] hover:bg-black/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Service & Remaining Summary */}
              <div className="bg-[#FAF6F1] border border-[#EADBCA] rounded-2xl p-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8C7A6D]">Upgraded Service:</span>
                  <span className="font-bold text-[#1E1915]">{appointment.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C7A6D]">New Total Price:</span>
                  <span className="font-bold text-[#1E1915]">{appointment.price} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8C7A6D]">Already Paid:</span>
                  <span className="font-bold text-[#1E1915]">{appointment.paidAmount || 0} ETB</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#EFE9E2] text-sm font-black">
                  <span className="text-amber-900">Remaining Amount to Pay:</span>
                  <span className="text-amber-900 font-mono">{appointment.remainingAmount} ETB</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-1 text-xs text-[#6E5D52]">
                <p className="font-bold text-[#1E1915]">Transfer Channels:</p>
                <p>• Telebirr: <strong className="font-mono text-[#1E1915]">0975 357 881</strong> (Nhatty Barber)</p>
                <p>• CBE: <strong className="font-mono text-[#1E1915]">1000 1234 56789</strong> (Nhatty Barber House)</p>
              </div>

              {/* Upload input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1E1915]">
                  Upload Additional Payment Screenshot:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAdditionalFileSelect}
                  className="w-full text-xs text-[#6E5D52] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#140F0C] file:text-[#FAF6F1] hover:file:brightness-110 cursor-pointer"
                />

                {additionalReceiptPreview && (
                  <div className="mt-2 rounded-xl border border-[#E6DDD1] bg-black/5 p-2 overflow-hidden flex flex-col items-center justify-center">
                    <ReceiptZoomViewer
                      src={additionalReceiptPreview}
                      alt="Additional Receipt Preview"
                      fileName={additionalReceiptFile?.name || 'additional_receipt.png'}
                      theme="light"
                      maxHeightClass="max-h-56"
                    />
                  </div>
                )}

                {additionalReceiptError && (
                  <p className="text-xs text-red-600 font-semibold">{additionalReceiptError}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdditionalReceiptModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[#E6DDD1] text-xs font-bold text-[#6E5D52] hover:bg-[#FAF6F1]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdditionalReceipt}
                  disabled={isSubmittingAdditional || !additionalReceiptPreview}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] text-xs font-black shadow-md hover:brightness-105 disabled:opacity-50"
                >
                  {isSubmittingAdditional ? 'Submitting...' : 'Submit Receipt'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
