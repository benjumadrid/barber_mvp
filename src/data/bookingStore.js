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
  { id: 'srv-5', name: 'Kids Haircut (Under 12)', price: 350, duration: '25 min', category: 'kids' },
  { id: 'srv-6', name: 'Hot Towel Royal Shave', price: 350, duration: '30 min', category: 'shave' }
];

// ── Shop Constants & Configuration ─────────────────────────────────────
export const SERVICE_DURATION_MINUTES = 60; // 1 hour per service for MVP
export const APPOINTMENT_EDIT_WINDOW_MINUTES = 11; // Canonical 11-minute modification window
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
  } catch (e) {
    // Quota management: prune older receipt images if localStorage is full
    try {
      const keysToPrune = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('nhatty_img_') && !k.includes(cleanKey)) {
          keysToPrune.push(k);
        }
      }
      for (let i = 0; i < Math.min(keysToPrune.length, 5); i++) {
        localStorage.removeItem(keysToPrune[i]);
      }
      localStorage.setItem(`nhatty_img_${cleanKey}`, dataUrl);
    } catch (e2) {}
  }
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
  if (cleanKey.endsWith('_additional')) {
    const baseKey = cleanKey.replace(/_additional$/, '');
    try {
      const directAdd = localStorage.getItem(`nhatty_active_additional_${baseKey}`);
      if (directAdd) {
        receiptImageCache.set(cleanKey, directAdd);
        return directAdd;
      }
    } catch (e) {}
  }
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
        if (v.receiptPreview || v.originalReceiptPreview) {
          const orig = v.originalReceiptPreview || v.receiptPreview;
          if (v.ref) setReceiptImage(v.ref, orig);
          if (v.id) setReceiptImage(v.id, orig);
          if (v.bookingReference) setReceiptImage(v.bookingReference, orig);
        }
        if (v.additionalReceiptPreview) {
          if (v.ref) setReceiptImage(`${v.ref}_additional`, v.additionalReceiptPreview);
          if (v.id) setReceiptImage(`${v.id}_additional`, v.additionalReceiptPreview);
          if (v.bookingReference) setReceiptImage(`${v.bookingReference}_additional`, v.additionalReceiptPreview);
        }
        return [
          k,
          {
            ...v,
            receiptPreview: null, // keep master array ultra-light (< 1KB per slot)
            originalReceiptPreview: null,
            additionalReceiptPreview: null
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
          const cachedAddImg = 
            getReceiptImage(`${v.ref}_additional`) || 
            getReceiptImage(`${v.id}_additional`) || 
            getReceiptImage(`${v.bookingReference}_additional`) ||
            (typeof localStorage !== 'undefined' ? (localStorage.getItem(`nhatty_active_additional_${v.ref}`) || localStorage.getItem(`nhatty_active_additional_${v.id}`)) : null);
          bookedSlots.set(k, {
            ...v,
            receiptPreview: cachedImg || v.receiptPreview || null,
            originalReceiptPreview: cachedImg || v.originalReceiptPreview || null,
            additionalReceiptPreview: cachedAddImg || v.additionalReceiptPreview || null
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
  const editDeadline = new Date(now.getTime() + APPOINTMENT_EDIT_WINDOW_MINUTES * 60 * 1000).toISOString(); // exactly +11 minutes

  const fullInitialPrice = Number(customerInfo.price) || Number(customerInfo.amountPaid) || 0;
  const isInitialVerified = customerInfo.paymentStatus === 'Verified';

  const booking = {
    ...customerInfo,
    id: `appt-${Date.now()}`,
    ref,
    bookingReference: ref,
    customerName: customerInfo.name || customerInfo.customerName || 'Customer',
    customerPhone: customerInfo.phone || customerInfo.customerPhone || '',
    customerNotes: customerInfo.notes || customerInfo.customerNotes || '',
    serviceId: customerInfo.serviceId || 'srv-1',
    serviceName: customerInfo.serviceName || 'Service',
    // Baseline & current service tracking
    originalServiceId: customerInfo.serviceId || 'srv-1',
    originalServiceName: customerInfo.serviceName || 'Service',
    originalPrice: fullInitialPrice,
    currentServiceId: customerInfo.serviceId || 'srv-1',
    currentServiceName: customerInfo.serviceName || 'Service',
    currentPrice: fullInitialPrice,
    isEdited: false, // Explicitly false for new bookings; never an edit/upgrade
    barberId: actualBarberId,
    barberName: barberObj?.name || 'Barber',
    dateStr,
    dateDisplay: customerInfo.dateDisplay || '',
    timeId,
    startTime: slotObj?.startTime || '',
    endTime: slotObj?.endTime || '',
    timeDisplay: slotObj?.display || '',
    arrivalReminder: slotObj?.arrivalReminder || '',
    price: fullInitialPrice,
    amountPaid: isInitialVerified ? fullInitialPrice : 0,
    paidAmount: isInitialVerified ? fullInitialPrice : 0,
    submittedAmount: fullInitialPrice,
    remainingAmount: 0, // Brand new booking: customer submitted full price receipt, zero balance due!
    adjustmentAmount: 0,
    adjustmentType: 'none',

    // Decoupled receipts & separate additional receipt storage
    originalReceiptPreview: customerInfo.receiptPreview || customerInfo.originalReceiptPreview || null,
    originalReceiptFileName: customerInfo.receiptFileName || customerInfo.originalReceiptFileName || 'receipt.png',
    receiptFileName: customerInfo.receiptFileName || 'receipt.png',
    receiptPreview: customerInfo.receiptPreview || null,
    additionalReceiptPreview: null,
    additionalReceiptFileName: null,
    additionalSubmittedAmount: 0,
    additionalPaymentStatus: 'None',

    originalPaymentStatus: isInitialVerified ? 'Verified' : 'Pending Verification',
    verifiedOriginalAmount: isInitialVerified ? fullInitialPrice : 0,
    verifiedAdditionalAmount: 0,

    // 75% Refund policy & destination details
    refundMethod: null,
    refundAccount: null,
    refundAmount: 0,
    refundFee: 0,
    refundStatus: 'None',
    refundRequestedAt: null,
    refundCompletedAt: null,

    paymentMethod: customerInfo.paymentMethod || 'cbe',
    paymentStatus: isInitialVerified ? 'Verified' : 'Verification Pending',
    status: 'Confirmed',
    bookingStatus: 'Confirmed',
    createdAt,
    editDeadline,
    updatedAt: null,
    cancelledAt: null,
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

// ── Update Existing Appointment (With 11-Min Deadline & Slot Swapping) ──
export function updateAppointment(appointmentId, newDetails) {
  let current = getActiveBooking();
  if (!current || (current.id !== appointmentId && current.ref !== appointmentId)) {
    for (const v of bookedSlots.values()) {
      if (v.id === appointmentId || v.ref === appointmentId || v.bookingReference === appointmentId) {
        current = v;
        break;
      }
    }
  }
  if (!current) {
    return { success: false, error: 'Appointment not found.' };
  }

  // Verify 11-minute edit deadline has not passed
  const now = Date.now();
  const deadline = current.editDeadline ? new Date(current.editDeadline).getTime() : 0;
  if (deadline && now > deadline) {
    return { success: false, error: `The ${APPOINTMENT_EDIT_WINDOW_MINUTES}-minute editing window for this appointment has expired.` };
  }

  const oldBarberId = current.barberId || current.actualBarberId;
  const oldDateStr = current.dateStr;
  const oldTimeId = current.timeId;
  const oldKey = `${oldBarberId}:${oldDateStr}:${oldTimeId}`;

  const newBarberId = newDetails.barberId || oldBarberId;
  const newDateStr = newDetails.dateStr || oldDateStr;
  const newTimeId = newDetails.timeId || oldTimeId;
  const newKey = `${newBarberId}:${newDateStr}:${newTimeId}`;

  // Validate canonical service: only allow real existing services
  if (newDetails.serviceId) {
    const isValidService = MOCK_SERVICES.some(s => s.id === newDetails.serviceId);
    if (!isValidService) {
      return { success: false, error: 'Invalid service selected. Please choose an existing service.' };
    }
  }

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

  // ── Service Change & Payment Adjustment Calculation ────────────────
  // 1. Preserve original baseline service & price across multiple edits
  const originalServiceId = current.originalServiceId || current.serviceId || 'srv-1';
  const originalServiceName = current.originalServiceName || current.serviceName || 'Service';
  const originalPrice = current.originalPrice !== undefined ? Number(current.originalPrice) : (Number(current.price) || 0);

  // 2. Resolve new service details
  const newServiceId = newDetails.serviceId || current.serviceId || 'srv-1';
  const matchedService = MOCK_SERVICES.find(s => s.id === newServiceId);
  const newServiceName = matchedService?.name || newDetails.serviceName || current.serviceName || 'Service';
  const newPrice = matchedService?.price !== undefined 
    ? Number(matchedService.price) 
    : (newDetails.price !== undefined ? Number(newDetails.price) : Number(current.price));

  // 3. Determine verified money collected so far
  const isOriginalVerified = current.paymentStatus === 'Verified' || (Number(current.verifiedOriginalAmount) > 0) || (Number(current.paidAmount) > 0);
  const verifiedOriginal = isOriginalVerified 
    ? (current.verifiedOriginalAmount !== undefined 
        ? Number(current.verifiedOriginalAmount) 
        : (current.paidAmount !== undefined ? Number(current.paidAmount) : (Number(current.amountPaid) || originalPrice)))
    : 0;

  const verifiedAdditional = Number(current.verifiedAdditionalAmount) || 0;
  const totalVerifiedSoFar = verifiedOriginal + verifiedAdditional;

  let paidAmount = totalVerifiedSoFar;
  let remainingAmount = 0;
  let adjustmentAmount = 0;
  let adjustmentType = 'none';
  let overpaymentAmount = 0;
  let overpaymentRefundAtShop = 0;
  let shopRefundNote = null;
  let refundAmount = 0;
  let refundFee = 0;
  let refundMethod = null;
  let refundAccount = null;
  let refundStatus = 'None';
  let paymentStatus = current.paymentStatus || 'Verification Pending';

  // Compare newPrice against the baseline service price (or verified amount)
  const baselinePrice = (isOriginalVerified && totalVerifiedSoFar > 0) ? totalVerifiedSoFar : originalPrice;
  const diff = newPrice - baselinePrice;

  if (diff > 0) {
    // Upgraded to more expensive service:
    // Customer must submit an additional payment receipt for ONLY the remaining amount
    adjustmentType = 'additional_payment';
    adjustmentAmount = diff;
    remainingAmount = diff;
    paidAmount = isOriginalVerified ? totalVerifiedSoFar : 0;
    paymentStatus = (newDetails.additionalReceiptPreview || newDetails.additionalPaymentStatus === 'Pending Verification' || current.additionalPaymentStatus === 'Pending Verification')
      ? 'Additional Payment Pending Verification'
      : (isOriginalVerified ? 'Additional Payment Due' : 'Verification Pending');
    refundAmount = 0;
    refundFee = 0;
    refundStatus = 'None';
  } else if (diff < 0) {
    // Downgraded / changed to cheaper service:
    // Policy: 75% refund is strictly for CANCELLATIONS, NOT service changes.
    // 100% of the price difference is returned in cash at the shop when arriving for haircut!
    const priceDiff = Math.abs(diff);
    adjustmentType = 'downgrade_refund_at_shop';
    adjustmentAmount = priceDiff;
    overpaymentAmount = priceDiff;
    overpaymentRefundAtShop = priceDiff;
    remainingAmount = 0;
    paidAmount = isOriginalVerified ? newPrice : 0;
    paymentStatus = isOriginalVerified ? 'Verified' : 'Verification Pending';
    refundAmount = 0;
    refundFee = 0;
    refundStatus = 'None';
    refundMethod = null;
    refundAccount = null;
    shopRefundNote = `Customer will receive ${priceDiff} ETB cash change in person at the shop when they arrive for their haircut.`;
  } else {
    // Same price or reverted back to original service
    adjustmentType = 'none';
    adjustmentAmount = 0;
    remainingAmount = 0;
    paidAmount = isOriginalVerified ? newPrice : 0;
    paymentStatus = isOriginalVerified ? 'Verified' : 'Verification Pending';
    refundAmount = 0;
    refundFee = 0;
    refundStatus = 'None';
  }

  const updatedAppointment = {
    ...current,
    ...newDetails,
    isEdited: true, // Marked as an edited appointment
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
    
    // Canonical baseline service & current service
    originalServiceId,
    originalServiceName,
    originalPrice,
    currentServiceId: newServiceId,
    currentServiceName: newServiceName,
    currentPrice: newPrice,
    serviceId: newServiceId,
    serviceName: newServiceName,
    price: newPrice,

    // Decoupled receipts & amounts
    originalReceiptPreview: current.originalReceiptPreview || current.receiptPreview || null,
    originalReceiptFileName: current.originalReceiptFileName || current.receiptFileName || 'receipt.png',
    receiptPreview: current.originalReceiptPreview || current.receiptPreview || null,
    receiptFileName: current.originalReceiptFileName || current.receiptFileName || 'receipt.png',
    additionalReceiptPreview: newDetails.additionalReceiptPreview !== undefined ? newDetails.additionalReceiptPreview : (current.additionalReceiptPreview || null),
    additionalReceiptFileName: newDetails.additionalReceiptFileName !== undefined ? newDetails.additionalReceiptFileName : (current.additionalReceiptFileName || null),
    additionalSubmittedAmount: newDetails.additionalSubmittedAmount !== undefined ? Number(newDetails.additionalSubmittedAmount) : (newDetails.additionalReceiptPreview ? diff : (Number(current.additionalSubmittedAmount) || 0)),
    additionalPaymentStatus: newDetails.additionalPaymentStatus || (newDetails.additionalReceiptPreview ? 'Pending Verification' : (current.additionalPaymentStatus || 'None')),
    additionalPaymentSubmittedAt: newDetails.additionalReceiptPreview ? new Date().toISOString() : (current.additionalPaymentSubmittedAt || null),

    verifiedOriginalAmount: verifiedOriginal,
    verifiedAdditionalAmount: verifiedAdditional,
    paidAmount,
    amountPaid: paidAmount, // CRITICAL FIX: never newPrice! Always actual verified money
    submittedAmount: current.submittedAmount || current.originalSubmittedAmount || current.originalPrice || originalPrice,
    remainingAmount,
    adjustmentAmount,
    adjustmentType,
    overpaymentAmount,
    overpaymentRefundAtShop,
    shopRefundNote,
    shopRefundHandedOver: (diff < 0) ? Boolean(current.shopRefundHandedOver) : false,
    shopRefundHandedOverAt: (diff < 0) ? (current.shopRefundHandedOverAt || null) : null,
    shopRefundHandedOverBy: (diff < 0) ? (current.shopRefundHandedOverBy || null) : null,

    // 75% Refund policy & destination details (strictly for cancellations)
    refundMethod,
    refundAccount,
    refundAmount,
    refundFee,
    refundStatus,
    refundRequestedAt: null,

    paymentStatus,
  };

  saveActiveBooking(updatedAppointment);
  bookedSlots.set(newKey, updatedAppointment);
  saveBookedSlotsToStorage();

  return { success: true, appointment: updatedAppointment };
}

// ── Cancel Appointment (Releases slot and preserves historical record) ──
export function cancelAppointment(appointmentId, refundDetails = {}) {
  loadBookedSlotsFromStorage();
  let current = getActiveBooking();
  if (!current || (appointmentId && current.id !== appointmentId && current.ref !== appointmentId)) {
    for (const v of bookedSlots.values()) {
      if (v.id === appointmentId || v.ref === appointmentId || v.bookingReference === appointmentId) {
        current = v;
        break;
      }
    }
  }
  if (!current) return { success: false, error: 'Appointment not found' };

  const isOriginalVerified = current.paymentStatus === 'Verified' || (Number(current.verifiedOriginalAmount) > 0) || (Number(current.paidAmount) > 0);
  const verifiedPaid = isOriginalVerified
    ? (current.verifiedOriginalAmount !== undefined
        ? Number(current.verifiedOriginalAmount)
        : (current.paidAmount !== undefined ? Number(current.paidAmount) : (Number(current.amountPaid) || Number(current.price) || 0)))
    : 0;

  let refundAmount = 0;
  let refundFee = 0;
  let refundStatus = 'None';
  const refundMethod = refundDetails.refundMethod || current.refundMethod || (verifiedPaid > 0 ? 'telebirr' : null);
  const refundAccount = refundDetails.refundAccount || current.refundAccount || null;

  if (verifiedPaid > 0) {
    refundAmount = Math.round(verifiedPaid * 0.75 * 100) / 100;
    refundFee = Math.round(verifiedPaid * 0.25 * 100) / 100;
    refundStatus = 'Refund Requested';
  }

  const cancelledAppointment = {
    ...current,
    status: 'Customer Cancelled',
    bookingStatus: 'Customer Cancelled',
    refundStatus,
    refundAmount,
    refundFee,
    refundMethod,
    refundAccount,
    refundRequestedAt: verifiedPaid > 0 ? new Date().toISOString() : null,
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
  return {
    ...cancelledAppointment,
    success: true,
    appointment: cancelledAppointment
  };
}

// ── Cancel a Booking Direct Helper ────────────────────────────────────
export function cancelBooking(barberId, dateStr, timeId, refundDetails = {}) {
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
    const isOriginalVerified = existing.paymentStatus === 'Verified' || (Number(existing.verifiedOriginalAmount) > 0) || (Number(existing.paidAmount) > 0);
    const verifiedPaid = isOriginalVerified
      ? (existing.verifiedOriginalAmount !== undefined
          ? Number(existing.verifiedOriginalAmount)
          : (existing.paidAmount !== undefined ? Number(existing.paidAmount) : (Number(existing.amountPaid) || Number(existing.price) || 0)))
      : 0;

    let refundAmount = 0;
    let refundFee = 0;
    let refundStatus = 'None';
    const refundMethod = refundDetails.refundMethod || existing.refundMethod || (verifiedPaid > 0 ? 'telebirr' : null);
    const refundAccount = refundDetails.refundAccount || existing.refundAccount || null;

    if (verifiedPaid > 0) {
      refundAmount = Math.round(verifiedPaid * 0.75 * 100) / 100;
      refundFee = Math.round(verifiedPaid * 0.25 * 100) / 100;
      refundStatus = 'Refund Requested';
    }

    const cancelledAppointment = {
      ...existing,
      status: 'Customer Cancelled',
      bookingStatus: 'Customer Cancelled',
      refundStatus,
      refundAmount,
      refundFee,
      refundMethod,
      refundAccount,
      refundRequestedAt: verifiedPaid > 0 ? new Date().toISOString() : null,
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

// ── Submit Additional Payment Receipt ──────────────────────────────────
export function submitAdditionalPaymentReceipt(appointmentId, { receiptPreview, receiptFileName, amount }) {
  loadBookedSlotsFromStorage();
  const current = getActiveBooking();
  if (!current || (current.id !== appointmentId && current.ref !== appointmentId && current.bookingReference !== appointmentId)) {
    return { success: false, error: 'Appointment not found.' };
  }

  const additionalAmount = Number(amount) || Number(current.remainingAmount) || 0;
  const fileName = receiptFileName || 'additional_receipt.png';

  if (receiptPreview) {
    if (current.ref) setReceiptImage(`${current.ref}_additional`, receiptPreview);
    if (current.id) setReceiptImage(`${current.id}_additional`, receiptPreview);
    if (current.bookingReference) setReceiptImage(`${current.bookingReference}_additional`, receiptPreview);
    try {
      if (typeof localStorage !== 'undefined') {
        if (current.ref) localStorage.setItem(`nhatty_active_additional_${current.ref}`, receiptPreview);
        if (current.id) localStorage.setItem(`nhatty_active_additional_${current.id}`, receiptPreview);
      }
    } catch (e) {}
  }

  const updatedAppointment = {
    ...current,
    additionalReceiptPreview: receiptPreview,
    additionalReceiptFileName: fileName,
    additionalSubmittedAmount: additionalAmount,
    additionalPaymentStatus: 'Pending Verification',
    paymentStatus: 'Additional Payment Pending Verification',
    updatedAt: new Date().toISOString()
  };

  saveActiveBooking(updatedAppointment);

  // Update in bookedSlots
  for (const [k, v] of bookedSlots.entries()) {
    if (v.id === current.id || v.ref === current.ref || v.bookingReference === current.ref) {
      bookedSlots.set(k, {
        ...v,
        ...updatedAppointment
      });
    }
  }
  saveBookedSlotsToStorage();

  return { success: true, appointment: updatedAppointment };
}

// ── Verify Original Payment (Staff Dashboard) ─────────────────────────
export function verifyOriginalPayment(refOrId) {
  loadBookedSlotsFromStorage();
  let matched = false;
  let lastUpdated = null;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();
    const bKey = String(key).trim().toLowerCase();

    if (bId === searchStr || bRef === searchStr || bKey === searchStr || slotKey === searchStr) {
      const fullPrice = Number(b.price) || Number(b.currentPrice) || 0;
      const originalPrice = b.originalPrice !== undefined ? Number(b.originalPrice) : fullPrice;
      const isAdditionalVerified = b.additionalPaymentStatus === 'Verified';
      const verifiedAdd = isAdditionalVerified ? (Number(b.verifiedAdditionalAmount) || (fullPrice - originalPrice)) : 0;
      const newPaidAmount = originalPrice + verifiedAdd;
      const remainingAmount = Math.max(0, fullPrice - newPaidAmount);

      const isFullyPaid = !b.isEdited || (fullPrice <= originalPrice) || isAdditionalVerified;

      const updated = {
        ...b,
        originalPaymentStatus: 'Verified',
        verifiedOriginalAmount: originalPrice,
        paidAmount: newPaidAmount,
        amountPaid: newPaidAmount,
        remainingAmount: b.isEdited ? remainingAmount : 0,
        paymentStatus: isFullyPaid ? 'Verified' : (b.additionalPaymentStatus === 'Pending Verification' ? 'Additional Payment Pending Verification' : 'Additional Payment Due'),
        verifiedAt: new Date().toISOString()
      };
      bookedSlots.set(key, updated);
      lastUpdated = updated;
      matched = true;
    }
  }

  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          const fullPrice = Number(active.price) || Number(active.currentPrice) || 0;
          const originalPrice = active.originalPrice !== undefined ? Number(active.originalPrice) : fullPrice;
          const isAdditionalVerified = active.additionalPaymentStatus === 'Verified';
          const verifiedAdd = isAdditionalVerified ? (Number(active.verifiedAdditionalAmount) || (fullPrice - originalPrice)) : 0;
          const newPaidAmount = originalPrice + verifiedAdd;
          const remainingAmount = Math.max(0, fullPrice - newPaidAmount);

          const isFullyPaid = !active.isEdited || (fullPrice <= originalPrice) || isAdditionalVerified;

          const updatedActive = {
            ...active,
            originalPaymentStatus: 'Verified',
            verifiedOriginalAmount: originalPrice,
            paidAmount: newPaidAmount,
            amountPaid: newPaidAmount,
            remainingAmount: active.isEdited ? remainingAmount : 0,
            paymentStatus: isFullyPaid ? 'Verified' : (active.additionalPaymentStatus === 'Pending Verification' ? 'Additional Payment Pending Verification' : 'Additional Payment Due'),
            verifiedAt: new Date().toISOString()
          };
          saveActiveBooking(updatedActive);
          lastUpdated = updatedActive;
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  return { success: matched, appointment: lastUpdated };
}

// ── Revert Original Payment to Pending (Staff Dashboard) ───────────────
export function revertOriginalPayment(refOrId) {
  loadBookedSlotsFromStorage();
  let matched = false;
  let lastUpdated = null;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();
    const bKey = String(key).trim().toLowerCase();

    if (bId === searchStr || bRef === searchStr || bKey === searchStr || slotKey === searchStr) {
      const isAdditionalVerified = b.additionalPaymentStatus === 'Verified';
      const verifiedAdd = isAdditionalVerified ? (Number(b.verifiedAdditionalAmount) || 0) : 0;
      const fullPrice = Number(b.price) || 0;
      const remainingAmount = b.isEdited ? Math.max(0, fullPrice - verifiedAdd) : 0;

      const updated = {
        ...b,
        originalPaymentStatus: 'Pending Verification',
        verifiedOriginalAmount: 0,
        paidAmount: verifiedAdd,
        amountPaid: verifiedAdd,
        remainingAmount,
        paymentStatus: 'Verification Pending'
      };
      bookedSlots.set(key, updated);
      lastUpdated = updated;
      matched = true;
    }
  }

  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          const isAdditionalVerified = active.additionalPaymentStatus === 'Verified';
          const verifiedAdd = isAdditionalVerified ? (Number(active.verifiedAdditionalAmount) || 0) : 0;
          const fullPrice = Number(active.price) || 0;
          const remainingAmount = active.isEdited ? Math.max(0, fullPrice - verifiedAdd) : 0;

          const updatedActive = {
            ...active,
            originalPaymentStatus: 'Pending Verification',
            verifiedOriginalAmount: 0,
            paidAmount: verifiedAdd,
            amountPaid: verifiedAdd,
            remainingAmount,
            paymentStatus: 'Verification Pending'
          };
          saveActiveBooking(updatedActive);
          lastUpdated = updatedActive;
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  return { success: matched, appointment: lastUpdated };
}

// ── Verify Additional Payment (Staff Dashboard) ───────────────────────
export function verifyAdditionalPayment(refOrId) {
  loadBookedSlotsFromStorage();
  let matched = false;
  let lastUpdatedVerify = null;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();
    const bKey = String(key).trim().toLowerCase();

    if (bId === searchStr || bRef === searchStr || bKey === searchStr || slotKey === searchStr) {
      const fullPrice = Number(b.price) || Number(b.currentPrice) || 0;
      const originalPrice = b.originalPrice !== undefined ? Number(b.originalPrice) : fullPrice;
      const addSubmitted = Number(b.additionalSubmittedAmount) || Number(b.adjustmentAmount) || (fullPrice - originalPrice);
      const isOriginalVerified = b.originalPaymentStatus === 'Verified' || b.paymentStatus === 'Verified' || Number(b.verifiedOriginalAmount) > 0;
      const verifiedOrig = isOriginalVerified ? originalPrice : 0;
      const newPaidAmount = verifiedOrig + addSubmitted;
      const remainingAmount = Math.max(0, fullPrice - newPaidAmount);

      const updated = {
        ...b,
        verifiedAdditionalAmount: addSubmitted,
        additionalPaymentStatus: 'Verified',
        paidAmount: newPaidAmount,
        amountPaid: newPaidAmount,
        remainingAmount: b.isEdited ? remainingAmount : 0,
        paymentStatus: isOriginalVerified ? 'Verified' : 'Verification Pending',
        verifiedAt: new Date().toISOString()
      };
      bookedSlots.set(key, updated);
      lastUpdatedVerify = updated;
      matched = true;
    }
  }

  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          const fullPrice = Number(active.price) || Number(active.currentPrice) || 0;
          const originalPrice = active.originalPrice !== undefined ? Number(active.originalPrice) : fullPrice;
          const addSubmitted = Number(active.additionalSubmittedAmount) || Number(active.adjustmentAmount) || (fullPrice - originalPrice);
          const isOriginalVerified = active.originalPaymentStatus === 'Verified' || active.paymentStatus === 'Verified' || Number(active.verifiedOriginalAmount) > 0;
          const verifiedOrig = isOriginalVerified ? originalPrice : 0;
          const newPaidAmount = verifiedOrig + addSubmitted;
          const remainingAmount = Math.max(0, fullPrice - newPaidAmount);

          const updatedActive = {
            ...active,
            verifiedAdditionalAmount: addSubmitted,
            additionalPaymentStatus: 'Verified',
            paidAmount: newPaidAmount,
            amountPaid: newPaidAmount,
            remainingAmount: active.isEdited ? remainingAmount : 0,
            paymentStatus: isOriginalVerified ? 'Verified' : 'Verification Pending',
            verifiedAt: new Date().toISOString()
          };
          saveActiveBooking(updatedActive);
          lastUpdatedVerify = updatedActive;
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  return { success: matched, appointment: lastUpdatedVerify };
}

// ── Revert Additional Payment to Pending (Staff Dashboard) ─────────────
export function revertAdditionalPayment(refOrId) {
  loadBookedSlotsFromStorage();
  let matched = false;
  let lastUpdated = null;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();
    const bKey = String(key).trim().toLowerCase();

    if (bId === searchStr || bRef === searchStr || bKey === searchStr || slotKey === searchStr) {
      const isOrigVerified = b.originalPaymentStatus === 'Verified' || (Number(b.verifiedOriginalAmount) > 0);
      const fullPrice = Number(b.price) || 0;
      const originalPrice = b.originalPrice !== undefined ? Number(b.originalPrice) : fullPrice;
      const verifiedOrig = isOrigVerified ? originalPrice : 0;
      const addDiff = Math.max(0, fullPrice - originalPrice);

      const updated = {
        ...b,
        additionalPaymentStatus: b.additionalSubmittedAmount > 0 ? 'Pending Verification' : 'None',
        verifiedAdditionalAmount: 0,
        paidAmount: verifiedOrig,
        amountPaid: verifiedOrig,
        remainingAmount: addDiff,
        paymentStatus: isOrigVerified ? (b.additionalSubmittedAmount > 0 ? 'Additional Payment Pending Verification' : 'Additional Payment Due') : 'Verification Pending',
      };
      bookedSlots.set(key, updated);
      lastUpdated = updated;
      matched = true;
    }
  }

  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          const isOrigVerified = active.originalPaymentStatus === 'Verified' || (Number(active.verifiedOriginalAmount) > 0);
          const fullPrice = Number(active.price) || 0;
          const originalPrice = active.originalPrice !== undefined ? Number(active.originalPrice) : fullPrice;
          const verifiedOrig = isOrigVerified ? originalPrice : 0;
          const addDiff = Math.max(0, fullPrice - originalPrice);

          const updatedActive = {
            ...active,
            additionalPaymentStatus: active.additionalSubmittedAmount > 0 ? 'Pending Verification' : 'None',
            verifiedAdditionalAmount: 0,
            paidAmount: verifiedOrig,
            amountPaid: verifiedOrig,
            remainingAmount: addDiff,
            paymentStatus: isOrigVerified ? (active.additionalSubmittedAmount > 0 ? 'Additional Payment Pending Verification' : 'Additional Payment Due') : 'Verification Pending',
          };
          saveActiveBooking(updatedActive);
          lastUpdated = updatedActive;
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  return { success: matched, appointment: lastUpdated };
}

// ── Verify Both Receipts (Staff Dashboard) ────────────────────────────
export function verifyAllPayments(refOrId) {
  loadBookedSlotsFromStorage();
  let matched = false;
  let lastUpdated = null;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();
    const bKey = String(key).trim().toLowerCase();

    if (bId === searchStr || bRef === searchStr || bKey === searchStr || slotKey === searchStr) {
      const fullPrice = Number(b.price) || Number(b.currentPrice) || 0;
      const originalPrice = b.originalPrice !== undefined ? Number(b.originalPrice) : fullPrice;
      const addDiff = Math.max(0, fullPrice - originalPrice);

      const updated = {
        ...b,
        originalPaymentStatus: 'Verified',
        additionalPaymentStatus: (b.isEdited && addDiff > 0) ? 'Verified' : (b.additionalPaymentStatus || 'None'),
        verifiedOriginalAmount: originalPrice,
        verifiedAdditionalAmount: addDiff,
        paidAmount: fullPrice,
        amountPaid: fullPrice,
        remainingAmount: 0,
        paymentStatus: 'Verified',
        verifiedAt: new Date().toISOString()
      };
      bookedSlots.set(key, updated);
      lastUpdated = updated;
      matched = true;
    }
  }

  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          const fullPrice = Number(active.price) || Number(active.currentPrice) || 0;
          const originalPrice = active.originalPrice !== undefined ? Number(active.originalPrice) : fullPrice;
          const addDiff = Math.max(0, fullPrice - originalPrice);

          const updatedActive = {
            ...active,
            originalPaymentStatus: 'Verified',
            additionalPaymentStatus: (active.isEdited && addDiff > 0) ? 'Verified' : (active.additionalPaymentStatus || 'None'),
            verifiedOriginalAmount: originalPrice,
            verifiedAdditionalAmount: addDiff,
            paidAmount: fullPrice,
            amountPaid: fullPrice,
            remainingAmount: 0,
            paymentStatus: 'Verified',
            verifiedAt: new Date().toISOString()
          };
          saveActiveBooking(updatedActive);
          lastUpdated = updatedActive;
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  return { success: matched, appointment: lastUpdated };
}

// ── Update Refund Status (Staff Dashboard) ────────────────────────────
export function updateRefundStatus(refOrId, newRefundStatus) {
  loadBookedSlotsFromStorage();
  let matched = false;
  let lastUpdatedRefund = null;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();

    if (bId === searchStr || bRef === searchStr || slotKey === searchStr) {
      const isCompleted = newRefundStatus === 'Refund Completed' || newRefundStatus === 'Completed';
      const updated = {
        ...b,
        refundStatus: isCompleted ? 'Refund Completed' : newRefundStatus,
        status: (b.status === 'Customer Cancelled' || b.status === 'Cancelled' || isCompleted)
          ? (isCompleted ? 'Cancelled — Refund Completed' : b.status)
          : b.status,
        bookingStatus: (b.bookingStatus === 'Customer Cancelled' || b.bookingStatus === 'Cancelled' || isCompleted)
          ? (isCompleted ? 'Cancelled — Refund Completed' : b.bookingStatus)
          : b.bookingStatus,
        refundCompletedAt: isCompleted ? new Date().toISOString() : b.refundCompletedAt,
        updatedAt: new Date().toISOString()
      };
      bookedSlots.set(key, updated);
      lastUpdatedRefund = updated;
      matched = true;
    }
  }

  // Also update active booking if matched
  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          const isCompleted = newRefundStatus === 'Refund Completed' || newRefundStatus === 'Completed';
          const updatedActive = {
            ...active,
            refundStatus: isCompleted ? 'Refund Completed' : newRefundStatus,
            status: (active.status === 'Customer Cancelled' || active.status === 'Cancelled' || isCompleted)
              ? (isCompleted ? 'Cancelled — Refund Completed' : active.status)
              : active.status,
            bookingStatus: (active.bookingStatus === 'Customer Cancelled' || active.bookingStatus === 'Cancelled' || isCompleted)
              ? (isCompleted ? 'Cancelled — Refund Completed' : active.bookingStatus)
              : active.bookingStatus,
            refundCompletedAt: isCompleted ? new Date().toISOString() : active.refundCompletedAt,
            updatedAt: new Date().toISOString()
          };
          saveActiveBooking(updatedActive);
          lastUpdatedRefund = updatedActive;
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  return { success: matched, appointment: lastUpdatedRefund };
}

// ── Toggle / Update Shop Refund (Cash Change) Handover Status (Staff Dashboard) ──
export function toggleShopRefundStatus(refOrId, handedOver = null, staffName = 'Staff') {
  loadBookedSlotsFromStorage();
  let matched = false;
  let lastUpdated = null;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();

    if (bId === searchStr || bRef === searchStr || slotKey === searchStr) {
      const isCurrentlyHandedOver = Boolean(b.shopRefundHandedOver);
      const nextHandedOver = handedOver !== null ? Boolean(handedOver) : !isCurrentlyHandedOver;

      const updated = {
        ...b,
        shopRefundHandedOver: nextHandedOver,
        shopRefundHandedOverAt: nextHandedOver ? new Date().toISOString() : null,
        shopRefundHandedOverBy: nextHandedOver ? staffName : null,
        updatedAt: new Date().toISOString()
      };
      bookedSlots.set(key, updated);
      lastUpdated = updated;
      matched = true;
    }
  }

  // Also update active booking if matched
  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          const isCurrentlyHandedOver = Boolean(active.shopRefundHandedOver);
          const nextHandedOver = handedOver !== null ? Boolean(handedOver) : !isCurrentlyHandedOver;

          const updatedActive = {
            ...active,
            shopRefundHandedOver: nextHandedOver,
            shopRefundHandedOverAt: nextHandedOver ? new Date().toISOString() : null,
            shopRefundHandedOverBy: nextHandedOver ? staffName : null,
            updatedAt: new Date().toISOString()
          };
          saveActiveBooking(updatedActive);
          lastUpdated = updatedActive;
          matched = true;
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  notifyBookingStoreChange();
  return { success: matched, appointment: lastUpdated };
}

// ── Reject Payment Receipt with Reason (Staff Dashboard) ─────────────
export function rejectPaymentReceipt(refOrId, options = {}) {
  const reason = typeof options === 'string' ? options : (options.reason || 'Payment receipt verification failed');
  const target = (typeof options === 'object' && options.target) ? options.target : 'all'; // 'original' | 'additional' | 'all'
  const staffName = (typeof options === 'object' && options.staffName) ? options.staffName : 'Staff Admin';
  
  loadBookedSlotsFromStorage();
  let matched = false;
  let lastUpdated = null;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();
    const bKey = String(key).trim().toLowerCase();

    if (bId === searchStr || bRef === searchStr || bKey === searchStr || slotKey === searchStr) {
      let newPaymentStatus = 'Receipt Rejected';
      let origStatus = b.originalPaymentStatus || 'Rejected';
      let addStatus = b.additionalPaymentStatus;

      if (target === 'additional') {
        addStatus = 'Rejected';
        newPaymentStatus = 'Additional Receipt Rejected';
      } else if (target === 'original') {
        origStatus = 'Rejected';
        newPaymentStatus = 'Receipt Rejected';
      } else {
        origStatus = 'Rejected';
        if (b.additionalPaymentStatus && b.additionalPaymentStatus !== 'None') {
          addStatus = 'Rejected';
        }
        newPaymentStatus = 'Receipt Rejected';
      }

      const updated = {
        ...b,
        paymentStatus: newPaymentStatus,
        originalPaymentStatus: origStatus,
        additionalPaymentStatus: addStatus,
        rejectionReason: reason,
        rejectionTarget: target,
        rejectedAt: new Date().toISOString(),
        rejectedBy: staffName,
        paidAmount: 0,
        amountPaid: 0,
        verifiedOriginalAmount: 0,
        verifiedAdditionalAmount: 0,
        updatedAt: new Date().toISOString()
      };

      bookedSlots.set(key, updated);
      lastUpdated = updated;
      matched = true;
    }
  }

  // Also update active booking in localStorage
  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          let newPaymentStatus = 'Receipt Rejected';
          let origStatus = active.originalPaymentStatus || 'Rejected';
          let addStatus = active.additionalPaymentStatus;

          if (target === 'additional') {
            addStatus = 'Rejected';
            newPaymentStatus = 'Additional Receipt Rejected';
          } else if (target === 'original') {
            origStatus = 'Rejected';
            newPaymentStatus = 'Receipt Rejected';
          } else {
            origStatus = 'Rejected';
            if (active.additionalPaymentStatus && active.additionalPaymentStatus !== 'None') {
              addStatus = 'Rejected';
            }
            newPaymentStatus = 'Receipt Rejected';
          }

          const updatedActive = {
            ...active,
            paymentStatus: newPaymentStatus,
            originalPaymentStatus: origStatus,
            additionalPaymentStatus: addStatus,
            rejectionReason: reason,
            rejectionTarget: target,
            rejectedAt: new Date().toISOString(),
            rejectedBy: staffName,
            paidAmount: 0,
            amountPaid: 0,
            verifiedOriginalAmount: 0,
            verifiedAdditionalAmount: 0,
            updatedAt: new Date().toISOString()
          };
          saveActiveBooking(updatedActive);
          lastUpdated = updatedActive;
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  notifyBookingStoreChange();
  return { success: matched, appointment: lastUpdated };
}

