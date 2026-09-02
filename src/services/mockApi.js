/**
 * Mock API Service Layer for Nhatty Barber House MVP
 * 
 * ARCHITECTURE NOTE:
 * All functions return Promises to simulate asynchronous network API calls.
 * When connecting to a future Node/Express/PostgreSQL backend, replace the implementation
 * of these functions with fetch / axios calls without modifying the UI components.
 */

import { MOCK_SERVICES } from '../data/servicesData.js';
import { MOCK_BARBERS } from '../data/barbersData.js';
import { MOCK_SHOP_INFO } from '../data/shopData.js';
import { MOCK_GALLERY_IMAGES } from '../data/galleryData.js';
import { MOCK_SOCIAL_POSTS } from '../data/socialProofData.js';

// Simulated network latency helper (optional, default 100ms for snappy feel)
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch all available services
 * @returns {Promise<Array>} Array of service objects
 */
export async function getServices() {
  await delay(120);
  return [...MOCK_SERVICES];
}

/**
 * Fetch a single service by ID
 * @param {string} id - Service ID
 * @returns {Promise<Object|null>}
 */
export async function getServiceById(id) {
  await delay(80);
  const service = MOCK_SERVICES.find(s => s.id === id);
  return service ? { ...service } : null;
}

/**
 * Fetch all barbers
 * @returns {Promise<Array>} Array of barber objects
 */
export async function getBarbers() {
  await delay(120);
  return [...MOCK_BARBERS];
}

/**
 * Fetch a single barber by ID
 * @param {string} id - Barber ID
 * @returns {Promise<Object|null>}
 */
export async function getBarberById(id) {
  await delay(80);
  const barber = MOCK_BARBERS.find(b => b.id === id);
  return barber ? { ...barber } : null;
}

/**
 * Fetch shop metadata, location, hours, pillars
 * @returns {Promise<Object>} Shop info object
 */
export async function getShopInfo() {
  await delay(100);
  return { ...MOCK_SHOP_INFO };
}

/**
 * Fetch shop location and map metadata (Lucy Hotel, Dessie, Ethiopia)
 * @returns {Promise<Object>} Location metadata object
 */
export async function getLocationInfo() {
  await delay(80);
  return { ...MOCK_SHOP_INFO.location };
}

/**
 * Fetch shop interior/exterior gallery images
 * @returns {Promise<Array>} Array of gallery image items
 */
export async function getGalleryImages() {
  await delay(100);
  return [...MOCK_GALLERY_IMAGES];
}

/**
 * Fetch social proof / TikTok style video transformation posts
 * @returns {Promise<Array>} Array of post items
 */
export async function getSocialPosts() {
  await delay(120);
  return [...MOCK_SOCIAL_POSTS];
}

// ── Unified Booking API (Single Source of Truth) ──────────────────────
import { 
  APPOINTMENT_EDIT_WINDOW_MINUTES,
  bookSlot as storeBookSlot, 
  cancelBooking as storeCancelBooking, 
  updateAppointment as storeUpdateAppointment,
  cancelAppointment as storeCancelAppointment,
  isSlotBooked as storeIsSlotBooked, 
  getBarberTimeSlots,
  getSlotStatus,
  getActiveBooking as storeGetActiveBooking,
  clearActiveBooking as storeClearActiveBooking,
  isAppointmentPast as storeIsAppointmentPast,
  isAppointmentActive as storeIsAppointmentActive,
  getAppointmentEndDateTime as storeGetAppointmentEndDateTime,
  getAppointmentLifecycle as storeGetAppointmentLifecycle,
  formatAppointmentRelativeDate as storeFormatAppointmentRelativeDate,
  getAllAppointments as storeGetAllAppointments,
  getAppointmentsByDate as storeGetAppointmentsByDate,
  updateStaffPaymentStatus as storeUpdateStaffPaymentStatus,
  updateStaffBookingStatus as storeUpdateStaffBookingStatus,
  subscribeToBookingStore,
  notifyBookingStoreChange,
  loadBookedSlotsFromStorage,
} from '../data/bookingStore.js';

