import { 
  getAddisAbabaDateTime, 
  formatDateKey, 
  formatDisplayDate, 
  isToday, 
  getUpcomingDates, 
  formatAppointmentRelativeDate,
  getDateRelationship
} from '../services/dateTimeUtils.js';
/**
 * Booking Store & Scheduling Engine — Nhatty Barber House MVP
 * 
 * ARCHITECTURE:
 * - Shop Hours: 8:00 AM – 8:00 PM (Appointments must finish by 8:00 PM).
 * - Service Duration: 60 minutes for all services (configurable via SERVICE_DURATION_MINUTES).
 * - Staggered Barber Schedules: 15-minute staggered start times across 8 barbers.
 * - Locking Key: `${barberId}:${dateStr}:${timeId}`
 * - Persistence: LocalStorage synced state so appointments & slots survive page reloads.
 * - Shared Record Structure: Standardized for future Node.js/MySQL & Barber Dashboard.
 */

import { MOCK_BARBERS } from './barbersData.js';

export const MOCK_SERVICES = [
  { id: 'srv-1', name: 'Hair Cut Only', price: 400, duration: '30 min', category: 'haircut' },
  { id: 'srv-2', name: 'Hair Cut + Face Treatment', price: 500, duration: '45 min', category: 'combo' },
  { id: 'srv-3', name: 'Beard Sculpting & Trim', price: 300, duration: '25 min', category: 'beard' },
  { id: 'srv-4', name: 'Nhatty VIP Royal Grooming', price: 800, duration: '60 min', category: 'vip' },
  { id: 'srv-5', name: 'Kids Haircut (Under 12)', price: 300, duration: '25 min', category: 'kids' },
  { id: 'srv-6', name: 'Hot Towel Royal Shave', price: 450, duration: '35 min', category: 'shave' }
];

// ── Shop Constants & Configuration ─────────────────────────────────────
export const SERVICE_DURATION_MINUTES = 60; // 1 hour per service for MVP
export const SHOP_OPEN_MINUTES = 8 * 60;    // 8:00 AM (480 min)
export const SHOP_CLOSE_MINUTES = 20 * 60;  // 8:00 PM (1200 min)

// Barber staggered schedule configuration (15-min stagger)
export const BARBER_SCHEDULES = {
  'barber-1': { offsetMinutes: 0 },   // Abebe: 8:00, 9:00, 10:00...
  'barber-2': { offsetMinutes: 15 },  // Kebede: 8:15, 9:15, 10:15...
  'barber-3': { offsetMinutes: 30 },  // Bekele: 8:30, 9:30, 10:30...
  'barber-4': { offsetMinutes: 45 },  // Zenabu: 8:45, 9:45, 10:45...
  'barber-5': { offsetMinutes: 0 },   // Melaku: 8:00, 9:00, 10:00...
  'barber-6': { offsetMinutes: 15 },  // Dawit: 8:15, 9:15, 10:15...
  'barber-7': { offsetMinutes: 30 },  // Yohannes: 8:30, 9:30, 10:30...
  'barber-8': { offsetMinutes: 45 },  // Henok: 8:45, 9:45, 10:45...
};

// ── Time Conversion Helpers ────────────────────────────────────────────
export function minutesToDisplay(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  const minutesStr = String(minutes).padStart(2, '0');
  return `${hours12}:${minutesStr} ${ampm}`;
}

