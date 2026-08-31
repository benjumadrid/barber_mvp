/**
 * Nhatty Barber House — Centralized Maintenance Configuration
 * 
 * ==============================================================================
 * SINGLE MAINTENANCE SWITCH
 * ==============================================================================
 * 
 * To turn Maintenance Mode ON:
 * 1. Set MAINTENANCE_MODE = true below (OR set VITE_MAINTENANCE_MODE=true in Vercel)
 * 
 * To turn Maintenance Mode OFF (Normal website operation):
 * 1. Set MAINTENANCE_MODE = false below (OR set VITE_MAINTENANCE_MODE=false in Vercel)
 * 
 * ==============================================================================
 * BEHAVIOR MATRIX:
 * ==============================================================================
 * - Customer Website (/, /booking, /services, /my-appointment, etc.):
 *   • When ON (true): Renders full-screen luxury Maintenance screen. Customer AI & booking disabled.
 *   • When OFF (false): Normal customer website, booking flow, and customer AI.
 * 
 * - Staff Portal (/barber-dashboard, /barber-login):
 *   • ALWAYS REMAINS AVAILABLE and protected by staff authentication session.
 *   • Staff can view appointments, verify payments, manage chair status, and use Staff AI.
 * ==============================================================================
 */

// Central Switch: Set to true to activate customer maintenance mode, false for normal operation
export const MAINTENANCE_MODE = false;

// Override variable for testing simulation
let testOverrideMaintenanceMode = null;

export function setTestOverrideMaintenanceMode(val) {
  testOverrideMaintenanceMode = val;
}

export function resetTestOverrideMaintenanceMode() {
  testOverrideMaintenanceMode = null;
}

/**
 * Evaluates whether Maintenance Mode is currently active.
 * Hierarchy:
 * 1. Test override (if set in test suites)
 * 2. Vite environment variable (VITE_MAINTENANCE_MODE from Vercel / .env)
 * 3. Static MAINTENANCE_MODE constant in this file
 * 
 * @returns {boolean}
 */
export function isMaintenanceModeActive() {
  // 1. Check test override
  if (testOverrideMaintenanceMode !== null) {
    return Boolean(testOverrideMaintenanceMode);
  }

  // 2. Check Vite environment variable
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const envVal = import.meta.env.VITE_MAINTENANCE_MODE;
      if (envVal !== undefined && envVal !== null && envVal !== '') {
        return String(envVal).trim().toLowerCase() === 'true' || envVal === '1' || envVal === 'yes';
      }
    }
  } catch (e) {
    // Ignore in non-Vite environments
  }

  // 3. Fallback to centralized configuration switch
  return Boolean(MAINTENANCE_MODE);
}