export {
  storeIsAppointmentPast as isAppointmentPast,
  storeIsAppointmentActive as isAppointmentActive,
  storeGetAppointmentEndDateTime as getAppointmentEndDateTime,
  storeGetAppointmentLifecycle as getAppointmentLifecycle,
  storeFormatAppointmentRelativeDate as formatAppointmentRelativeDate,
  subscribeToBookingStore,
  notifyBookingStoreChange,
  loadBookedSlotsFromStorage,
};

/**
 * Create an appointment reservation with double-booking prevention
 */
export async function createBooking(barberId, dateStr, timeId, customerInfo) {
  await delay(200);
  return storeBookSlot(barberId, dateStr, timeId, customerInfo);
}

/**
 * Retrieve stored customer appointment (raw record preserved for historical tracking / Barber Dashboard)
 */
export async function getMyAppointment() {
  await delay(80);
  return storeGetActiveBooking();
}

/**
 * Retrieve a specific appointment by ID / reference
 */
export async function getAppointmentById(id) {
  await delay(80);
  const active = storeGetActiveBooking();
  if (active && (active.id === id || active.ref === id)) {
    return { ...active };
  }
  return null;
}

/**
 * Update an existing appointment within the 10-minute window
 */
export async function updateAppointment(appointmentId, updates) {
  await delay(250);
  return storeUpdateAppointment(appointmentId, updates);
}

/**
 * Cancel an appointment reservation and release the time slot
 */
export async function cancelAppointment(appointmentId) {
  await delay(180);
  return storeCancelAppointment(appointmentId);
}

/**
 * Cancel a booking by barber/date/time coordinates
 */
export async function cancelBooking(barberId, dateStr, timeId) {
  await delay(150);
  return storeCancelBooking(barberId, dateStr, timeId);
}

/**
 * Check if a slot is booked for a specific barber
 */
export async function checkSlotBooked(barberId, dateStr, timeId, excludeKey = null) {
  await delay(50);
  return storeIsSlotBooked(barberId, dateStr, timeId, excludeKey);
}

/**
 * Get available time slots for a barber on a specific date (supporting current appointment exclusion)
 */
export async function getAvailableTimeSlots(barberId, dateStr, dateObj, excludeKey = null) {
  await delay(80);
  const slots = getBarberTimeSlots(barberId);
  return slots.map(slot => ({
    ...slot,
    status: getSlotStatus(barberId, dateStr, slot, dateObj, excludeKey)
  }));
}

/**
 * Retrieve active customer booking for persistence
 */
export async function getActiveBooking() {
  await delay(50);
  return storeGetActiveBooking();
}

/**
 * Clear active booking session
 */
export async function clearActiveBooking() {
  await delay(50);
  return storeClearActiveBooking();
}

// ── Staff Dashboard Operations ─────────────────────────────────────────

/**
 * Staff: Get all appointments
 */
export async function getStaffAllAppointments() {
  await delay(100);
  return storeGetAllAppointments();
}

/**
 * Staff: Get appointments for specific date (defaults to today)
 */
export async function getStaffAppointmentsByDate(dateStr) {
  await delay(100);
  return storeGetAppointmentsByDate(dateStr);
}

/**
 * Staff: Update customer payment status (Verified, Issue / Unverified, Pending)
 */
export async function setStaffPaymentStatus(refOrId, newStatus) {
  const result = storeUpdateStaffPaymentStatus(refOrId, newStatus);
  await delay(30);
  return result;
}

/**
 * Staff: Update chair status (Confirmed, In-Chair, Completed, Cancelled, No-Show)
 */
export async function setStaffBookingStatus(refOrId, newStatus) {
  const result = storeUpdateStaffBookingStatus(refOrId, newStatus);
  await delay(30);
  return result;
}

export { APPOINTMENT_EDIT_WINDOW_MINUTES } from '../data/bookingStore.js';