export function formatTimeId(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ── Generate Time Slots for a Specific Barber or "Any" ──────────────────
export function getBarberTimeSlots(barberId) {
  if (barberId === 'any') {
    const timeMap = new Map();
    MOCK_BARBERS.forEach((barber) => {
      const slots = getBarberTimeSlots(barber.id);
      slots.forEach((s) => {
        if (!timeMap.has(s.timeId)) {
          timeMap.set(s.timeId, s);
        }
      });
    });
    return Array.from(timeMap.values()).sort((a, b) => a.startMinutes - b.startMinutes);
  }

  const schedule = BARBER_SCHEDULES[barberId] || { offsetMinutes: 0 };
  const slots = [];
  let currentStart = SHOP_OPEN_MINUTES + schedule.offsetMinutes;

  // Appointments must NEVER extend beyond closing time (8:00 PM)
  while (currentStart + SERVICE_DURATION_MINUTES <= SHOP_CLOSE_MINUTES) {
    const endMinutes = currentStart + SERVICE_DURATION_MINUTES;
    const timeId = formatTimeId(currentStart);
    const startTime = minutesToDisplay(currentStart);
    const endTime = minutesToDisplay(endMinutes);
    const arrivalReminder = minutesToDisplay(currentStart - 10); // 10 min before

    let period = 'morning';
    if (currentStart >= 12 * 60 && currentStart < 17 * 60) {
      period = 'afternoon';
    } else if (currentStart >= 17 * 60) {
      period = 'evening';
    }

    slots.push({
      timeId,
      startMinutes: currentStart,
      endMinutes,
      startTime,
      endTime,
      display: `${startTime} – ${endTime}`,
      label: startTime,
      period,
      arrivalReminder,
    });

    currentStart += SERVICE_DURATION_MINUTES;
  }

  return slots;
}

// ── Find Barbers operating a specific time slot ─────────────────────────
export function getBarbersForSlot(timeId) {
  return MOCK_BARBERS.filter((barber) => {
    const slots = getBarberTimeSlots(barber.id);
    return slots.some((s) => s.timeId === timeId);
  });
}

// ── Storage Keys & In-Memory Map ───────────────────────────────────────
const STORAGE_KEY = 'nhatty_booked_slots_v2';
const ACTIVE_BOOKING_KEY = 'nhatty_active_booking_v2';
const bookedSlots = new Map();

// ── Dedicated High-Performance Cross-Tab Receipt Image Store ───────────
const receiptImageCache = new Map();

export function setReceiptImage(refOrId, dataUrl) {
  if (!refOrId || !dataUrl) return;
  const cleanKey = String(refOrId).trim();
  receiptImageCache.set(cleanKey, dataUrl);
  try {
    sessionStorage.setItem(`nhatty_receipt_${cleanKey}`, dataUrl);
  } catch (e) {}
  try {
    localStorage.setItem(`nhatty_img_${cleanKey}`, dataUrl);
  } catch (e) {}
}

export function getReceiptImage(refOrId) {
  if (!refOrId) return null;
  const cleanKey = String(refOrId).trim();
  if (receiptImageCache.has(cleanKey)) {
    return receiptImageCache.get(cleanKey);
  }
  try {
    const fromLocal = localStorage.getItem(`nhatty_img_${cleanKey}`);
    if (fromLocal) {
      receiptImageCache.set(cleanKey, fromLocal);
      return fromLocal;
    }
  } catch (e) {}
  try {
    const fromSession = sessionStorage.getItem(`nhatty_receipt_${cleanKey}`);
    if (fromSession) {
      receiptImageCache.set(cleanKey, fromSession);
      return fromSession;
    }
  } catch (e) {}
  return null;
}

// ── Date Formatting Helpers (Canonical from dateTimeUtils) ─────────────
export { 
  formatDateKey, 
  isToday, 
  formatDisplayDate, 
  getUpcomingDates, 
  formatAppointmentRelativeDate,
  getDateRelationship
};

// ── Real-Time Change Subscription & Pub/Sub Bus ─────────────────────────
const storeListeners = new Set();

/**
 * In-memory subscription for same-component / same-tab reactive updates
 */
export function subscribeToBookingStore(callback) {
  storeListeners.add(callback);
  return () => {
    storeListeners.delete(callback);
  };
}

/**
 * Broadcasts booking changes to in-memory subscribers, same-window custom events,
 * and cross-tab storage sync
 */
export function notifyBookingStoreChange() {
  // 1. Cross-tab synchronization via localStorage sync key
  try {
    localStorage.setItem('nhatty_booking_store_sync_ping', String(Date.now()));
  } catch (e) {}

  // 2. Same-window / same-tab CustomEvent
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('nhatty_booking_store_changed', { detail: { timestamp: Date.now() } }));
    } catch (e) {}
  }

  // 3. In-memory callbacks
  storeListeners.forEach((callback) => {
    try {
      callback();
    } catch (err) {
      console.error('Error in booking store subscriber:', err);
    }
  });
}

// ── Persistence Helpers ────────────────────────────────────────────────
export function saveBookedSlotsToStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const entries = Array.from(bookedSlots.entries()).map(([k, v]) => {
        if (v.receiptPreview) {
          if (v.ref) setReceiptImage(v.ref, v.receiptPreview);
          if (v.id) setReceiptImage(v.id, v.receiptPreview);
          if (v.bookingReference) setReceiptImage(v.bookingReference, v.receiptPreview);
        }
        return [
          k,
          {
            ...v,
            receiptPreview: null // keep master array ultra-light (< 1KB per slot)
          }
        ];
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
    notifyBookingStoreChange();
  } catch (e) {
    console.error('Error saving booked slots:', e);
  }
}

export function loadBookedSlotsFromStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      const hasV4Seed = localStorage.getItem('nhatty_seeded_v4');
      if (raw && hasV4Seed) {
        const parsed = JSON.parse(raw);
        bookedSlots.clear();
        parsed.forEach(([k, v]) => {
          const cachedImg = getReceiptImage(v.ref) || getReceiptImage(v.id) || getReceiptImage(v.bookingReference);
          bookedSlots.set(k, {
            ...v,
            receiptPreview: cachedImg || v.receiptPreview || null
          });
        });
        return;
      }
    }
  } catch (e) {}

  if (bookedSlots.size === 0) {
    seedInitialMockBookings();
  }
}

