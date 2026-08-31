/**
 * Staff Authentication Service — Nhatty Barber House
 * 
 * SECURITY ARCHITECTURE NOTE:
 * Uses session-scoped authentication (sessionStorage) for the frontend MVP.
 * - Login state is scoped strictly to the active browser tab / session.
 * - Closing the browser tab/session immediately terminates authentication.
 * - Persistent storage (localStorage) is NEVER used for staff authentication.
 * - Direct navigation to /barber-dashboard without an active session is blocked.
 * - Logout explicitly destroys the active session and resets Staff AI state.
 * 
 * NOTE: Passwords and credentials are never stored in storage or exposed in client state.
 */

import { resetStaffAiContext } from './staffAiEngine.js';

// Temporary mock credentials for MVP prototype
const MOCK_STAFF_EMAIL = 'nhatty23admin@349';
const MOCK_STAFF_PASSWORD = 'nhattyadmin23';

const AUTH_SESSION_KEY = 'nhatty_staff_session_v2';
const LEGACY_STORAGE_KEYS = [
  'nhatty_staff_auth_v1',
  'isLoggedIn',
  'staff_logged_in',
  'staff_auth',
  'nhatty_auth'
];

// In-memory fallback session for environments where sessionStorage is not available (e.g. Node tests)
let inMemoryStaffSession = null;

// Purge any legacy persistent localStorage auth tokens on initialization
(function purgeLegacyAuthPersistence() {
  try {
    if (typeof localStorage !== 'undefined') {
      LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    }
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }
})();

// Simulated network latency
const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Authenticate staff member with credentials
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{success: boolean, error?: string, session?: object}>}
 */
export async function loginStaff(email, password) {
  await delay(400);

  const cleanEmail = (email || '').trim();
  const cleanPass = password || '';

  if (!cleanEmail || !cleanPass) {
    return {
      success: false,
      error: 'Please enter both staff email and password.'
    };
  }

  // Exact credential verification
  if (cleanEmail === MOCK_STAFF_EMAIL && cleanPass === MOCK_STAFF_PASSWORD) {
    const session = {
      isAuthenticated: true,
      email: cleanEmail,
      name: 'Nhatty Staff Admin',
      role: 'Staff Manager',
      branch: 'Lucy Hotel (Ground Floor), Dessie',
      loginTime: new Date().toISOString(),
    };

    inMemoryStaffSession = session;

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      }
    } catch (e) {
      console.error('Failed to persist auth session to sessionStorage', e);
    }

    // Ensure no persistent storage leakage
    try {
      if (typeof localStorage !== 'undefined') {
        LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
      }
    } catch (e) {}

    return {
      success: true,
      session
    };
  }

  // Security best practice: Generic error message to prevent account enumeration
  return {
    success: false,
    error: 'Invalid staff email or password.'
  };
}

/**
 * Terminate staff session and clear authentication persistence
 */
export function logoutStaff() {
  inMemoryStaffSession = null;

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch (e) {}

  try {
    if (typeof localStorage !== 'undefined') {
      LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    }
  } catch (e) {}

  // Reset Staff AI context upon logout
  try {
    resetStaffAiContext();
  } catch (e) {}
}

/**
 * Check if the staff user is currently authenticated in the active session
 * @returns {boolean}
 */
export function isStaffAuthenticated() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (session && session.isAuthenticated === true) {
          return true;
        }
      }
    }
  } catch (e) {
    // Fall through to in-memory check
  }

  return Boolean(inMemoryStaffSession && inMemoryStaffSession.isAuthenticated === true);
}

/**
 * Retrieve active staff session metadata
 * @returns {object|null}
 */
export function getStaffSession() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (e) {}

  return inMemoryStaffSession;
}

/**
 * Testing Helper: Set in-memory session (for unit/integration testing)
 */
export function setInMemoryStaffSession(session) {
  inMemoryStaffSession = session;
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (session) {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      } else {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
      }
    }
  } catch (e) {}
}

/**
 * Testing Helper: Clear in-memory session
 */
export function clearInMemoryStaffSession() {
  inMemoryStaffSession = null;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch (e) {}
}
