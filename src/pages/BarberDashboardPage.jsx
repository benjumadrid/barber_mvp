import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Scissors, 
  LogOut, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  CalendarDays, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Eye, 
  X, 
  User, 
  Phone, 
  CreditCard, 
  Check, 
  UserCheck, 
  Copy, 
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  FileCheck2,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { logoutStaff, getStaffSession, isStaffAuthenticated } from '../services/authService';
import { 
  getStaffAppointmentsByDate, 
  getStaffAllAppointments, 
  setStaffPaymentStatus, 
  setStaffBookingStatus,
  verifyAdditionalPayment,
  verifyOriginalPayment,
  revertOriginalPayment,
  revertAdditionalPayment,
  verifyAllPayments,
  updateRefundStatus,
  toggleShopRefundStatus,
  subscribeToBookingStore,
} from '../services/mockApi';
import { formatDateKey, formatDisplayDate, getUpcomingDates, getReceiptImage } from '../data/bookingStore';
import { MOCK_BARBERS } from '../data/barbersData';
import { setInMemoryStaffAppointments } from '../services/staffAiEngine';
import StaffAiAssistant from '../components/dashboard/StaffAiAssistant';
import ReceiptZoomViewer from '../components/common/ReceiptZoomViewer';

export default function BarberDashboardPage() {
  const navigate = useNavigate();
  const session = getStaffSession();

  // Direct access security guardrail: redirect if no active session
  useEffect(() => {
    if (!isStaffAuthenticated()) {
      navigate('/barber-login', { replace: true });
    }
  }, [navigate]);

  // Active Date Selection
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  // Appointments & Filter state
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBarberFilter, setSelectedBarberFilter] = useState('all');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Interactive receipt preview modal
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);
  const [staffReceiptTab, setStaffReceiptTab] = useState('original');
  const [copiedRef, setCopiedRef] = useState(null);

  // Load appointments for selected date and all dates
  const loadAppointments = async () => {
    try {
      const [dateData, allData] = await Promise.all([
        selectedDateKey === 'all' ? getStaffAllAppointments() : getStaffAppointmentsByDate(selectedDateKey),
        getStaffAllAppointments()
      ]);
      setAppointments(selectedDateKey === 'all' ? (allData || []) : dateData);
      setAllAppointments(allData || []);
      setInMemoryStaffAppointments(allData || []);

      // If activeReceiptModal is open, refresh it with latest data
      setActiveReceiptModal(prev => {
        if (!prev) return null;
        const found = (allData || []).find(a => 
          (a.ref && a.ref === prev.ref) || 
          (a.id && a.id === prev.id) || 
          (a.barberId === prev.barberId && a.dateStr === prev.dateStr && a.timeId === prev.timeId)
        );
        return found ? { ...prev, ...found } : prev;
      });
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();

    // 1. In-memory subscriber for same-tab / same-document booking mutations (create, edit, cancel)
    const unsubscribe = subscribeToBookingStore(() => {
      loadAppointments();
    });

    // 2. Custom window event listener for same-tab component broadcasts
    const handleCustomChange = () => {
      loadAppointments();
    };
    window.addEventListener('nhatty_booking_store_changed', handleCustomChange);

    // 3. Native storage event listener for cross-tab synchronization
    const handleStorageChange = (e) => {
      if (!e || !e.key || e.key.startsWith('nhatty_')) {
        loadAppointments();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Focus & visibility change sync
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAppointments();
      }
    };
    window.addEventListener('focus', loadAppointments);
    document.addEventListener('visibilitychange', handleVisibility);

    // 5. Periodic synchronization (fallback interval)
    const interval = setInterval(loadAppointments, 4000);

    return () => {
      unsubscribe();
      window.removeEventListener('nhatty_booking_store_changed', handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', loadAppointments);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [selectedDateKey]);

  // Handle Logout
  const handleLogout = () => {
    logoutStaff();
    navigate('/barber-login', { replace: true });
  };

  // Copy reference code
  const handleCopy = (ref) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // ── Staff Payment Verification Handlers (Instant Optimistic UI + Storage Sync) ──

  // Verify Original Payment
  const handleVerifyOriginalPayment = async (appt) => {
    const targetId = appt.ref || appt.id || `${appt.barberId}:${appt.dateStr}:${appt.timeId}`;
    const fullPrice = Number(appt.price) || Number(appt.amountPaid) || 0;
    const originalPrice = appt.originalPrice !== undefined ? Number(appt.originalPrice) : fullPrice;
    const isAddVerified = appt.additionalPaymentStatus === 'Verified';
    const verifiedAdd = isAddVerified ? (Number(appt.verifiedAdditionalAmount) || (fullPrice - originalPrice)) : 0;
    const newPaid = originalPrice + verifiedAdd;
    const newRemaining = Math.max(0, fullPrice - newPaid);
    const isFullyPaid = !appt.isEdited || fullPrice <= originalPrice || isAddVerified;
    const newPaymentStatus = isFullyPaid ? 'Verified' : (appt.additionalPaymentStatus === 'Pending Verification' ? 'Additional Payment Pending Verification' : 'Additional Payment Due');

    setAppointments(prev => prev.map(a => {
      if (a.ref === appt.ref || a.id === appt.id || (a.barberId === appt.barberId && a.dateStr === appt.dateStr && a.timeId === appt.timeId)) {
        return {
          ...a,
          originalPaymentStatus: 'Verified',
          verifiedOriginalAmount: originalPrice,
          paidAmount: newPaid,
          amountPaid: newPaid,
          remainingAmount: a.isEdited ? newRemaining : 0,
          paymentStatus: newPaymentStatus,
        };
      }
      return a;
    }));

    if (activeReceiptModal) {
      setActiveReceiptModal(prev => prev ? {
        ...prev,
        originalPaymentStatus: 'Verified',
        verifiedOriginalAmount: originalPrice,
        paidAmount: newPaid,
        amountPaid: newPaid,
        remainingAmount: prev.isEdited ? newRemaining : 0,
        paymentStatus: newPaymentStatus,
      } : null);
    }

    await verifyOriginalPayment(targetId);
  };

  // Revert Original Payment to Pending
  const handleRevertOriginalPayment = async (appt) => {
    const targetId = appt.ref || appt.id || `${appt.barberId}:${appt.dateStr}:${appt.timeId}`;
    const fullPrice = Number(appt.price) || 0;
    const isAddVerified = appt.additionalPaymentStatus === 'Verified';
    const verifiedAdd = isAddVerified ? (Number(appt.verifiedAdditionalAmount) || 0) : 0;
    const newRemaining = appt.isEdited ? Math.max(0, fullPrice - verifiedAdd) : 0;

    setAppointments(prev => prev.map(a => {
      if (a.ref === appt.ref || a.id === appt.id || (a.barberId === appt.barberId && a.dateStr === appt.dateStr && a.timeId === appt.timeId)) {
        return {
          ...a,
          originalPaymentStatus: 'Pending Verification',
          verifiedOriginalAmount: 0,
          paidAmount: verifiedAdd,
          amountPaid: verifiedAdd,
          remainingAmount: newRemaining,
          paymentStatus: 'Verification Pending',
        };
      }
      return a;
    }));

    if (activeReceiptModal) {
      setActiveReceiptModal(prev => prev ? {
        ...prev,
        originalPaymentStatus: 'Pending Verification',
        verifiedOriginalAmount: 0,
        paidAmount: verifiedAdd,
        amountPaid: verifiedAdd,
        remainingAmount: newRemaining,
        paymentStatus: 'Verification Pending',
      } : null);
    }

    await revertOriginalPayment(targetId);
  };

  // Verify Additional Payment
  const handleVerifyAdditionalPayment = async (appt) => {
    const targetId = appt.ref || appt.id || `${appt.barberId}:${appt.dateStr}:${appt.timeId}`;
    const fullPrice = Number(appt.price) || Number(appt.currentPrice) || 0;
    const originalPrice = appt.originalPrice !== undefined ? Number(appt.originalPrice) : fullPrice;
    const addAmount = Number(appt.additionalSubmittedAmount) || Number(appt.adjustmentAmount) || (fullPrice - originalPrice);
    const isOrigVerified = appt.originalPaymentStatus === 'Verified' || appt.paymentStatus === 'Verified';
    const verifiedOrig = isOrigVerified ? originalPrice : 0;
    const newPaid = verifiedOrig + addAmount;
    const newRemaining = Math.max(0, fullPrice - newPaid);
    const newPaymentStatus = isOrigVerified ? 'Verified' : 'Verification Pending';

    setAppointments(prev => prev.map(a => {
      if (a.ref === appt.ref || a.id === appt.id || (a.barberId === appt.barberId && a.dateStr === appt.dateStr && a.timeId === appt.timeId)) {
        return {
          ...a,
          additionalPaymentStatus: 'Verified',
          verifiedAdditionalAmount: addAmount,
          paidAmount: newPaid,
          amountPaid: newPaid,
          remainingAmount: a.isEdited ? newRemaining : 0,
          paymentStatus: newPaymentStatus,
        };
      }
      return a;
    }));

    if (activeReceiptModal) {
      setActiveReceiptModal(prev => prev ? {
        ...prev,
        additionalPaymentStatus: 'Verified',
        verifiedAdditionalAmount: addAmount,
        paidAmount: newPaid,
        amountPaid: newPaid,
        remainingAmount: prev.isEdited ? newRemaining : 0,
        paymentStatus: newPaymentStatus,
      } : null);
    }

    await verifyAdditionalPayment(targetId);
  };

  // Revert Additional Payment to Pending
  const handleRevertAdditionalPayment = async (appt) => {
    const targetId = appt.ref || appt.id || `${appt.barberId}:${appt.dateStr}:${appt.timeId}`;
    const fullPrice = Number(appt.price) || 0;
    const originalPrice = appt.originalPrice !== undefined ? Number(appt.originalPrice) : fullPrice;
    const isOrigVerified = appt.originalPaymentStatus === 'Verified';
    const verifiedOrig = isOrigVerified ? originalPrice : 0;
    const addDiff = Math.max(0, fullPrice - originalPrice);
    const newPaymentStatus = isOrigVerified ? (appt.additionalSubmittedAmount > 0 ? 'Additional Payment Pending Verification' : 'Additional Payment Due') : 'Verification Pending';

    setAppointments(prev => prev.map(a => {
      if (a.ref === appt.ref || a.id === appt.id || (a.barberId === appt.barberId && a.dateStr === appt.dateStr && a.timeId === appt.timeId)) {
        return {
          ...a,
          additionalPaymentStatus: a.additionalSubmittedAmount > 0 ? 'Pending Verification' : 'None',
          verifiedAdditionalAmount: 0,
          paidAmount: verifiedOrig,
          amountPaid: verifiedOrig,
          remainingAmount: addDiff,
          paymentStatus: newPaymentStatus,
        };
      }
      return a;
    }));

    if (activeReceiptModal) {
      setActiveReceiptModal(prev => prev ? {
        ...prev,
        additionalPaymentStatus: prev.additionalSubmittedAmount > 0 ? 'Pending Verification' : 'None',
        verifiedAdditionalAmount: 0,
        paidAmount: verifiedOrig,
        amountPaid: verifiedOrig,
        remainingAmount: addDiff,
        paymentStatus: newPaymentStatus,
      } : null);
    }

    await revertAdditionalPayment(targetId);
  };

  // Verify All Payments (Both Original & Additional)
  const handleVerifyAllPayments = async (appt) => {
    const targetId = appt.ref || appt.id || `${appt.barberId}:${appt.dateStr}:${appt.timeId}`;
    const fullPrice = Number(appt.price) || Number(appt.currentPrice) || 0;
    const originalPrice = appt.originalPrice !== undefined ? Number(appt.originalPrice) : fullPrice;
    const addDiff = Math.max(0, fullPrice - originalPrice);

    setAppointments(prev => prev.map(a => {
      if (a.ref === appt.ref || a.id === appt.id || (a.barberId === appt.barberId && a.dateStr === appt.dateStr && a.timeId === appt.timeId)) {
        return {
          ...a,
          originalPaymentStatus: 'Verified',
          additionalPaymentStatus: (a.isEdited && addDiff > 0) ? 'Verified' : (a.additionalPaymentStatus || 'None'),
          verifiedOriginalAmount: originalPrice,
          verifiedAdditionalAmount: addDiff,
          paidAmount: fullPrice,
          amountPaid: fullPrice,
          remainingAmount: 0,
          paymentStatus: 'Verified',
        };
      }
      return a;
    }));

    if (activeReceiptModal) {
      setActiveReceiptModal(prev => prev ? {
        ...prev,
        originalPaymentStatus: 'Verified',
        additionalPaymentStatus: (prev.isEdited && addDiff > 0) ? 'Verified' : (prev.additionalPaymentStatus || 'None'),
        verifiedOriginalAmount: originalPrice,
        verifiedAdditionalAmount: addDiff,
        paidAmount: fullPrice,
        amountPaid: fullPrice,
        remainingAmount: 0,
        paymentStatus: 'Verified',
      } : null);
    }

    await verifyAllPayments(targetId);
  };

  // Toggle Payment Verification Button on Appointment Card
  const handleTogglePaymentVerification = async (appt) => {
    if (appt.paymentStatus === 'Verified') {
      await handleRevertOriginalPayment(appt);
    } else {
      await handleVerifyAllPayments(appt);
    }
  };

  // Staff Mark Refund Completed (Instant Optimistic UI + Storage Sync)
  const handleCompleteRefund = async (appt) => {
    const targetId = appt.ref || appt.id || `${appt.barberId}:${appt.dateStr}:${appt.timeId}`;

    setAppointments(prev => prev.map(a => {
      if (a.ref === appt.ref || a.id === appt.id || (a.barberId === appt.barberId && a.dateStr === appt.dateStr && a.timeId === appt.timeId)) {
        return {
          ...a,
          refundStatus: 'Refund Completed',
          status: (a.status === 'Customer Cancelled' || a.status === 'Cancelled') ? 'Cancelled — Refund Completed' : a.status,
          bookingStatus: (a.bookingStatus === 'Customer Cancelled' || a.bookingStatus === 'Cancelled') ? 'Cancelled — Refund Completed' : a.bookingStatus
        };
      }
      return a;
    }));

    if (activeReceiptModal) {
      setActiveReceiptModal(prev => prev ? {
        ...prev,
        refundStatus: 'Refund Completed',
        status: (prev.status === 'Customer Cancelled' || prev.status === 'Cancelled') ? 'Cancelled — Refund Completed' : prev.status,
        bookingStatus: (prev.bookingStatus === 'Customer Cancelled' || prev.bookingStatus === 'Cancelled') ? 'Cancelled — Refund Completed' : prev.bookingStatus
      } : null);
    }

    await updateRefundStatus(targetId, 'Refund Completed');
  };

  // Staff Mark / Toggle Cash Change Handover (Instant Optimistic UI + Storage Sync)
  const handleToggleShopRefund = async (appt, explicitHandedOver = null) => {
    const targetId = appt.ref || appt.id || `${appt.barberId}:${appt.dateStr}:${appt.timeId}`;
    const nextHandedOver = explicitHandedOver !== null ? Boolean(explicitHandedOver) : !Boolean(appt.shopRefundHandedOver);
    const nowIso = new Date().toISOString();
    const staffName = session?.name || 'Nhatty Staff Admin';

    // Optimistic UI update for appointments and allAppointments
    setAppointments(prev => prev.map(a => {
      if (a.ref === appt.ref || a.id === appt.id || (a.barberId === appt.barberId && a.dateStr === appt.dateStr && a.timeId === appt.timeId)) {
        return {
          ...a,
          shopRefundHandedOver: nextHandedOver,
          shopRefundHandedOverAt: nextHandedOver ? nowIso : null,
          shopRefundHandedOverBy: nextHandedOver ? staffName : null
        };
      }
      return a;
    }));

    setAllAppointments(prev => prev.map(a => {
      if (a.ref === appt.ref || a.id === appt.id || (a.barberId === appt.barberId && a.dateStr === appt.dateStr && a.timeId === appt.timeId)) {
        return {
          ...a,
          shopRefundHandedOver: nextHandedOver,
          shopRefundHandedOverAt: nextHandedOver ? nowIso : null,
          shopRefundHandedOverBy: nextHandedOver ? staffName : null
        };
      }
      return a;
    }));

    if (activeReceiptModal) {
      setActiveReceiptModal(prev => prev ? {
        ...prev,
        shopRefundHandedOver: nextHandedOver,
        shopRefundHandedOverAt: nextHandedOver ? nowIso : null,
        shopRefundHandedOverBy: nextHandedOver ? staffName : null
      } : null);
    }

    await toggleShopRefundStatus(targetId, nextHandedOver, staffName);
  };

  // Staff Booking Status Update (Instant Optimistic UI + Storage Sync)
  const handleStatusChange = async (appt, newStatus) => {
    const targetId = appt.ref || appt.id || `${appt.barberId}:${appt.dateStr}:${appt.timeId}`;

    // Instant optimistic UI update
    setAppointments(prev => prev.map(a => {
      if (a.ref === appt.ref || a.id === appt.id || (a.barberId === appt.barberId && a.dateStr === appt.dateStr && a.timeId === appt.timeId)) {
        return { ...a, status: newStatus, bookingStatus: newStatus };
      }
      return a;
    }));

    await setStaffBookingStatus(targetId, newStatus);
  };

  // Available upcoming dates list for top quick selector (matches the full 14-day booking range)
  const availableDates = useMemo(() => {
    return getUpcomingDates(14).map(d => ({
      dateKey: formatDateKey(d),
      dateObj: d,
      display: formatDisplayDate(d)
    }));
  }, []);

  // Compute live appointment counts per date
  const dateCountsMap = useMemo(() => {
    const map = {};
    allAppointments.forEach(a => {
      if (a.dateStr && a.status !== 'Cancelled' && a.bookingStatus !== 'Cancelled') {
        map[a.dateStr] = (map[a.dateStr] || 0) + 1;
      }
    });
    return map;
  }, [allAppointments]);

  // Date Navigation handlers
  const currentDateIndex = useMemo(() => {
    return availableDates.findIndex(d => d.dateKey === selectedDateKey);
  }, [availableDates, selectedDateKey]);

  const handlePrevDate = () => {
    if (selectedDateKey === 'all') {
      setSelectedDateKey(todayKey);
      return;
    }
    if (currentDateIndex > 0) {
      setSelectedDateKey(availableDates[currentDateIndex - 1].dateKey);
    }
  };

  const handleNextDate = () => {
    if (selectedDateKey === 'all') {
      setSelectedDateKey(todayKey);
      return;
    }
    if (currentDateIndex < availableDates.length - 1) {
      setSelectedDateKey(availableDates[currentDateIndex + 1].dateKey);
    }
  };

  const handleTodayDate = () => {
    setSelectedDateKey(todayKey);
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      // Search query (Name, Phone, Ref, Barber)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (a.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (a.customerPhone || '').toLowerCase().includes(q);
        const matchesRef = (a.ref || '').toLowerCase().includes(q);
        const matchesBarber = (a.barberName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesRef && !matchesBarber) {
          return false;
        }
      }

      // Barber filter
      if (selectedBarberFilter !== 'all' && a.barberId !== selectedBarberFilter) {
        return false;
      }

      // Payment filter
      if (selectedPaymentFilter === 'pending' && a.paymentStatus === 'Verified') {
        return false;
      }
      if (selectedPaymentFilter === 'verified' && a.paymentStatus !== 'Verified') {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all' && a.status !== selectedStatusFilter && a.bookingStatus !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [appointments, searchQuery, selectedBarberFilter, selectedPaymentFilter, selectedStatusFilter]);

  // Daily statistics
  const stats = useMemo(() => {
    const total = appointments.length;
    const pendingVerification = appointments.filter(a => a.paymentStatus !== 'Verified' || a.additionalPaymentStatus === 'Pending Verification').length;
    const inChair = appointments.filter(a => a.status === 'In-Chair' || a.bookingStatus === 'In-Chair').length;
    const completed = appointments.filter(a => a.status === 'Completed' || a.bookingStatus === 'Completed').length;
    
    // Realized daily revenue: strictly counts VERIFIED collected money
    const totalRevenue = appointments.reduce((sum, a) => {
      const isVerified = a.paymentStatus === 'Verified';
      const isCompleted = a.status === 'Completed' || a.bookingStatus === 'Completed';
      const isCancelled = a.status === 'Customer Cancelled' || a.status === 'Cancelled' || a.status === 'Cancelled — Refund Completed' || a.bookingStatus === 'Customer Cancelled' || a.bookingStatus === 'Cancelled' || a.bookingStatus === 'Cancelled — Refund Completed';

      if (isCancelled) {
        // Retain 25% cancellation fee if payment was verified
        if (isVerified || Number(a.verifiedOriginalAmount) > 0) {
          const fee = Number(a.refundFee) || Math.round((Number(a.verifiedOriginalAmount) || Number(a.price) || 0) * 0.25);
          return sum + fee;
        }
        return sum;
      }

      if (isCompleted) {
        return sum + (Number(a.price) || 0);
      }

      // Active / Confirmed appointment:
      if (!isVerified && (!a.verifiedOriginalAmount || Number(a.verifiedOriginalAmount) === 0)) {
        // Unverified / Pending booking: NEVER inflate realized revenue
        return sum;
      }

      // Base verified amount
      const baseVerified = Number(a.verifiedOriginalAmount) || Number(a.paidAmount) || Number(a.originalPrice) || Number(a.price) || 0;
      // Additional verified amount
      const additionalVerified = a.additionalPaymentStatus === 'Verified' ? (Number(a.verifiedAdditionalAmount) || Number(a.additionalSubmittedAmount) || 0) : 0;
      
      let collected = baseVerified + additionalVerified;
      // If downgraded, subtract refund
      if (a.adjustmentType === 'refund_or_credit' || Number(a.refundAmount) > 0) {
        const refAmt = Number(a.refundAmount) || 0;
        collected = Math.max(0, collected - refAmt);
      }

      const currentPrice = Number(a.price) || collected;
      return sum + Math.min(collected, currentPrice);
    }, 0);

    return { total, pendingVerification, inChair, completed, totalRevenue };
  }, [appointments]);

  return (
    <div className="min-h-screen bg-[#F6F2EC] flex flex-col justify-between selection:bg-[#E5A93C] selection:text-[#1E1915] font-sans antialiased w-full overflow-x-hidden">
      
      {/* ── Top Luxury Staff Header ───────────────────────────── */}
      <header className="bg-[#140F0C] text-white border-b border-[#E5A93C]/25 sticky top-0 z-40 shadow-2xl backdrop-blur-md w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
            
            {/* Staff Brand Logo */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#E5A93C] via-[#D97706] to-[#92400E] flex items-center justify-center text-white shadow-lg shadow-[#E5A93C]/25 border border-[#FDE68A]/40 flex-shrink-0">
                <Scissors className="w-4 h-4 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-widest text-sm sm:text-lg text-white font-['Cinzel',serif] leading-tight truncate">
                    NHATTY
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C] shadow-sm shadow-[#E5A93C] flex-shrink-0"></span>
                </div>
                <span className="text-[8px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.28em] text-[#E5A93C] font-extrabold uppercase leading-none mt-0.5 truncate">
                  Staff Console
                </span>
              </div>
            </div>

            {/* Middle Location & Live Store Status */}
            <div className="hidden lg:flex items-center gap-3.5 text-xs">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-[#D5C9BD] shadow-inner">
                <MapPin className="w-3.5 h-3.5 text-[#E5A93C] flex-shrink-0" />
                <span className="font-medium">Lucy Hotel (Ground Floor) • Dessie Branch</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-[10.5px] font-extrabold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                <span>LIVE SYNC</span>
              </div>
            </div>

            {/* Right Staff Session Controls */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-white/[0.06] border border-white/10 text-xs text-[#FAF6F1]">
                <div className="w-6 h-6 rounded-full bg-[#E5A93C]/20 border border-[#E5A93C]/40 flex items-center justify-center text-[#E5A93C] text-[11px] font-extrabold">
                  {session?.name ? session.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <span className="font-bold tracking-wide">{session?.name || 'Staff Manager'}</span>
              </div>

              <Link
                to="/"
                target="_blank"
                className="hidden md:inline-flex items-center gap-1 text-xs font-bold text-[#C5B9AB] hover:text-[#FAF6F1] transition-all py-2 px-3 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10"
              >
                <span>Live Site</span>
                <span className="text-[10px] text-[#E5A93C]">↗</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-extrabold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all cursor-pointer shadow-sm hover:shadow-red-500/10"
                title="Sign out of Staff Portal"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Main Dashboard Workspace ───────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 min-w-0">
        
        {/* ── Date Selector Ribbon with Smart Navigation & Appointment Count Indicators ── */}
        <div className="bg-white border border-[#E6DDD1] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm space-y-3 min-w-0">
          
          {/* Top Navigation Bar: Prev/Next Controls & Today Shortcut */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF6F1] border border-[#E6DDD1] flex items-center justify-center text-[#C88A22] flex-shrink-0">
                <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] font-mono font-extrabold uppercase text-[#8C7A6D] tracking-wider block leading-none">
                  Select Date
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-wide truncate block">
                  {selectedDateKey === 'all'
                    ? `All Upcoming Dates (${allAppointments.length} Bookings)`
                    : `${availableDates.find(d => d.dateKey === selectedDateKey)?.display.month} ${availableDates.find(d => d.dateKey === selectedDateKey)?.display.day}${selectedDateKey === todayKey ? ' (Today)' : ''}`}
                </span>
              </div>
            </div>

            {/* Quick Date Control Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDateKey('all')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold tracking-wide transition-all cursor-pointer border ${
                  selectedDateKey === 'all'
                    ? 'bg-[#140F0C] text-[#FAF6F1] border-[#140F0C] shadow-xs'
                    : 'bg-white text-[#1E1915] border-[#E6DDD1] hover:border-[#E5A93C]'
                }`}
                title="View All Scheduled Bookings"
              >
                All Dates ({allAppointments.length})
              </button>

              <button
                type="button"
                onClick={handleTodayDate}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold tracking-wide transition-all cursor-pointer border ${
                  selectedDateKey === todayKey
                    ? 'bg-[#140F0C] text-[#FAF6F1] border-[#140F0C] shadow-xs'
                    : 'bg-[#FAF2E3] text-[#8C4717] border-[#E5A93C]/50 hover:bg-[#FAF0DD]'
                }`}
                title="Jump to Today"
              >
                Today
              </button>

              <div className="flex items-center gap-0.5 sm:gap-1 bg-[#FAF6F1] p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-[#E6DDD1]">
                <button
                  type="button"
                  onClick={handlePrevDate}
                  disabled={currentDateIndex <= 0}
                  className="p-1 sm:p-1.5 rounded-md sm:rounded-lg text-[#1E1915] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextDate}
                  disabled={currentDateIndex >= availableDates.length - 1}
                  className="p-1 sm:p-1.5 rounded-md sm:rounded-lg text-[#1E1915] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontally Scrollable 14-Day Selector with Live Appointment Count Indicators */}
          <div className="relative w-full overflow-hidden">
            <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x w-full">
              {availableDates.map(({ dateKey, display }) => {
                const isSelected = selectedDateKey === dateKey;
                const isTodayTab = dateKey === todayKey;
                const apptCount = dateCountsMap[dateKey] || 0;
                const hasBookings = apptCount > 0;

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDateKey(dateKey)}
                    className={`flex-shrink-0 snap-start px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-extrabold tracking-wide transition-all duration-200 cursor-pointer flex flex-col items-start gap-0.5 sm:gap-1 border min-w-[95px] sm:min-w-[125px] ${
                      isSelected
                        ? 'bg-[#140F0C] text-[#FAF6F1] border-[#E5A93C] shadow-md shadow-black/20 ring-1 sm:ring-2 ring-[#E5A93C]/20 scale-[1.01]'
                        : hasBookings
                        ? 'bg-white hover:bg-[#FFFDF9] text-[#1E1915] border-[#E5A93C]/60 hover:border-[#E5A93C] shadow-xs'
                        : 'bg-[#FAF6F1]/60 hover:bg-white text-[#6E5D52] border-[#E6DDD1] hover:border-[#E5A93C]/40'
                    }`}
                  >
                    {/* Top line: Day and Date */}
                    <div className="flex items-center justify-between w-full gap-1">
                      <span className={`text-[10px] sm:text-[11px] font-black uppercase ${
                        isSelected ? 'text-[#E5A93C]' : hasBookings ? 'text-[#8C4717]' : 'text-[#8C7A6D]'
                      }`}>
                        {isTodayTab ? 'Today' : display.dayName}
                      </span>

                      {isTodayTab && (
                        <span className={`text-[8px] font-mono px-1 py-0.2 rounded-full font-black ${
                          isSelected ? 'bg-[#E5A93C] text-[#140F0C]' : 'bg-[#FAF2E3] text-[#8C4717] border border-[#E5A93C]/40'
                        }`}>
                          TODAY
                        </span>
                      )}
                    </div>

                    {/* Date number */}
                    <span className="text-xs sm:text-sm font-extrabold">
                      {display.month} {display.day}
                    </span>

                    {/* Appointment count indicator pill */}
                    <div className="mt-0.5 w-full">
                      {hasBookings ? (
                        <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                          isSelected 
                            ? 'bg-[#E5A93C] text-[#140F0C] font-black' 
                            : 'bg-[#FAF2E3] text-[#8C4717] border border-[#E5A93C]/40'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C] animate-pulse"></span>
                          <span>{apptCount} {apptCount === 1 ? 'Booking' : 'Bookings'}</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#A8988B] font-mono font-medium">
                          0 Bookings
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── Daily Summary Metrics Dashboard ───────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5 min-w-0">
          
          {/* Total Appointments */}
          <div className="bg-white border border-[#E6DDD1] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group min-w-0">
            <div className="absolute top-0 right-0 w-16 sm:w-24 h-16 sm:h-24 bg-[#E5A93C]/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
            <div className="flex items-center justify-between text-[#8C7A6D] relative">
              <span className="text-[9px] sm:text-xs font-extrabold uppercase tracking-wider font-mono truncate">
                Total Bookings
              </span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#FAF6F1] border border-[#E6DDD1] flex items-center justify-center text-[#C88A22] flex-shrink-0">
                <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-[#1E1915] font-['Cinzel',serif] mt-1.5 sm:mt-3">
              {stats.total}
            </p>
            <p className="text-[10px] sm:text-[11px] text-[#8C7A6D] mt-0.5 sm:mt-1 font-medium truncate sm:whitespace-normal">
              {selectedDateKey === todayKey ? 'Scheduled for today' : 'Scheduled on selected date'}
            </p>
          </div>

          {/* Verification Pending Alert */}
          <div className={`border rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group min-w-0 ${
            stats.pendingVerification > 0 
              ? 'bg-[#FFFDF9] border-[#E5A93C] ring-1 sm:ring-2 ring-[#E5A93C]/15' 
              : 'bg-white border-[#E6DDD1]'
          }`}>
            <div className="flex items-center justify-between relative">
              <span className={`text-[9px] sm:text-xs font-extrabold uppercase tracking-wider font-mono truncate ${
                stats.pendingVerification > 0 ? 'text-[#8C4717]' : 'text-[#8C7A6D]'
              }`}>
                Payment Verification
              </span>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                stats.pendingVerification > 0 ? 'bg-[#FAF2E3] text-[#8C4717] border border-[#E5A93C]/50' : 'bg-[#FAF6F1] text-[#8C7A6D] border border-[#E6DDD1]'
              }`}>
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2 mt-1.5 sm:mt-3 flex-wrap">
              <p className={`text-xl sm:text-3xl lg:text-4xl font-extrabold font-['Cinzel',serif] ${
                stats.pendingVerification > 0 ? 'text-[#8C4717]' : 'text-[#1E1915]'
              }`}>
                {stats.pendingVerification}
              </p>
              {stats.pendingVerification > 0 && (
                <span className="text-[8px] sm:text-[10px] font-extrabold font-mono text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full animate-pulse">
                  NEEDS REVIEW
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#8C7A6D] mt-0.5 sm:mt-1 font-medium truncate sm:whitespace-normal">
              {stats.pendingVerification > 0 ? 'Receipts pending review' : 'All receipts verified'}
            </p>
          </div>

          {/* In-Chair / Active */}
          <div className="bg-white border border-[#E6DDD1] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group min-w-0">
            <div className="flex items-center justify-between text-[#8C7A6D] relative">
              <span className="text-[9px] sm:text-xs font-extrabold uppercase tracking-wider font-mono truncate">
                Active in Chair
              </span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#FAF6F1] border border-[#E6DDD1] flex items-center justify-center text-[#C88A22] flex-shrink-0">
                <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-[#1E1915] font-['Cinzel',serif] mt-1.5 sm:mt-3">
              {stats.inChair}
            </p>
            <p className="text-[10px] sm:text-[11px] text-[#8C7A6D] mt-0.5 sm:mt-1 font-medium truncate sm:whitespace-normal">
              Receiving haircut/styling
            </p>
          </div>

          {/* Expected Revenue */}
          <div className="bg-white border border-[#E6DDD1] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group min-w-0">
            <div className="flex items-center justify-between text-[#8C7A6D] relative">
              <span className="text-[9px] sm:text-xs font-extrabold uppercase tracking-wider font-mono truncate">
                Daily Revenue
              </span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-[#1E1915] font-['Cinzel',serif] mt-1.5 sm:mt-3 truncate">
              {stats.totalRevenue} <span className="text-[11px] sm:text-sm font-sans font-extrabold text-[#8C4717]">ETB</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-emerald-800 font-bold mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
              Expected gross revenue
            </p>
          </div>

        </div>

        {/* ── Filters & Search Control Center ───────────────────── */}
        <div className="bg-white border border-[#E6DDD1] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm space-y-3 min-w-0">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-[#8C7A6D] absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, or ref (NHB-...)"
                className="w-full bg-[#FAF6F1]/70 border border-[#E6DDD1] focus:border-[#E5A93C] focus:bg-white rounded-xl sm:rounded-2xl pl-10 sm:pl-11 pr-9 sm:pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-[#1E1915] font-medium outline-none transition-all placeholder:text-[#9E8B7F] ring-0 focus:ring-2 focus:ring-[#E5A93C]/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6D] hover:text-[#1E1915] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Barber Filter */}
            <div className="relative w-full md:w-auto">
              <select
                value={selectedBarberFilter}
                onChange={(e) => setSelectedBarberFilter(e.target.value)}
                className="w-full md:w-auto bg-[#FAF6F1]/70 border border-[#E6DDD1] rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs text-[#1E1915] font-bold outline-none focus:border-[#E5A93C] focus:bg-white transition-all cursor-pointer ring-0 focus:ring-2 focus:ring-[#E5A93C]/20"
              >
                <option value="all">All Barbers (8 Chairs)</option>
                {MOCK_BARBERS.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Filter */}
            <div className="relative w-full md:w-auto">
              <select
                value={selectedPaymentFilter}
                onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                className="w-full md:w-auto bg-[#FAF6F1]/70 border border-[#E6DDD1] rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs text-[#1E1915] font-bold outline-none focus:border-[#E5A93C] focus:bg-white transition-all cursor-pointer ring-0 focus:ring-2 focus:ring-[#E5A93C]/20"
              >
                <option value="all">All Payment Statuses</option>
                <option value="pending">Verification Pending</option>
                <option value="verified">Verified Receipts</option>
              </select>
            </div>

            {/* Chair Status Filter */}
            <div className="relative w-full md:w-auto">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="w-full md:w-auto bg-[#FAF6F1]/70 border border-[#E6DDD1] rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs text-[#1E1915] font-bold outline-none focus:border-[#E5A93C] focus:bg-white transition-all cursor-pointer ring-0 focus:ring-2 focus:ring-[#E5A93C]/20"
              >
                <option value="all">All Chair Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="In-Chair">In-Chair</option>
                <option value="Completed">Completed</option>
                <option value="Customer Cancelled">Customer Cancelled</option>
                <option value="Cancelled — Refund Completed">Cancelled — Refund Completed</option>
                <option value="No-Show">No-Show</option>
              </select>
            </div>

          </div>
        </div>

        {/* ── Today's Appointments Feed ─────────────────────────── */}
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-base sm:text-xl font-extrabold text-[#1E1915] font-['Cinzel',serif] tracking-wide flex items-center gap-2">
                <span>APPOINTMENTS SCHEDULE</span>
              </h2>
              <span className="text-[11px] sm:text-xs font-mono font-black px-2 sm:px-2.5 py-0.5 rounded-full bg-[#FAF2E3] text-[#8C4717] border border-[#E5A93C]/40">
                {filteredAppointments.length} Bookings
              </span>
            </div>

            <button
              type="button"
              onClick={loadAppointments}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8C4717] hover:text-[#C88A22] transition-colors py-1.5 px-2.5 sm:px-3 rounded-xl hover:bg-white/80 border border-transparent hover:border-[#E6DDD1] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Queue</span>
            </button>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="bg-white border border-[#E6DDD1] rounded-2xl sm:rounded-3xl p-8 sm:p-14 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-[#FAF6F1] border border-[#E6DDD1] flex items-center justify-center mx-auto text-[#C88A22] shadow-inner">
                <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#1E1915] font-['Cinzel',serif]">
                  No Appointments Found
                </h3>
                <p className="text-xs sm:text-sm text-[#6E5D52]">
                  {searchQuery || selectedBarberFilter !== 'all' || selectedPaymentFilter !== 'all' || selectedStatusFilter !== 'all'
                    ? 'No bookings match your selected search or filter criteria.'
                    : `There are currently no appointments booked for ${selectedDateKey === todayKey ? 'today' : 'this date'}.`}
                </p>
              </div>

              {/* Quick Jump Banner for Dates with Active Bookings */}
              {(() => {
                const datesWithBookings = availableDates.filter(d => (dateCountsMap[d.dateKey] || 0) > 0 && d.dateKey !== selectedDateKey);
                if (datesWithBookings.length === 0) return null;

                return (
                  <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-[#FAF2E3]/90 border-2 border-[#E5A93C]/70 text-left max-w-lg mx-auto space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#8C4717] font-['Cinzel',serif]">
                      <Sparkles className="w-4 h-4 text-[#C88A22]" />
                      <span>Active Bookings Found On Other Dates</span>
                    </div>
                    <p className="text-xs text-[#6E5D52] leading-relaxed">
                      You have active reservations booked on other dates. Click below to view:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {datesWithBookings.map(d => (
                        <button
                          key={d.dateKey}
                          type="button"
                          onClick={() => setSelectedDateKey(d.dateKey)}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#140F0C] text-[#1E1915] hover:text-[#FAF6F1] border-2 border-[#E5A93C] text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer group"
                        >
                          <span>👉 {d.display.dayName}, {d.display.month} {d.display.day}</span>
                          <span className="bg-[#FAF2E3] group-hover:bg-[#E5A93C] text-[#8C4717] group-hover:text-[#140F0C] px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors">
                            {dateCountsMap[d.dateKey]} {dateCountsMap[d.dateKey] === 1 ? 'Booking' : 'Bookings'}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedDateKey('all')}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E5A93C] via-[#DF9C2F] to-[#D97706] text-[#1A1614] text-xs font-black flex items-center gap-1.5 shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>View All Dates ({allAppointments.length})</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {(searchQuery || selectedBarberFilter !== 'all' || selectedPaymentFilter !== 'all' || selectedStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedBarberFilter('all');
                    setSelectedPaymentFilter('all');
                    setSelectedStatusFilter('all');
                  }}
                  className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-extrabold bg-[#140F0C] text-white hover:bg-[#261E19] border border-[#E5A93C]/40 transition-all cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-3.5 min-w-0">
              {filteredAppointments.map((appt) => {
                const isVerified = appt.paymentStatus === 'Verified';
                const isOrigVerified = appt.originalPaymentStatus === 'Verified' || (appt.paymentStatus === 'Verified' && !appt.isEdited);
                const isInChair = appt.status === 'In-Chair' || appt.bookingStatus === 'In-Chair';
                const isCompleted = appt.status === 'Completed' || appt.bookingStatus === 'Completed';
                const isCustomerCancelled = appt.status === 'Customer Cancelled' || appt.bookingStatus === 'Customer Cancelled';
                const isRefundCompleted = appt.status === 'Cancelled — Refund Completed' || appt.bookingStatus === 'Cancelled — Refund Completed' || appt.refundStatus === 'Completed';
                const isCancelled = isCustomerCancelled || isRefundCompleted || appt.status === 'Cancelled' || appt.bookingStatus === 'Cancelled';
                const isRefundPending = isCustomerCancelled && !isRefundCompleted;

                return (
                  <div
                    key={appt.id || appt.ref || `${appt.barberId}-${appt.timeId}`}
                    className={`border rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all duration-200 hover:shadow-md relative overflow-hidden min-w-0 ${
                      isCancelled
                        ? 'border-red-200/80 bg-[#FAF7F5] opacity-95'
                        : isInChair
                        ? 'border-[#E5A93C] shadow-md ring-1 sm:ring-2 ring-[#E5A93C]/20 bg-[#FFFDF9]'
                        : 'bg-white border-[#E6DDD1]'
                    }`}
                  >
                    {/* Active In-Chair Glow Banner */}
                    {isInChair && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E5A93C] via-[#F59E0B] to-[#B45309]"></div>
                    )}

                    {/* ── MOBILE / TABLET VIEW (< lg): Stacked Appointment Card ── */}
                    <div className="block lg:hidden space-y-3">
                      
                      {/* Top Bar: Time Range, Reference Chip & Appointment Status Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-[#E6DDD1]/80 pb-2.5 flex-wrap">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <span className={`text-[11px] sm:text-xs font-extrabold font-mono px-2.5 py-1 rounded-xl ${
                            isInChair
                              ? 'bg-[#140F0C] text-[#E5A93C] border border-[#E5A93C]/40'
                              : isCancelled
                              ? 'bg-red-50 text-[#8C4717] border border-red-200/70'
                              : 'bg-[#FAF6F1] text-[#1E1915] border border-[#E6DDD1]'
                          }`}>
                            {appt.startTime || appt.timeId} – {appt.endTime || '60 min'}
                          </span>
                          {selectedDateKey === 'all' && (
                            <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-lg bg-[#FAF2E3] text-[#8C4717] border border-[#E5A93C]/40">
                              {formatAppointmentRelativeDate(appt.dateStr, currentTime)}
                            </span>
                          )}
                          
                          {/* Reference Code Chip */}
                          <button
                            type="button"
                            onClick={() => handleCopy(appt.ref)}
                            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-bold px-2 py-1 rounded-lg bg-[#FAF6F1] border border-[#E6DDD1] text-[#6E5D52] hover:text-[#1E1915] hover:border-[#E5A93C] transition-all cursor-pointer"
                            title="Copy Reference"
                          >
                            <span>{appt.ref}</span>
                            {copiedRef === appt.ref ? (
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-[#9E8B7F]" />
                            )}
                          </button>

                          {/* Distinction Badge: New Booking vs Service Changed */}
                          {appt.isEdited ? (
                            <span className="text-[9px] sm:text-[9.5px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1 shadow-2xs">
                              <span>SERVICE CHANGED</span>
                            </span>
                          ) : (
                            <span className="text-[9px] sm:text-[9.5px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 shadow-2xs">
                              <span>NEW BOOKING</span>
                            </span>
                          )}
                        </div>

                        {/* Appointment Status Badge */}
                        <span className={`text-[9px] sm:text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isInChair
                            ? 'bg-[#140F0C] text-[#E5A93C] border border-[#E5A93C]/50 flex items-center gap-1'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCustomerCancelled
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : isRefundCompleted
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : isCancelled
                            ? 'bg-red-100 text-red-700'
                            : 'bg-[#FAF2E3] text-[#8C4717] border border-[#E5A93C]/40'
                        }`}>
                          {isInChair && <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C] animate-pulse"></span>}
                          {isCustomerCancelled 
                            ? 'CUSTOMER CANCELLED' 
                            : isRefundCompleted 
                            ? 'CANCELLED · REFUNDED' 
                            : appt.status || appt.bookingStatus || 'Confirmed'}
                        </span>
                      </div>

                      {/* Card Body: Structured Information Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-[#8C7A6D] font-mono text-[10px] sm:text-[11px] uppercase font-bold min-w-[65px] flex-shrink-0">
                            Customer:
                          </span>
                          <span className="font-extrabold text-[#1E1915] font-['Cinzel',serif] text-sm truncate">
                            {appt.customerName || appt.name || 'Customer'}
                          </span>
                        </div>

                        {appt.customerPhone && (
                          <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className="text-[#8C7A6D] font-mono text-[10px] sm:text-[11px] uppercase font-bold min-w-[65px] flex-shrink-0">
                              Phone:
                            </span>
                            <a
                              href={`tel:${appt.customerPhone}`}
                              className="font-mono font-bold text-[#8C4717] hover:underline inline-flex items-center gap-1 truncate"
                            >
                              <Phone className="w-3 h-3 text-[#C88A22] flex-shrink-0" />
                              <span>{appt.customerPhone}</span>
                            </a>
                          </div>
                        )}

                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-[#8C7A6D] font-mono text-[10px] sm:text-[11px] uppercase font-bold min-w-[65px] flex-shrink-0">
                            Service:
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-[#1E1915] break-words leading-tight block">
                              {appt.serviceName}
                            </span>
                            {appt.originalServiceName && appt.originalServiceName !== appt.serviceName && (
                              <span className="text-[9.5px] text-[#8C4717] font-semibold block mt-0.5">
                                Changed from: {appt.originalServiceName} ({appt.originalPrice} ETB)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-[#8C7A6D] font-mono text-[10px] sm:text-[11px] uppercase font-bold min-w-[65px] flex-shrink-0">
                            Barber:
                          </span>
                          <span className="font-bold text-[#8C4717] bg-[#FAF2E3] px-2 py-0.5 rounded border border-[#E5A93C]/30 text-[11px] truncate">
                            {appt.barberName}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-[#8C7A6D] font-mono text-[10px] sm:text-[11px] uppercase font-bold min-w-[65px] flex-shrink-0">
                            Payment:
                          </span>
                          <div className="min-w-0">
                            <span className="font-mono font-black text-[#1E1915]">
                              {appt.price || appt.amountPaid} ETB{' '}
                              <span className="font-sans font-normal text-[#8C7A6D] uppercase text-[10px]">
                                ({appt.paymentMethod})
                              </span>
                            </span>
                            {appt.adjustmentType === 'additional_payment' && Number(appt.remainingAmount) > 0 && (
                              <span className="block text-[10px] font-bold text-amber-800 mt-0.5">
                                Paid: {appt.paidAmount} ETB • <span className="font-black">+{appt.remainingAmount} ETB Due</span>
                              </span>
                            )}
                            {(appt.adjustmentType === 'downgrade_refund_at_shop' || (appt.overpaymentAmount > 0) || (appt.originalPrice && Number(appt.originalPrice) > Number(appt.price))) && (() => {
                              const changeAmt = appt.overpaymentAmount || (Number(appt.originalPrice) - Number(appt.price));
                              const isHandedOver = Boolean(appt.shopRefundHandedOver);
                              return (
                                <div className="mt-1 relative inline-flex items-center w-full" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={isHandedOver ? 'returned' : 'pending'}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleToggleShopRefund(appt, e.target.value === 'returned');
                                    }}
                                    className={`w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-lg text-[10.5px] font-mono font-bold uppercase transition-all cursor-pointer border shadow-xs outline-none ${
                                      isHandedOver
                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200'
                                        : 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                                    }`}
                                  >
                                    <option value="pending" className="bg-white text-rose-900 font-bold">
                                      ❌ Return {changeAmt} ETB Change
                                    </option>
                                    <option value="returned" className="bg-white text-emerald-900 font-bold">
                                      ✓ {changeAmt} ETB Returned
                                    </option>
                                  </select>
                                  <ChevronDown className={`w-3.5 h-3.5 pointer-events-none absolute right-2.5 ${isHandedOver ? 'text-emerald-700' : 'text-rose-700'}`} />
                                </div>
                              );
                            })()}
                            {appt.adjustmentType === 'refund_or_credit' && (
                              <span className="block text-[10px] font-bold text-emerald-700 mt-0.5">
                                Paid: {appt.paidAmount} ETB • <span className="font-black">{appt.adjustmentAmount} ETB Credit Due</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-[#8C7A6D] font-mono text-[10px] sm:text-[11px] uppercase font-bold min-w-[65px] flex-shrink-0">
                            Status:
                          </span>
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#8C4717] bg-[#FAF2E3] px-2 py-0.5 rounded-md border border-[#E5A93C]/50">
                              <Clock className="w-3 h-3 text-[#C88A22]" />
                              Verification Pending
                            </span>
                          )}
                        </div>

                        {/* Refund status indicator on mobile */}
                        {isCancelled && (
                          <div className="flex items-baseline gap-1.5 min-w-0 sm:col-span-2 pt-1 border-t border-[#E6DDD1]/50">
                            <span className="text-[#8C7A6D] font-mono text-[10px] sm:text-[11px] uppercase font-bold min-w-[65px] flex-shrink-0">
                              Refund:
                            </span>
                            {isRefundPending ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                                Refund Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                                Refund Completed
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {appt.customerNotes && (
                        <p className="text-[11px] text-[#8C7A6D] italic bg-[#FAF6F1]/70 p-2 rounded-xl border border-[#E6DDD1]/60">
                          "{appt.customerNotes}"
                        </p>
                      )}

                      {/* Additional Payment verification callout for mobile */}
                      {appt.additionalPaymentStatus === 'Pending Verification' && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-800">Additional Proof</span>
                            <span className="text-xs font-black font-mono">+{appt.additionalSubmittedAmount || appt.remainingAmount} ETB</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleVerifyAdditionalPayment(appt)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-extrabold uppercase cursor-pointer shadow-xs"
                          >
                            Verify +{appt.additionalSubmittedAmount || appt.remainingAmount} ETB
                          </button>
                        </div>
                      )}

                      {/* Refund callout for mobile */}
                      {(appt.refundStatus === 'Refund Requested' || (Number(appt.refundAmount) > 0 && appt.refundStatus !== 'Refund Completed' && appt.refundStatus !== 'Completed')) && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-800">75% Refund Due</span>
                            <span className="text-xs font-black font-mono">{appt.refundAmount} ETB</span>
                            <span className="text-[10px] block text-rose-700 font-mono">To: {appt.refundMethod?.toUpperCase()} • {appt.refundAccount || 'Not provided'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCompleteRefund(appt)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold uppercase cursor-pointer shadow-xs"
                          >
                            Mark Paid
                          </button>
                        </div>
                      )}

                      {/* Card Footer: Touch-Friendly 44px Action Controls */}
                      <div className="flex items-center gap-2 pt-2.5 border-t border-[#E6DDD1]/80 flex-wrap sm:flex-nowrap">
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentVerification(appt)}
                          className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer border shadow-xs ${
                            isVerified
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-[#FAF2E3] text-[#8C4717] border-[#E5A93C]/70 hover:bg-[#FAF0DD]'
                          }`}
                        >
                          {isVerified ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                              <span>Verified ✓</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-[#C88A22]" />
                              <span>Verify Payment</span>
                            </>
                          )}
                        </button>

                        {(appt.receiptPreview || appt.receiptFileName || appt.paymentMethod === 'cbe' || appt.paymentMethod === 'telebirr') && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReceiptModal(appt);
                              setStaffReceiptTab('original');
                            }}
                            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5A93C]/60 hover:border-[#E5A93C] bg-[#FAF6F1] hover:bg-white text-[#1E1915] transition-all cursor-pointer shadow-xs flex-shrink-0"
                            title="View customer payment receipt"
                          >
                            <Eye className="w-4 h-4 text-[#C88A22]" />
                            <span className="text-xs font-extrabold text-[#8C4717]">Receipt</span>
                          </button>
                        )}

                        <div className="flex-1 sm:flex-initial min-w-[120px]">
                          <select
                            value={appt.status || appt.bookingStatus || 'Confirmed'}
                            onChange={(e) => handleStatusChange(appt, e.target.value)}
                            className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-extrabold outline-none border cursor-pointer transition-all shadow-xs ${
                              isInChair
                                ? 'bg-[#140F0C] text-[#FAF6F1] border-[#E5A93C] ring-1 ring-[#E5A93C]/20 font-black'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : isCustomerCancelled
                                ? 'bg-red-50 text-red-700 border-red-300 font-extrabold'
                                : isRefundCompleted
                                ? 'bg-slate-100 text-slate-700 border-slate-300 font-bold'
                                : isCancelled
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-white text-[#1E1915] border-[#E6DDD1] hover:border-[#E5A93C]'
                            }`}
                          >
                            <option value="Confirmed">Confirmed</option>
                            <option value="In-Chair">In-Chair</option>
                            <option value="Completed">Completed</option>
                            <option value="Customer Cancelled">Customer Cancelled</option>
                            <option value="Cancelled — Refund Completed">Cancelled — Refund Completed</option>
                            <option value="No-Show">No-Show</option>
                          </select>
                        </div>
                      </div>

                    </div>

                    {/* ── DESKTOP VIEW (lg: and up): Perfectly Balanced 3-Section Grid ── */}
                    <div className="hidden lg:grid lg:grid-cols-12 items-center gap-4 min-w-0">
                      
                      {/* Left: Time & Customer Information (Cols 1-4) */}
                      <div className="col-span-4 flex items-start gap-3.5 min-w-0">
                        
                        {/* Time badge */}
                        <div className={`w-24 text-center p-2 rounded-2xl border flex-shrink-0 flex flex-col justify-center ${
                          isCancelled
                            ? 'bg-red-50/60 border-red-200 text-[#6E5D52]'
                            : isInChair
                            ? 'bg-[#140F0C] border-[#E5A93C] text-white shadow-sm'
                            : 'bg-[#FAF6F1] border-[#E6DDD1] text-[#1E1915]'
                        }`}>
                          <span className={`text-[9px] font-extrabold uppercase font-mono block leading-tight ${
                            isInChair ? 'text-[#E5A93C]' : isCancelled ? 'text-red-700' : 'text-[#8C4717]'
                          }`}>
                            {selectedDateKey === 'all' ? (appt.dateStr || 'Date') : 'Time Slot'}
                          </span>
                          <span className={`text-xs sm:text-sm font-extrabold block mt-0.5 ${
                            isInChair ? 'text-white' : 'text-[#1E1915]'
                          }`}>
                            {appt.startTime || appt.timeId}
                          </span>
                          <span className={`text-[10px] block mt-0.5 ${
                            isInChair ? 'text-[#C5B9AB]' : 'text-[#8C7A6D]'
                          }`}>
                            {selectedDateKey === 'all' ? formatAppointmentRelativeDate(appt.dateStr, currentTime) : (appt.endTime || '60 min')}
                          </span>
                        </div>

                        {/* Customer details */}
                        <div className="min-w-0 space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-base text-[#1E1915] truncate font-['Cinzel',serif] tracking-wide">
                              {appt.customerName || appt.name || 'Customer'}
                            </span>
                            
                            {/* Ref Code Chip */}
                            <button
                              onClick={() => handleCopy(appt.ref)}
                              className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-lg bg-[#FAF6F1] border border-[#E6DDD1] text-[#6E5D52] hover:text-[#1E1915] hover:border-[#E5A93C] transition-all cursor-pointer"
                              title="Click to copy Reference"
                            >
                              <span>{appt.ref}</span>
                              {copiedRef === appt.ref ? (
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-[#9E8B7F]" />
                              )}
                            </button>

                            {/* Distinction Badge: New Booking vs Service Changed */}
                            {appt.isEdited ? (
                              <span className="text-[9.5px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1 shadow-2xs">
                                <span>SERVICE CHANGED</span>
                              </span>
                            ) : (
                              <span className="text-[9.5px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 shadow-2xs">
                                <span>NEW BOOKING</span>
                              </span>
                            )}

                            {isInChair && (
                              <span className="text-[9.5px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-[#140F0C] text-[#E5A93C] border border-[#E5A93C]/50 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C] animate-pulse"></span>
                                IN-CHAIR
                              </span>
                            )}

                            {isCustomerCancelled && (
                              <span className="text-[9.5px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                CUSTOMER CANCELLED
                              </span>
                            )}

                            {isRefundCompleted && (
                              <span className="text-[9.5px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                                CANCELLED · REFUNDED
                              </span>
                            )}
                          </div>

                          {/* Contact & Assigned Barber Chip */}
                          <div className="flex items-center gap-2.5 text-xs text-[#6E5D52] flex-wrap">
                            {appt.customerPhone && (
                              <a
                                href={`tel:${appt.customerPhone}`}
                                className="flex items-center gap-1 font-mono font-bold text-[#1E1915] hover:text-[#C88A22] transition-colors py-0.5 text-xs"
                              >
                                <Phone className="w-3.5 h-3.5 text-[#C88A22]" />
                                <span>{appt.customerPhone}</span>
                              </a>
                            )}
                            <span className="text-[#C5B9AB]">•</span>
                            <div className="flex items-center gap-1 text-[#8C4717] font-bold bg-[#FAF2E3] px-2 py-0.5 rounded-lg border border-[#E5A93C]/30 text-xs">
                              <User className="w-3 h-3 text-[#C88A22]" />
                              <span>Barber: {appt.barberName}</span>
                            </div>
                          </div>

                          {appt.customerNotes && (
                            <p className="text-xs text-[#8C7A6D] italic truncate max-w-md bg-[#FAF6F1]/70 px-2.5 py-1 rounded-md border border-[#E6DDD1]/60">
                              "{appt.customerNotes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Middle: Service & Price Breakdown (Cols 5-8, dedicated width with clean vertical borders) */}
                      <div className="col-span-4 flex items-center justify-start lg:border-l lg:border-r lg:border-[#E6DDD1] lg:px-5 min-w-0 overflow-hidden relative">
                        <div className="text-left w-full min-w-0">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <p className="text-[10px] font-extrabold uppercase text-[#9E8B7F] font-mono tracking-wider">
                              Requested Service
                            </p>
                            {appt.adjustmentType === 'additional_payment' && Number(appt.remainingAmount) > 0 && (
                              <span className="text-[9.5px] font-mono font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                                +{appt.remainingAmount} ETB DUE
                              </span>
                            )}
                            {(appt.adjustmentType === 'downgrade_refund_at_shop' || (appt.overpaymentAmount > 0) || (appt.originalPrice && Number(appt.originalPrice) > Number(appt.price))) && (() => {
                              const changeAmt = appt.overpaymentAmount || (Number(appt.originalPrice) - Number(appt.price));
                              const isHandedOver = Boolean(appt.shopRefundHandedOver);
                              return (
                                <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={isHandedOver ? 'returned' : 'pending'}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleToggleShopRefund(appt, e.target.value === 'returned');
                                    }}
                                    className={`appearance-none text-[9.5px] font-mono font-black uppercase tracking-wider pl-2 pr-5 py-0.5 rounded cursor-pointer border shadow-2xs transition-all outline-none ${
                                      isHandedOver
                                        ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-400 ring-1 ring-emerald-500/20'
                                        : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300 ring-1 ring-rose-500/20'
                                    }`}
                                    title="Click dropdown to change status"
                                  >
                                    <option value="pending" className="bg-white text-rose-900 font-bold">
                                      ❌ Return {changeAmt} ETB Change
                                    </option>
                                    <option value="returned" className="bg-white text-emerald-900 font-bold">
                                      ✓ {changeAmt} ETB Returned
                                    </option>
                                  </select>
                                  <ChevronDown className={`w-3 h-3 pointer-events-none absolute right-1 ${isHandedOver ? 'text-emerald-700' : 'text-rose-700'}`} />
                                </div>
                              );
                            })()}
                            {appt.adjustmentType === 'refund_or_credit' && (
                              <span className="text-[9.5px] font-mono font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                                {appt.adjustmentAmount} ETB CREDIT DUE
                              </span>
                            )}
                          </div>
                          <p className="font-extrabold text-[#1E1915] text-sm sm:text-base mt-0.5 leading-snug break-words">
                            {appt.serviceName}
                          </p>
                          {appt.originalServiceName && appt.originalServiceName !== appt.serviceName && (
                            <p className="text-[10.5px] text-[#8C4717] font-semibold truncate mt-0.5">
                              Changed from: {appt.originalServiceName} ({appt.originalPrice} ETB)
                            </p>
                          )}
                          {(appt.adjustmentType === 'downgrade_refund_at_shop' || (appt.overpaymentAmount > 0) || (appt.originalPrice && Number(appt.originalPrice) > Number(appt.price))) && (() => {
                            const changeAmt = appt.overpaymentAmount || (Number(appt.originalPrice) - Number(appt.price));
                            const isHandedOver = Boolean(appt.shopRefundHandedOver);
                            return (
                              <p className={`text-[10px] font-bold mt-0.5 flex items-center gap-1 ${isHandedOver ? 'text-emerald-800' : 'text-rose-800'}`}>
                                {isHandedOver ? (
                                  <span>✓ {changeAmt} ETB cash change handed over to customer at shop</span>
                                ) : (
                                  <span>⚠️ Hand over {changeAmt} ETB cash change to customer upon arrival</span>
                                )}
                              </p>
                            );
                          })()}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-xs font-black text-[#C88A22] font-mono tracking-wide">
                              {appt.price || appt.amountPaid} ETB
                            </p>
                            {appt.adjustmentType === 'additional_payment' && Number(appt.remainingAmount) > 0 && (
                              <span className="text-[10px] text-[#6E5D52] font-semibold">
                                (Paid: {appt.paidAmount} ETB)
                              </span>
                            )}
                            {(appt.adjustmentType === 'downgrade_refund_at_shop' || (appt.overpaymentAmount > 0) || (appt.originalPrice && Number(appt.originalPrice) > Number(appt.price))) && (
                              <span className="text-[10px] text-emerald-800 font-semibold">
                                (Submitted: {appt.submittedAmount || appt.originalPrice} ETB)
                              </span>
                            )}
                            {appt.adjustmentType === 'refund_or_credit' && (
                              <span className="text-[10px] text-[#6E5D52] font-semibold">
                                (Paid: {appt.paidAmount} ETB)
                              </span>
                            )}
                            {isRefundPending && (
                              <span className="text-[9.5px] font-extrabold font-mono text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                                Refund Pending
                              </span>
                            )}
                            {isRefundCompleted && (
                              <span className="text-[9.5px] font-extrabold font-mono text-slate-700 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded">
                                Refunded
                              </span>
                            )}
                            {appt.additionalPaymentStatus === 'Pending Verification' && (
                              <span className="text-[9.5px] font-mono font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                                ADDITIONAL +{appt.additionalSubmittedAmount || appt.remainingAmount} ETB SUBMITTED
                              </span>
                            )}
                            {(appt.refundStatus === 'Refund Requested' || (Number(appt.refundAmount) > 0 && appt.refundStatus !== 'Refund Completed' && appt.refundStatus !== 'Completed')) && (
                              <span className="text-[9.5px] font-mono font-black text-rose-900 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded block mt-0.5">
                                REFUND {appt.refundAmount} ETB DUE ({appt.refundMethod?.toUpperCase()}: {appt.refundAccount || 'No account'})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Payment Verification, Receipt Eye Icon & Chair Status Controls (Cols 9-12, right-aligned) */}
                      <div className="col-span-4 flex items-center justify-end gap-2 min-w-0">
                        
                        {/* Primary Payment / Refund Verification Action Button */}
                        {appt.refundStatus === 'Refund Requested' || (Number(appt.refundAmount) > 0 && appt.refundStatus !== 'Refund Completed' && appt.refundStatus !== 'Completed') ? (
                          <button
                            type="button"
                            onClick={() => handleCompleteRefund(appt)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex-shrink-0"
                            title="Mark 75% refund paid"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Refund Paid</span>
                          </button>
                        ) : appt.additionalPaymentStatus === 'Pending Verification' ? (
                          isOrigVerified ? (
                            <button
                              type="button"
                              onClick={() => handleVerifyAdditionalPayment(appt)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex-shrink-0"
                              title="Verify customer additional payment proof"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify +{appt.additionalSubmittedAmount || appt.remainingAmount} ETB</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleVerifyAllPayments(appt)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex-shrink-0"
                              title="Verify all payments (Original + Additional)"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify All ({appt.price || appt.amountPaid} ETB)</span>
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTogglePaymentVerification(appt)}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer border shadow-xs flex-shrink-0 ${
                              isVerified
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-emerald-500/10'
                                : 'bg-[#FAF2E3] text-[#8C4717] border-[#E5A93C]/70 hover:bg-[#FAF0DD] shadow-amber-500/10'
                            }`}
                            title="Click to toggle payment verification"
                          >
                            {isVerified ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                                <span>Verified ✓</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-[#C88A22]" />
                                <span>Verify Payment</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* View Receipt Button */}
                        {(appt.receiptPreview || appt.receiptFileName || appt.paymentMethod === 'cbe' || appt.paymentMethod === 'telebirr') && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReceiptModal(appt);
                              setStaffReceiptTab('original');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E5A93C]/60 hover:border-[#E5A93C] bg-[#FAF6F1] hover:bg-white text-[#1E1915] transition-all cursor-pointer shadow-xs hover:shadow-md group flex-shrink-0"
                            title="View uploaded payment receipt screenshot"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C88A22] group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-extrabold text-[#8C4717]">Receipt</span>
                          </button>
                        )}

                        {/* Chair Status Selector */}
                        <div className="relative flex-shrink-0">
                          <select
                            value={appt.status || appt.bookingStatus || 'Confirmed'}
                            onChange={(e) => handleStatusChange(appt, e.target.value)}
                            className={`px-3 py-2 rounded-xl text-xs font-extrabold outline-none border cursor-pointer transition-all shadow-xs ${
                              isInChair
                                ? 'bg-[#140F0C] text-[#FAF6F1] border-[#E5A93C] ring-2 ring-[#E5A93C]/20 font-black'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : isCustomerCancelled
                                ? 'bg-red-50 text-red-700 border-red-300 font-extrabold'
                                : isRefundCompleted
                                ? 'bg-slate-100 text-slate-700 border-slate-300 font-bold'
                                : isCancelled
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-white text-[#1E1915] border-[#E6DDD1] hover:border-[#E5A93C]'
                            }`}
                          >
                            <option value="Confirmed">Confirmed</option>
                            <option value="In-Chair">In-Chair</option>
                            <option value="Completed">Completed</option>
                            <option value="Customer Cancelled">Customer Cancelled</option>
                            <option value="Cancelled — Refund Completed">Cancelled — Refund Completed</option>
                            <option value="No-Show">No-Show</option>
                          </select>
                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* ── High-Definition Receipt Modal Lightbox ──────────────── */}
      {activeReceiptModal && (() => {
        const fullPrice = Number(activeReceiptModal.price) || 0;
        const origPrice = activeReceiptModal.originalPrice !== undefined ? Number(activeReceiptModal.originalPrice) : fullPrice;
        const addDiff = Math.max(0, fullPrice - origPrice);
        const isUpgradeAppointment = Boolean(
          activeReceiptModal.isEdited &&
          (activeReceiptModal.adjustmentType === 'additional_payment' || addDiff > 0)
        );
        const hasDualReceipts = Boolean(
          isUpgradeAppointment ||
          activeReceiptModal.additionalReceiptPreview ||
          getReceiptImage(`${activeReceiptModal.ref}_additional`) ||
          getReceiptImage(`${activeReceiptModal.id}_additional`) ||
          getReceiptImage(`${activeReceiptModal.bookingReference}_additional`) ||
          (typeof localStorage !== 'undefined' && (localStorage.getItem(`nhatty_active_additional_${activeReceiptModal.ref}`) || localStorage.getItem(`nhatty_active_additional_${activeReceiptModal.id}`))) ||
          activeReceiptModal.additionalPaymentStatus === 'Pending Verification' ||
          activeReceiptModal.additionalPaymentStatus === 'Verified'
        );

        const isOrigVerified = activeReceiptModal.originalPaymentStatus === 'Verified' || (activeReceiptModal.paymentStatus === 'Verified' && !activeReceiptModal.isEdited);
        const isAddVerified = activeReceiptModal.additionalPaymentStatus === 'Verified';
        const isBothVerified = isOrigVerified && isAddVerified;
        const isAllVerified = hasDualReceipts ? isBothVerified : (activeReceiptModal.paymentStatus === 'Verified');

        const isAddTab = staffReceiptTab === 'additional';
        const addImg = activeReceiptModal.additionalReceiptPreview || 
          getReceiptImage(`${activeReceiptModal.ref}_additional`) || 
          getReceiptImage(`${activeReceiptModal.id}_additional`) ||
          getReceiptImage(`${activeReceiptModal.bookingReference}_additional`) ||
          (typeof localStorage !== 'undefined' ? (localStorage.getItem(`nhatty_active_additional_${activeReceiptModal.ref}`) || localStorage.getItem(`nhatty_active_additional_${activeReceiptModal.id}`)) : null);
        const origImg = activeReceiptModal.originalReceiptPreview || activeReceiptModal.receiptPreview || getReceiptImage(activeReceiptModal.ref || activeReceiptModal.id || activeReceiptModal.bookingReference);
        const currentPreviewSrc = isAddTab ? addImg : origImg;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-[#140F0C] text-white rounded-2xl sm:rounded-3xl max-w-xl sm:max-w-2xl w-full border border-[#E5A93C]/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-[scaleUp_0.15s_ease-out]">
              
              {/* Modal Header */}
              <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/60 flex-shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#E5A93C]/20 border border-[#E5A93C]/50 flex items-center justify-center text-[#E5A93C] shadow-md flex-shrink-0">
                    <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs sm:text-base text-white font-['Cinzel',serif] tracking-wide flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span>{hasDualReceipts ? 'Service Changed — Review Receipts' : 'New Booking Payment Receipt'}</span>
                      {isAllVerified ? (
                        <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                          VERIFIED ✓
                        </span>
                      ) : (
                        <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          PENDING REVIEW
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] sm:text-[11px] text-[#C5B9AB] font-mono truncate block">
                      Ref: <strong className="text-white">{activeReceiptModal.ref}</strong> • {activeReceiptModal.customerName}
                      {hasDualReceipts && (
                        <span className="text-[#E5A93C] ml-1">
                          ({activeReceiptModal.originalServiceName || 'Original'} {origPrice} ETB ➔ {activeReceiptModal.serviceName} {fullPrice} ETB)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => setActiveReceiptModal(null)}
                  className="p-1.5 sm:p-2 rounded-xl text-[#A8988B] hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
                  title="Close Receipt Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / High-Definition Image Viewport */}
              <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                
                {/* Dual Receipt Tabs (Only for genuine upgrades / edited appointments) */}
                {hasDualReceipts && (
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/10 rounded-2xl">
                    {/* Tab 1: Original Receipt */}
                    <button
                      type="button"
                      onClick={() => setStaffReceiptTab('original')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        !isAddTab
                          ? 'bg-[#E5A93C] text-black shadow-md font-black'
                          : 'text-[#C5B9AB] hover:text-white bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <span>1. Original Receipt</span>
                        {isOrigVerified ? (
                          <span className={`text-[8.5px] sm:text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                            !isAddTab ? 'bg-black text-[#E5A93C]' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            ✓ Verified
                          </span>
                        ) : (
                          <span className={`text-[8.5px] sm:text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                            !isAddTab ? 'bg-black text-[#E5A93C]' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}>
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] sm:text-[11px] font-mono opacity-90">
                        {origPrice} ETB
                      </span>
                    </button>

                    {/* Tab 2: Additional Upgrade Receipt */}
                    <button
                      type="button"
                      onClick={() => setStaffReceiptTab('additional')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isAddTab
                          ? 'bg-[#E5A93C] text-black shadow-md font-black'
                          : 'text-[#C5B9AB] hover:text-white bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <span>2. Additional Receipt</span>
                        {isAddVerified ? (
                          <span className={`text-[8.5px] sm:text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                            isAddTab ? 'bg-black text-[#E5A93C]' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            ✓ Verified
                          </span>
                        ) : activeReceiptModal.additionalPaymentStatus === 'Pending Verification' || addImg ? (
                          <span className={`text-[8.5px] sm:text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                            isAddTab ? 'bg-black text-[#E5A93C]' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}>
                            ⏳ Pending
                          </span>
                        ) : (
                          <span className={`text-[8.5px] sm:text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                            isAddTab ? 'bg-black text-[#E5A93C]' : 'bg-slate-800 text-slate-300 border border-slate-600'
                          }`}>
                            Due
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] sm:text-[11px] font-mono opacity-90">
                        +{activeReceiptModal.additionalSubmittedAmount || activeReceiptModal.remainingAmount || addDiff} ETB
                      </span>
                    </button>
                  </div>
                )}

                {/* Image Viewport */}
                <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-black/80 min-h-[180px] flex items-center justify-center p-1.5 sm:p-2 shadow-inner">
                  {currentPreviewSrc ? (
                    <ReceiptZoomViewer
                      src={currentPreviewSrc}
                      alt={isAddTab ? "Additional payment receipt" : "Original payment receipt"}
                      fileName={isAddTab ? (activeReceiptModal.additionalReceiptFileName || 'additional_receipt.png') : (activeReceiptModal.receiptFileName || 'payment_receipt.png')}
                      theme="dark"
                      maxHeightClass="max-h-[44vh] sm:max-h-[50vh]"
                    />
                  ) : (
                    <div className="py-10 sm:py-16 text-center text-xs text-[#A8988B] space-y-2 max-w-sm mx-auto px-4">
                      <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-[#E5A93C] mx-auto opacity-70" />
                      <p className="font-bold text-white text-xs sm:text-sm">
                        {isAddTab
                          ? 'Additional Receipt Screenshot Not Yet Uploaded'
                          : 'Receipt Attachment Registered'}
                      </p>
                      <p className="font-mono text-[10px] sm:text-[11px] text-[#C5B9AB]">
                        {isAddTab
                          ? (activeReceiptModal.additionalReceiptFileName || 'Waiting for customer upload')
                          : (activeReceiptModal.receiptFileName || 'payment_receipt.png')}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-[#8C7A6D]">
                        {isAddTab
                          ? `Customer upgraded to ${activeReceiptModal.serviceName} (+${addDiff} ETB balance due).`
                          : `Initial transaction for ${activeReceiptModal.ref} (${origPrice} ETB).`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Receipt Metadata Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-white/[0.04] p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/10">
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-[#A8988B] uppercase font-mono tracking-wider block">Transfer Channel</span>
                    <span className="font-extrabold text-white uppercase text-[11px] sm:text-sm truncate block">{activeReceiptModal.paymentMethod || 'Telebirr / CBE'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-[#A8988B] uppercase font-mono tracking-wider block">
                      {hasDualReceipts ? (isAddTab ? 'Additional Proof' : 'Original Amount') : 'Amount Submitted'}
                    </span>
                    <span className="font-extrabold text-[#E5A93C] text-[11px] sm:text-sm font-mono truncate block">
                      {hasDualReceipts
                        ? (isAddTab ? `+${activeReceiptModal.additionalSubmittedAmount || activeReceiptModal.remainingAmount || addDiff} ETB` : `${origPrice} ETB`)
                        : (origPrice > fullPrice ? `${origPrice} ETB` : `${fullPrice} ETB`)}
                    </span>
                    {!hasDualReceipts && (origPrice > fullPrice || activeReceiptModal.overpaymentAmount > 0) && (() => {
                      const changeAmt = activeReceiptModal.overpaymentAmount || (origPrice - fullPrice);
                      const isHandedOver = Boolean(activeReceiptModal.shopRefundHandedOver);
                      return (
                        <div className="mt-1">
                          <div className="flex items-center gap-1.5 relative">
                            <select
                              value={isHandedOver ? 'returned' : 'pending'}
                              onChange={(e) => handleToggleShopRefund(activeReceiptModal, e.target.value === 'returned')}
                              className={`appearance-none pl-2 pr-5 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase transition-all cursor-pointer border outline-none ${
                                isHandedOver
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                              }`}
                            >
                              <option value="pending" className="bg-[#1C1613] text-rose-300 font-bold">
                                ❌ Return {changeAmt} ETB Change
                              </option>
                              <option value="returned" className="bg-[#1C1613] text-emerald-300 font-bold">
                                ✓ {changeAmt} ETB Returned
                              </option>
                            </select>
                            <ChevronDown className={`w-3 h-3 pointer-events-none absolute right-1 ${isHandedOver ? 'text-emerald-400' : 'text-rose-400'}`} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-[#A8988B] uppercase font-mono tracking-wider block">
                      {hasDualReceipts ? (isAddTab ? 'Additional Status' : 'Original Status') : 'Payment Status'}
                    </span>
                    <span className="font-bold text-white font-mono text-[11px] sm:text-sm truncate block">
                      {hasDualReceipts
                        ? (isAddTab ? (activeReceiptModal.additionalPaymentStatus || 'Pending') : (isOrigVerified ? 'Verified ✓' : 'Pending'))
                        : (activeReceiptModal.paymentStatus === 'Verified' ? 'Verified ✓' : 'Pending Review')}
                    </span>
                  </div>
                </div>

                {/* Action Controls: Independent verification of original, additional, or both */}
                <div className="space-y-2 pt-1">
                  {hasDualReceipts ? (
                    <div className="space-y-2">
                      {/* Top Row: Tab-Specific Single Verification Toggle */}
                      <div className="flex items-center gap-2">
                        {isAddTab ? (
                          isAddVerified ? (
                            <button
                              type="button"
                              onClick={() => handleRevertAdditionalPayment(activeReceiptModal)}
                              className="flex-1 min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Revert Additional to Pending</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleVerifyAdditionalPayment(activeReceiptModal)}
                              className="flex-1 min-h-[42px] py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black shadow-md"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Verify Additional Only (+{activeReceiptModal.additionalSubmittedAmount || activeReceiptModal.remainingAmount || addDiff} ETB)</span>
                            </button>
                          )
                        ) : (
                          isOrigVerified ? (
                            <button
                              type="button"
                              onClick={() => handleRevertOriginalPayment(activeReceiptModal)}
                              className="flex-1 min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Revert Original to Pending</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleVerifyOriginalPayment(activeReceiptModal)}
                              className="flex-1 min-h-[42px] py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-[#E5A93C] hover:bg-[#F59E0B] text-black shadow-md"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Verify Original Only ({origPrice} ETB)</span>
                            </button>
                          )
                        )}
                      </div>

                      {/* Bottom Row: Verify Both Receipts + Close Button */}
                      <div className="flex items-center gap-2">
                        {!isBothVerified ? (
                          <button
                            type="button"
                            onClick={() => handleVerifyAllPayments(activeReceiptModal)}
                            className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#E5A93C] via-[#D97706] to-[#B45309] text-[#140F0C] hover:brightness-110 shadow-md"
                          >
                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                            <span>Verify Both Receipts ({fullPrice} ETB)</span>
                          </button>
                        ) : (
                          <div className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Both Receipts Fully Verified ✓ ({fullPrice} ETB)</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveReceiptModal(null)}
                          className="min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl border border-white/15 text-xs font-extrabold text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Single Receipt Controls for New Bookings & Downgrades */
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentVerification(activeReceiptModal)}
                        className={`flex-1 min-h-[44px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 shadow-md ${
                          activeReceiptModal.paymentStatus === 'Verified'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-gradient-to-r from-[#E5A93C] via-[#D97706] to-[#B45309] text-[#140F0C] font-black hover:brightness-110'
                        }`}
                      >
                        {activeReceiptModal.paymentStatus === 'Verified' ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Revert to Pending</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>
                              {origPrice > fullPrice 
                                ? `Verify Receipt (${origPrice} ETB)` 
                                : `Verify Receipt Now (${fullPrice} ETB)`}
                            </span>
                          </>
                        )}
                      </button>

                      {/* If service downgraded with cash change due */}
                      {(origPrice > fullPrice || activeReceiptModal.overpaymentAmount > 0) && (() => {
                        const changeAmt = activeReceiptModal.overpaymentAmount || (origPrice - fullPrice);
                        const isHandedOver = Boolean(activeReceiptModal.shopRefundHandedOver);
                        return (
                          <button
                            type="button"
                            onClick={() => handleToggleShopRefund(activeReceiptModal)}
                            className={`min-h-[44px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md border ${
                              isHandedOver
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
                            }`}
                            title={isHandedOver ? 'Change returned! Click to revert' : 'Click to confirm cash change handed over to customer'}
                          >
                            {isHandedOver ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{changeAmt} ETB Paid ✓</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Pay {changeAmt} ETB Change</span>
                              </>
                            )}
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => setActiveReceiptModal(null)}
                        className="min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/15 text-xs font-extrabold text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Staff Footer ───────────────────────────────────────── */}
      <footer className="py-5 border-t border-[#E6DDD1] text-center text-xs text-[#8C7A6D] bg-white/60 backdrop-blur-xs mt-8">
        <p className="font-medium">Nhatty Barber House Staff Management Portal • Lucy Hotel (Ground Floor), Dessie Branch</p>
      </footer>

      {/* ── 🤖 Nhatty House Staff AI Persistent Floating Assistant ── */}
      <StaffAiAssistant
        onFilterBarber={(barberId) => setSelectedBarberFilter(barberId)}
        onFilterPayment={(paymentStatus) => setSelectedPaymentFilter(paymentStatus)}
        onFilterStatus={(status) => setSelectedStatusFilter(status)}
        onSearchQuery={(q) => setSearchQuery(q)}
        onSelectDate={(dateKey) => setSelectedDateKey(dateKey)}
        appointments={appointments}
        allAppointments={allAppointments}
      />

    </div>
  );
}