function seedInitialMockBookings() {
  const cur = getAddisAbabaDateTime();
  const today = new Date(cur.year, cur.month - 1, cur.day);
  
  const getDateOffset = (offsetDays) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offsetDays);
    return {
      key: formatDateKey(d),
      dateObj: d
    };
  };

  const yesterdayKey = getDateOffset(-1).key;
  const threeDaysAgoKey = getDateOffset(-3).key;
  const sevenDaysAgoKey = getDateOffset(-7).key;
  const fourteenDaysAgoKey = getDateOffset(-14).key;
  const twentyOneDaysAgoKey = getDateOffset(-21).key;

  // Realistic historical demo appointments ONLY (All strictly in the PAST)
  // No fake bookings seeded for today or future dates.
  const seeded = [
    // Yesterday (Past records)
    { 
      barberId: 'barber-1', 
      dateStr: yesterdayKey, 
      timeId: '14:00', 
      customerName: 'Mulugeta Tesfaye', 
      customerPhone: '0987654321',
      serviceId: 'srv-1', 
      price: 400,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-4', 
      dateStr: yesterdayKey, 
      timeId: '15:30', 
      customerName: 'Kidus Yohannes', 
      customerPhone: '0922114477',
      serviceId: 'srv-6', 
      price: 800,
      paymentMethod: 'telebirr',
      paymentStatus: 'Verified',
      status: 'Customer Cancelled',
      refundStatus: 'Completed'
    },
    { 
      barberId: 'barber-4', 
      dateStr: yesterdayKey, 
      timeId: '11:00', 
      customerName: 'Solomon Desta', 
      customerPhone: '0911553322',
      serviceId: 'srv-3', 
      price: 500,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-7', 
      dateStr: yesterdayKey, 
      timeId: '08:30', 
      customerName: 'Dawit Mengistu', 
      customerPhone: '0911234567',
      serviceId: 'srv-1', 
      price: 400,
      paymentMethod: 'telebirr',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-4', 
      dateStr: yesterdayKey, 
      timeId: '17:15', 
      customerName: 'Elias Kebede', 
      customerPhone: '0911998877',
      serviceId: 'srv-6', 
      price: 800,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },

    // 3 Days Ago (Past records)
    { 
      barberId: 'barber-1', 
      dateStr: threeDaysAgoKey, 
      timeId: '10:00', 
      customerName: 'Tewodros Kassahun', 
      customerPhone: '0922334455',
      serviceId: 'srv-3', 
      price: 500,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-3', 
      dateStr: threeDaysAgoKey, 
      timeId: '14:30', 
      customerName: 'Samuel Berhanu', 
      customerPhone: '0933445566',
      serviceId: 'srv-2', 
      price: 300,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },

    // 7 Days Ago (Last Week)
    { 
      barberId: 'barber-4', 
      dateStr: sevenDaysAgoKey, 
      timeId: '14:00', 
      customerName: 'Mulugeta Tesfaye', 
      customerPhone: '0987654321',
      serviceId: 'srv-3', 
      price: 500,
      paymentMethod: 'telebirr',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-4', 
      dateStr: sevenDaysAgoKey, 
      timeId: '16:00', 
      customerName: 'Tigist Alemayehu', 
      customerPhone: '0911889900',
      serviceId: 'srv-6', 
      price: 800,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-4', 
      dateStr: sevenDaysAgoKey, 
      timeId: '10:30', 
      customerName: 'Alemayehu Tadesse', 
      customerPhone: '0911776655',
      serviceId: 'srv-1', 
      price: 400,
      paymentMethod: 'telebirr',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-5', 
      dateStr: sevenDaysAgoKey, 
      timeId: '13:00', 
      customerName: 'Yonas Bekele', 
      customerPhone: '0922883344',
      serviceId: 'srv-2', 
      price: 300,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },

    // 14 Days Ago
    { 
      barberId: 'barber-4', 
      dateStr: fourteenDaysAgoKey, 
      timeId: '15:00', 
      customerName: 'Mulugeta Tesfaye', 
      customerPhone: '0987654321',
      serviceId: 'srv-1', 
      price: 400,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-4', 
      dateStr: fourteenDaysAgoKey, 
      timeId: '11:00', 
      customerName: 'Dawit Mengistu', 
      customerPhone: '0911234567',
      serviceId: 'srv-3', 
      price: 500,
      paymentMethod: 'telebirr',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-1', 
      dateStr: fourteenDaysAgoKey, 
      timeId: '11:30', 
      customerName: 'Tigist Alemayehu', 
      customerPhone: '0911889900',
      serviceId: 'srv-5', 
      price: 550,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },

    // 21 Days Ago
    { 
      barberId: 'barber-4', 
      dateStr: twentyOneDaysAgoKey, 
      timeId: '16:30', 
      customerName: 'Mulugeta Tesfaye', 
      customerPhone: '0987654321',
      serviceId: 'srv-5', 
      price: 650,
      paymentMethod: 'cbe',
      paymentStatus: 'Verified',
      status: 'Completed'
    },
    { 
      barberId: 'barber-4', 
      dateStr: twentyOneDaysAgoKey, 
      timeId: '14:00', 
      customerName: 'Robel Mekonnen', 
      customerPhone: '0944112233',
      serviceId: 'srv-6', 
      price: 800,
      paymentMethod: 'telebirr',
      paymentStatus: 'Verified',
      status: 'Completed'
    }
  ];

  seeded.forEach((b) => {
    const key = `${b.barberId}:${b.dateStr}:${b.timeId}`;
    const barberObj = MOCK_BARBERS.find(br => br.id === b.barberId);
    const serviceObj = MOCK_SERVICES.find(sr => sr.id === b.serviceId);
    const slots = getBarberTimeSlots(b.barberId);
    const slotObj = slots.find(s => s.timeId === b.timeId);
    const ref = `NHB-${Math.floor(10000 + Math.random() * 90000)}`;

    bookedSlots.set(key, {
      id: `seed-${Date.now()}-${Math.random()}`,
      ref,
      bookingReference: ref,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerNotes: 'Master trim & styling',
      serviceId: b.serviceId,
      serviceName: serviceObj?.name || 'Hair Cut Only',
      barberId: b.barberId,
      barberName: barberObj?.name || 'Barber',
      dateStr: b.dateStr,
      dateDisplay: formatAppointmentRelativeDate(b.dateStr),
      timeId: b.timeId,
      startTime: slotObj?.startTime || '10:00 AM',
      endTime: slotObj?.endTime || '11:00 AM',
      timeDisplay: slotObj?.display || '10:00 AM – 11:00 AM',
      arrivalReminder: slotObj?.arrivalReminder || '9:50 AM',
      price: b.price || 400,
      amountPaid: b.price || 400,
      paymentMethod: b.paymentMethod || 'cbe',
      paymentStatus: b.paymentStatus || 'Verification Pending',
      receiptFileName: 'cbe_receipt_demo.png',
      receiptPreview: null,
      status: b.status || 'Confirmed',
      bookingStatus: b.status || 'Confirmed',
      refundStatus: b.refundStatus || (b.status?.includes('Refund Completed') ? 'Completed' : 'None'),
      createdAt: new Date(b.dateStr).toISOString(),
    });
  });

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nhatty_seeded_v4', 'true');
    }
  } catch (e) {}
  saveBookedSlotsToStorage();
}