// ── Resubmit / Re-upload Payment Receipt (Customer View) ──────────────
export function resubmitPaymentReceipt(refOrId, { receiptPreview, receiptFileName, target = 'original' }) {
  loadBookedSlotsFromStorage();
  let matched = false;
  let lastUpdated = null;
  const searchStr = String(refOrId || '').trim().toLowerCase();

  // Cache new receipt image
  if (refOrId && receiptPreview) {
    if (target === 'additional') {
      setReceiptImage(`${refOrId}_additional`, receiptPreview);
    } else {
      setReceiptImage(refOrId, receiptPreview);
    }
  }

  for (const [key, b] of bookedSlots.entries()) {
    const slotKey = `${b.barberId}:${b.dateStr}:${b.timeId}`.toLowerCase();
    const bRef = String(b.ref || b.bookingReference || '').trim().toLowerCase();
    const bId = String(b.id || '').trim().toLowerCase();
    const bKey = String(key).trim().toLowerCase();

    if (bId === searchStr || bRef === searchStr || bKey === searchStr || slotKey === searchStr) {
      let updatedFields = {};
      if (target === 'additional') {
        updatedFields = {
          additionalReceiptPreview: receiptPreview,
          additionalReceiptFileName: receiptFileName || 'resubmitted_additional_receipt.png',
          additionalPaymentStatus: 'Pending Verification',
          paymentStatus: b.originalPaymentStatus === 'Verified' ? 'Additional Payment Pending Verification' : 'Verification Pending',
        };
      } else {
        updatedFields = {
          receiptPreview: receiptPreview,
          originalReceiptPreview: receiptPreview,
          receiptFileName: receiptFileName || 'resubmitted_receipt.png',
          originalPaymentStatus: 'Pending Verification',
          paymentStatus: 'Verification Pending',
        };
      }

      const updated = {
        ...b,
        ...updatedFields,
        previousRejectionReason: b.rejectionReason,
        rejectionReason: null,
        rejectionTarget: null,
        rejectedAt: null,
        rejectedBy: null,
        reuploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      bookedSlots.set(key, updated);
      lastUpdated = updated;
      matched = true;
    }
  }

  // Also update active booking in localStorage
  try {
    const raw = localStorage.getItem(ACTIVE_BOOKING_KEY);
    if (raw) {
      const active = JSON.parse(raw);
      if (active) {
        const activeRef = String(active.ref || active.bookingReference || '').trim().toLowerCase();
        const activeId = String(active.id || '').trim().toLowerCase();
        const activeSlotKey = `${active.barberId}:${active.dateStr}:${active.timeId}`.toLowerCase();

        if (activeRef === searchStr || activeId === searchStr || activeSlotKey === searchStr) {
          let updatedFields = {};
          if (target === 'additional') {
            updatedFields = {
              additionalReceiptPreview: receiptPreview,
              additionalReceiptFileName: receiptFileName || 'resubmitted_additional_receipt.png',
              additionalPaymentStatus: 'Pending Verification',
              paymentStatus: active.originalPaymentStatus === 'Verified' ? 'Additional Payment Pending Verification' : 'Verification Pending',
            };
          } else {
            updatedFields = {
              receiptPreview: receiptPreview,
              originalReceiptPreview: receiptPreview,
              receiptFileName: receiptFileName || 'resubmitted_receipt.png',
              originalPaymentStatus: 'Pending Verification',
              paymentStatus: 'Verification Pending',
            };
          }

          const updatedActive = {
            ...active,
            ...updatedFields,
            previousRejectionReason: active.rejectionReason,
            rejectionReason: null,
            rejectionTarget: null,
            rejectedAt: null,
            rejectedBy: null,
            reuploadedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          saveActiveBooking(updatedActive);
          lastUpdated = updatedActive;
        }
      }
    }
  } catch (e) {}

  saveBookedSlotsToStorage();
  notifyBookingStoreChange();
  return { success: matched, appointment: lastUpdated };
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
            const cachedImg = getReceiptImage(b.ref || b.id || b.bookingReference);
            const cachedAddImg = getReceiptImage(`${b.ref || b.id || b.bookingReference}_additional`);
            return normalizeAppointment({
              ...b,
              receiptPreview: cachedImg || b.receiptPreview || null,
              originalReceiptPreview: cachedImg || b.originalReceiptPreview || null,
              additionalReceiptPreview: cachedAddImg || b.additionalReceiptPreview || null
            });
          }
        }
        const cachedImg = getReceiptImage(parsed.ref || parsed.id);
        const cachedAddImg = getReceiptImage(`${parsed.ref || parsed.id}_additional`);
        return normalizeAppointment({
          ...parsed,
          receiptPreview: cachedImg || parsed.receiptPreview || null,
          originalReceiptPreview: cachedImg || parsed.originalReceiptPreview || null,
          additionalReceiptPreview: cachedAddImg || parsed.additionalReceiptPreview || null
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
      const cachedImg = getReceiptImage(b.ref || b.id || b.bookingReference);
      const cachedAddImg = getReceiptImage(`${b.ref || b.id || b.bookingReference}_additional`);
      return normalizeAppointment({
        ...b,
        receiptPreview: cachedImg || b.receiptPreview || null,
        originalReceiptPreview: cachedImg || b.originalReceiptPreview || null,
        additionalReceiptPreview: cachedAddImg || b.additionalReceiptPreview || null
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

  const orig = booking.originalReceiptPreview || booking.receiptPreview;
  if (orig) {
    if (booking.ref) setReceiptImage(booking.ref, orig);
    if (booking.id) setReceiptImage(booking.id, orig);
    if (booking.bookingReference) setReceiptImage(booking.bookingReference, orig);
  }
  if (booking.additionalReceiptPreview) {
    if (booking.ref) setReceiptImage(`${booking.ref}_additional`, booking.additionalReceiptPreview);
    if (booking.id) setReceiptImage(`${booking.id}_additional`, booking.additionalReceiptPreview);
    if (booking.bookingReference) setReceiptImage(`${booking.bookingReference}_additional`, booking.additionalReceiptPreview);
  }

  try {
    const cleanBooking = {
      ...booking,
      receiptPreview: null, // keep localStorage entry ultra-light (< 1KB)
      originalReceiptPreview: null,
      additionalReceiptPreview: null
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
  const currentPrice = Number(appt.price) || Number(appt.amountPaid) || 0;
  const originalPrice = appt.originalPrice !== undefined ? Number(appt.originalPrice) : currentPrice;
  const isEdited = Boolean(
    appt.isEdited === true || 
    (appt.originalServiceId && appt.serviceId && appt.originalServiceId !== appt.serviceId) ||
    (appt.originalPrice !== undefined && Number(appt.originalPrice) !== currentPrice)
  );

  const isVerified = appt.paymentStatus === 'Verified';
  const paidAmount = appt.paidAmount !== undefined 
    ? Number(appt.paidAmount) 
    : (isVerified ? currentPrice : 0);

  // CRITICAL: Brand new bookings NEVER have remainingAmount > 0 (customer submitted full payment at checkout)
  // Only genuine upgrades with additional_payment have positive remainingAmount
  let remainingAmount = 0;
  if (isEdited && appt.adjustmentType === 'additional_payment') {
    if (appt.remainingAmount !== undefined) {
      remainingAmount = Number(appt.remainingAmount);
    } else {
      remainingAmount = Math.max(0, currentPrice - paidAmount);
    }
  }

  return {
    ...appt,
    isEdited,
    dateDisplay: dynRelativeDate || appt.dateStr,
    relativeDate: dynRelativeDate || appt.dateStr,
    originalServiceId: appt.originalServiceId || appt.serviceId || 'srv-1',
    originalServiceName: appt.originalServiceName || appt.serviceName || 'Service',
    originalPrice,
    currentServiceId: appt.currentServiceId || appt.serviceId,
    currentServiceName: appt.currentServiceName || appt.serviceName,
    currentPrice: currentPrice,
    price: currentPrice,
    paidAmount,
    amountPaid: paidAmount,
    remainingAmount,
    adjustmentAmount: appt.adjustmentAmount !== undefined ? Number(appt.adjustmentAmount) : 0,
    adjustmentType: isEdited ? (appt.adjustmentType || 'none') : 'none',
    originalPaymentStatus: appt.originalPaymentStatus || (isVerified ? 'Verified' : 'Pending Verification'),
    additionalPaymentStatus: isEdited ? (appt.additionalPaymentStatus || 'None') : 'None',
    additionalSubmittedAmount: Number(appt.additionalSubmittedAmount) || 0,
    refundMethod: appt.refundMethod || null,
    refundAccount: appt.refundAccount || null,
    refundAmount: Number(appt.refundAmount) || 0,
    refundFee: Number(appt.refundFee) || 0,
    refundStatus: appt.refundStatus || 'None',
    shopRefundHandedOver: Boolean(appt.shopRefundHandedOver),
    shopRefundHandedOverAt: appt.shopRefundHandedOverAt || null,
    shopRefundHandedOverBy: appt.shopRefundHandedOverBy || null
  };
}

export function getAllAppointments() {
  loadBookedSlotsFromStorage();
  const mapList = Array.from(bookedSlots.values()).map(b => {
    const cachedImg = getReceiptImage(b.ref || b.id || b.bookingReference);
    const cachedAddImg = 
      getReceiptImage(`${b.ref}_additional`) || 
      getReceiptImage(`${b.id}_additional`) || 
      getReceiptImage(`${b.bookingReference}_additional`) ||
      (typeof localStorage !== 'undefined' ? (localStorage.getItem(`nhatty_active_additional_${b.ref}`) || localStorage.getItem(`nhatty_active_additional_${b.id}`)) : null);

    return {
      ...b,
      receiptPreview: cachedImg || b.receiptPreview || null,
      originalReceiptPreview: cachedImg || b.originalReceiptPreview || null,
      additionalReceiptPreview: cachedAddImg || b.additionalReceiptPreview || null
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
  if (newPaymentStatus === 'Verified') {
    return verifyAllPayments(refOrId);
  } else {
    return revertOriginalPayment(refOrId);
  }
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