// ── Check if a specific slot is booked ──────────────────────────────────
export function isSlotBooked(barberId, dateStr, timeId, excludeKey = null) {
  const key = `${barberId}:${dateStr}:${timeId}`;
  if (excludeKey && key === excludeKey) {
    return false;
  }
  const appt = bookedSlots.get(key);
  if (!appt) return false;
  if (
    appt.status === 'Customer Cancelled' || 
    appt.status === 'Cancelled' || 
    appt.status === 'Cancelled — Refund Completed' ||
    appt.bookingStatus === 'Customer Cancelled' || 
    appt.bookingStatus === 'Cancelled' || 
    appt.bookingStatus === 'Cancelled — Refund Completed'
  ) {
    return false;
  }
  return true;
}

// ── Calculate dynamic slot status (Available / Reserved / Past) ─────────
export function getSlotStatus(barberId, dateStr, slot, dateObj, excludeKey = null) {
  const isPast = isSlotInPast(slot, dateObj);
  if (isPast) return 'past';

  if (barberId === 'any') {
    const operatingBarbers = getBarbersForSlot(slot.timeId);
    if (operatingBarbers.length === 0) return 'unavailable';

    const availableBarber = operatingBarbers.find(b => {
      const k = `${b.id}:${dateStr}:${slot.timeId}`;
      if (excludeKey && k === excludeKey) return true;
      return !isSlotBooked(b.id, dateStr, slot.timeId, excludeKey);
    });

    return availableBarber ? 'available' : 'booked';
  }

  const isBooked = isSlotBooked(barberId, dateStr, slot.timeId, excludeKey);
  return isBooked ? 'booked' : 'available';
}

export function isSlotInPast(slot, dateObj, referenceTime = new Date()) {
  if (!dateObj || !slot) return false;
  const now = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateObj);
  target.setHours(0, 0, 0, 0);

  // Past calendar date: completely unavailable
  if (target.getTime() < today.getTime()) {
    return true;
  }

  // Future calendar date: all valid slots available
  if (target.getTime() > today.getTime()) {
    return false;
  }

  // Today: enforce minimum 20-minute advance booking lead time
  // Slot must start at least 20 minutes from current local time
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return (slot.startMinutes - currentMinutes) < 20;
}

// ── Find any available barber for a slot ────────────────────────────────
export function findAvailableBarber(dateStr, timeId) {
  const operating = getBarbersForSlot(timeId);
  return operating.find(b => !isSlotBooked(b.id, dateStr, timeId)) || null;
}

// ── Generate Booking Reference ──────────────────────────────────────────
export function generateRef() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `NHB-${num}`;
}

// ── Book a Slot (with Double-Booking & Past-Slot Protection) ────────────
export function bookSlot(barberId, dateStr, timeId, customerInfo) {
  let actualBarberId = barberId;

  if (barberId === 'any') {
    const available = findAvailableBarber(dateStr, timeId);
    if (!available) {
      return { 
        success: false, 
        error: 'This appointment time was just taken. Please choose another time.' 
      };
    }
    actualBarberId = available.id;
  } else {
    // Explicit double booking check
    if (isSlotBooked(actualBarberId, dateStr, timeId)) {
      return { 
        success: false, 
        error: 'This appointment time was just taken. Please choose another time.' 
      };
    }
  }

  // Validation: ensure slot is not in the past / starts too soon (20-minute lead time)
  const slots = getBarberTimeSlots(actualBarberId);
  const slotObj = slots.find((s) => s.timeId === timeId) || getBarberTimeSlots('any').find((s) => s.timeId === timeId);
  if (slotObj && dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (isSlotInPast(slotObj, dateObj)) {
      return {
        success: false,
        error: 'This appointment time slot is in the past or starts too soon. Please select a time at least 20 minutes in advance.'
      };
    }
  }

  const key = `${actualBarberId}:${dateStr}:${timeId}`;
  const ref = generateRef();
  const barberObj = MOCK_BARBERS.find((b) => b.id === actualBarberId);
  const now = new Date();
  const createdAt = now.toISOString();
  const editDeadline = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // exactly +10 minutes

  const booking = {
    id: `appt-${Date.now()}`,
    ref,
    bookingReference: ref,
    customerName: customerInfo.name || customerInfo.customerName || 'Customer',
    customerPhone: customerInfo.phone || customerInfo.customerPhone || '',
    customerNotes: customerInfo.notes || customerInfo.customerNotes || '',
    serviceId: customerInfo.serviceId || 'srv-1',
    serviceName: customerInfo.serviceName || 'Service',
    barberId: actualBarberId,
    barberName: barberObj?.name || 'Barber',
    dateStr,
    dateDisplay: customerInfo.dateDisplay || '',
    timeId,
    startTime: slotObj?.startTime || '',
    endTime: slotObj?.endTime || '',
    timeDisplay: slotObj?.display || '',
    arrivalReminder: slotObj?.arrivalReminder || '',
    price: customerInfo.amountPaid || customerInfo.price || 0,
    amountPaid: customerInfo.amountPaid || customerInfo.price || 0,
    paymentMethod: customerInfo.paymentMethod || 'cbe',
    paymentStatus: customerInfo.paymentStatus || 'Verification Pending',
    receiptFileName: customerInfo.receiptFileName || 'receipt.png',
    receiptPreview: customerInfo.receiptPreview || null,
    status: 'Confirmed',
    bookingStatus: 'Confirmed',
    createdAt,
    editDeadline,
    updatedAt: null,
    cancelledAt: null,
    ...customerInfo,
  };

  // 1. Immediately cache receipt image under reference and ID
  if (customerInfo.receiptPreview) {
    setReceiptImage(ref, customerInfo.receiptPreview);
    setReceiptImage(booking.id, customerInfo.receiptPreview);
  }

  // 2. Immediately overwrite active booking in storage
  saveActiveBooking(booking);

  // 3. Persist into bookedSlots map and notify subscribers
  bookedSlots.set(key, booking);
  saveBookedSlotsToStorage();

  return { success: true, booking };
}

// ── Update Existing Appointment (With 10-Min Deadline & Slot Swapping) ──
export function updateAppointment(appointmentId, newDetails) {
  const current = getActiveBooking();
  if (!current || (current.id !== appointmentId && current.ref !== appointmentId)) {
    return { success: false, error: 'Appointment not found.' };
  }

  // Verify 10-minute edit deadline has not passed
  const now = Date.now();
  const deadline = current.editDeadline ? new Date(current.editDeadline).getTime() : 0;
  if (deadline && now > deadline) {
    return { success: false, error: 'The 10-minute editing window for this appointment has expired.' };
  }

  const oldBarberId = current.barberId || current.actualBarberId;
  const oldDateStr = current.dateStr;
  const oldTimeId = current.timeId;
  const oldKey = `${oldBarberId}:${oldDateStr}:${oldTimeId}`;

  const newBarberId = newDetails.barberId || oldBarberId;
  const newDateStr = newDetails.dateStr || oldDateStr;
  const newTimeId = newDetails.timeId || oldTimeId;
  const newKey = `${newBarberId}:${newDateStr}:${newTimeId}`;

  // If slot has changed, verify availability of new slot
  if (newKey !== oldKey) {
    if (bookedSlots.has(newKey)) {
      return { success: false, error: 'The newly selected appointment slot was just booked. Please choose another time.' };
    }
  }

  // Cleanly remove any previous keys for this appointment across the store
  for (const [k, v] of bookedSlots.entries()) {
    if (v.id === current.id || v.ref === current.ref || v.bookingReference === current.ref || k === oldKey) {
      bookedSlots.delete(k);
    }
  }

  const barberObj = MOCK_BARBERS.find(b => b.id === newBarberId);
  const slots = getBarberTimeSlots(newBarberId);
  const slotObj = slots.find(s => s.timeId === newTimeId) || getBarberTimeSlots('any').find(s => s.timeId === newTimeId);

  const updatedAppointment = {
    ...current,
    ...newDetails,
    barberId: newBarberId,
    barberName: barberObj?.name || current.barberName,
    dateStr: newDateStr,
    timeId: newTimeId,
    startTime: slotObj?.startTime || current.startTime,
    endTime: slotObj?.endTime || current.endTime,
    timeDisplay: slotObj?.display || current.timeDisplay,
    arrivalReminder: slotObj?.arrivalReminder || current.arrivalReminder,
    ref: current.ref, // keep same booking reference
    bookingReference: current.ref,
    createdAt: current.createdAt, // keep original createdAt
    editDeadline: current.editDeadline, // NEVER extend editDeadline on edit!
    updatedAt: new Date().toISOString(),
    status: 'Confirmed',
    bookingStatus: 'Confirmed',
  };

  saveActiveBooking(updatedAppointment);
  bookedSlots.set(newKey, updatedAppointment);
  saveBookedSlotsToStorage();

  return { success: true, appointment: updatedAppointment };
}

// ── Cancel Appointment (Releases slot and preserves historical record) ──
export function cancelAppointment(appointmentId) {
  loadBookedSlotsFromStorage();
  const current = getActiveBooking();
  if (!current) return false;

  const cancelledAppointment = {
    ...current,
    status: 'Customer Cancelled',
    bookingStatus: 'Customer Cancelled',
    refundStatus: 'Pending',
    cancelledAt: new Date().toISOString(),
  };

  // Release active slot coordinate so other clients can book it
  let existingKey = null;
  for (const [k, v] of bookedSlots.entries()) {
    if (v.id === current.id || v.ref === current.ref || v.bookingReference === current.ref) {
      existingKey = k;
      break;
    }
  }
  if (existingKey) {
    bookedSlots.delete(existingKey);
  }

  // Preserve historical record in store so Barber Dashboard audit trail remains complete
  const historicalKey = `cancelled:${current.id || current.ref || Date.now()}`;
  bookedSlots.set(historicalKey, cancelledAppointment);
  saveBookedSlotsToStorage();

  saveActiveBooking(cancelledAppointment);
  return cancelledAppointment;
}

// ── Cancel a Booking Direct Helper ────────────────────────────────────
export function cancelBooking(barberId, dateStr, timeId) {
  loadBookedSlotsFromStorage();
  const key = `${barberId}:${dateStr}:${timeId}`;
  let existing = bookedSlots.get(key);
  
  if (!existing) {
    const active = getActiveBooking();
    if (active && (active.barberId === barberId || active.actualBarberId === barberId) && active.dateStr === dateStr && active.timeId === timeId) {
      existing = active;
    }
  }

  if (existing) {
    const cancelledAppointment = {
      ...existing,
      status: 'Customer Cancelled',
      bookingStatus: 'Customer Cancelled',
      refundStatus: 'Pending',
      cancelledAt: new Date().toISOString(),
    };
    bookedSlots.delete(key);
    const historicalKey = `cancelled:${existing.id || existing.ref || Date.now()}`;
    bookedSlots.set(historicalKey, cancelledAppointment);
    saveBookedSlotsToStorage();
    saveActiveBooking(cancelledAppointment);
    return cancelledAppointment;
  }
  
  return true;
}

// ── Active Booking / My Appointment Persistence ────────────────────────
export function getActiveBooking() {
  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.ref) {
        // Sync with live state in bookedSlots if present
        loadBookedSlotsFromStorage();
        for (const b of bookedSlots.values()) {
          if (b.id === parsed.id || b.ref === parsed.ref || b.bookingReference === parsed.ref) {
            const cachedImg = getReceiptImage(b.ref || b.id);
            return normalizeAppointment({
              ...b,
              receiptPreview: cachedImg || b.receiptPreview || null
            });
          }
        }
        const cachedImg = getReceiptImage(parsed.ref || parsed.id);
        return normalizeAppointment({
          ...parsed,
          receiptPreview: cachedImg || parsed.receiptPreview || null
        });
      }
    }
  } catch (e) {}

  // Fallback: If ACTIVE_BOOKING_KEY is somehow missing, find the most recently created confirmed booking
  try {
    loadBookedSlotsFromStorage();
    const confirmedBookings = Array.from(bookedSlots.values())
      .filter(b => (b.status === 'Confirmed' || b.bookingStatus === 'Confirmed') && b.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (confirmedBookings.length > 0) {
      const b = confirmedBookings[0];
      const cachedImg = getReceiptImage(b.ref || b.id);
      return normalizeAppointment({
        ...b,
        receiptPreview: cachedImg || b.receiptPreview || null
      });
    }
  } catch (err) {}

  return null;
}

export function saveActiveBooking(booking) {
  if (!booking) {
    clearActiveBooking();
    return;
  }

  if (booking.receiptPreview) {
    setReceiptImage(booking.ref || booking.id, booking.receiptPreview);
  }

  try {
    const cleanBooking = {
      ...booking,
      receiptPreview: null // keep localStorage entry ultra-light (< 1KB)
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_BOOKING_KEY, JSON.stringify(cleanBooking));
    }
    notifyBookingStoreChange();
  } catch (e) {
    console.error('Error saving active booking:', e);
  }
}

export function clearActiveBooking() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACTIVE_BOOKING_KEY);
    }
    notifyBookingStoreChange();
  } catch (e) {}
}

// ── Staff Dashboard Query & Management Functions ───────────────────────

/**
 * Retrieve all appointments across the store, combined with active local bookings,
 * chronologically sorted.
 */

/**
 * Normalizes appointment records with dynamic, real-time dateDisplay
 * to eliminate stale date labels across day transitions.
 */
export function normalizeAppointment(appt) {
  if (!appt) return null;
  const dynRelativeDate = formatAppointmentRelativeDate(appt.dateStr);
  return {
    ...appt,
    dateDisplay: dynRelativeDate || appt.dateStr,
    relativeDate: dynRelativeDate || appt.dateStr
  };
}

export function getAllAppointments() {
  loadBookedSlotsFromStorage();
  const mapList = Array.from(bookedSlots.values()).map(b => {
    const cachedImg = getReceiptImage(b.ref || b.id || b.bookingReference);
    return {
      ...b,
      receiptPreview: cachedImg || b.receiptPreview || null
    };
  });
  const active = getActiveBooking();

  // If there is an active booking that somehow is not in bookedSlots yet, merge it
  if (active && (active.status === 'Confirmed' || active.bookingStatus === 'Confirmed')) {
    const alreadyInList = mapList.some(a => 
      (a.id && a.id === active.id) || 
      (a.ref && a.ref === active.ref) || 
      (a.barberId === active.barberId && a.dateStr === active.dateStr && a.timeId === active.timeId)
    );
    if (!alreadyInList) {
      mapList.push(active);
    }
  }

  // Sort by date then time
  return mapList.map(normalizeAppointment).sort((a, b) => {
    if (a.dateStr !== b.dateStr) {
      return a.dateStr.localeCompare(b.dateStr);
    }
    return (a.timeId || '').localeCompare(b.timeId || '');
  });
}

/**
 * Retrieve appointments for a specific date (defaults to today)
 */
export function getAppointmentsByDate(dateStr) {
  const targetDate = dateStr || formatDateKey(new Date());
  const all = getAllAppointments();
  return all.filter(a => a.dateStr === targetDate);
}

/**
 * Staff verification of customer payment receipt
 */
export function updateStaffPaymentStatus(refOrId, newPaymentStatus) {
  loadBookedSlotsFromStorage();
  let matched = false;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();
    const bKey = String(key).trim().toLowerCase();

    if (
      bId === searchStr || 
      bRef === searchStr || 
      bKey === searchStr || 
      slotKey === searchStr
    ) {
      const updated = {
        ...b,
        paymentStatus: newPaymentStatus,
        verifiedAt: new Date().toISOString()
      };
      bookedSlots.set(key, updated);
      matched = true;
    }
  }

  // Also update active booking in storage if it matches
  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          const updatedActive = {
            ...active,
            paymentStatus: newPaymentStatus,
            verifiedAt: new Date().toISOString()
          };
          localStorage.setItem(ACTIVE_BOOKING_KEY, JSON.stringify(updatedActive));
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  return { success: matched };
}

/**
 * Staff chair status update (Confirmed, In-Chair, Completed, Customer Cancelled, Cancelled — Refund Completed, No-Show)
 */
export function updateStaffBookingStatus(refOrId, newStatus) {
  loadBookedSlotsFromStorage();
  let matched = false;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  let refundStatus = null;
  if (newStatus === 'Cancelled — Refund Completed') {
    refundStatus = 'Completed';
  } else if (newStatus === 'Customer Cancelled' || newStatus === 'Cancelled') {
    refundStatus = 'Pending';
  }

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();
    const bKey = String(key).trim().toLowerCase();

    if (
      bId === searchStr || 
      bRef === searchStr || 
      bKey === searchStr || 
      slotKey === searchStr
    ) {
      const updated = {
        ...b,
        status: newStatus,
        bookingStatus: newStatus,
        ...(refundStatus ? { refundStatus } : {}),
        ...(newStatus === 'Cancelled — Refund Completed' ? { refundedAt: new Date().toISOString() } : {}),
        updatedAt: new Date().toISOString()
      };
      bookedSlots.set(key, updated);
      matched = true;
    }
  }

  // Also update active booking in storage if it matches
  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          const updatedActive = {
            ...active,
            status: newStatus,
            bookingStatus: newStatus,
            ...(refundStatus ? { refundStatus } : {}),
            ...(newStatus === 'Cancelled — Refund Completed' ? { refundedAt: new Date().toISOString() } : {}),
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(ACTIVE_BOOKING_KEY, JSON.stringify(updatedActive));
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  return { success: matched };
}

// ── Appointment Expiration / Past Status Helper ────────────────────────
export function getAppointmentEndDateTime(appointment) {
  if (!appointment || !appointment.dateStr) return null;

  try {
    const parts = appointment.dateStr.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;

    let endHours = 20;
    let endMinutes = 0;

    if (appointment.endTime) {
      const match = appointment.endTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        endHours = h;
        endMinutes = m;
      }
    } else if (appointment.timeId) {
      const [startH, startM] = appointment.timeId.split(':').map(Number);
      const totalEndMinutes = (startH * 60 + startM) + (SERVICE_DURATION_MINUTES || 60);
      endHours = Math.floor(totalEndMinutes / 60);
      endMinutes = totalEndMinutes % 60;
    }

    return new Date(year, month - 1, day, endHours, endMinutes, 0, 0);
  } catch (e) {
    return null;
  }
}

export function isAppointmentPast(appointment, referenceTime = null) {
  if (!appointment) return false;
  const rel = getDateRelationship(appointment, referenceTime);
  return rel.isPast;
}

export function isAppointmentActive(appointment, referenceTime = null) {
  if (!appointment) return false;
  const rel = getDateRelationship(appointment, referenceTime);
  if (rel.isCancelled || rel.isRefundCompleted || rel.isCompleted) return false;
  return !rel.isPast;
}

export function getAppointmentLifecycle(appointment, referenceTime = null) {
  if (!appointment || (!appointment.ref && !appointment.id)) return 'none';
  const rel = getDateRelationship(appointment, referenceTime);
  if (rel.isCancelled || rel.isRefundCompleted) return 'cancelled';
  if (rel.isCompleted) return 'completed';
  if (rel.isInProgress) return 'in_progress';
  if (rel.isPast) return 'past';
  return 'upcoming';
}

// ── Convenience Live Accessors for Staff AI & Dashboard ──────────────
export function createNewBooking(details) {
  const barberId = details.barberId || 'barber-1';
  const dateStr = details.dateStr || formatDateKey(new Date());
  const timeId = details.timeId || '10:00';
  return bookSlot(barberId, dateStr, timeId, details, true);
}

export function getBookingsForDate(dateStr) {
  return getAppointmentsByDate(dateStr);
}

export function getBookingByReference(ref) {
  const all = getAllAppointments();
  const searchStr = String(ref || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const found = all.find(a => {
    const aRef = String(a.ref || a.bookingReference || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const aId = String(a.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return aRef === searchStr || aId === searchStr || aRef.includes(searchStr);
  });
  return normalizeAppointment(found);
}

export function findCustomersInStore(queryStr) {
  const all = getAllAppointments();
  const cleanQ = String(queryStr || '').toLowerCase().trim();
  const rawDigits = cleanQ.replace(/\D/g, '');

  return all.filter(a => {
    const name = (a.customerName || a.name || '').toLowerCase();
    const phone = (a.customerPhone || a.phone || '').replace(/\D/g, '');
    const ref = (a.ref || a.bookingReference || '').toLowerCase();

    if (rawDigits && rawDigits.length >= 4 && phone.includes(rawDigits)) return true;
    if (ref.includes(cleanQ)) return true;
    if (name.includes(cleanQ)) return true;
    return false;
  });
}

// ── Initialize ──────────────────────────────────────────────────────────
loadBookedSlotsFromStorage();

