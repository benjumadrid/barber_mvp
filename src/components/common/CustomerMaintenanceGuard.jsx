import React from 'react';
import { isMaintenanceModeActive } from '../../config/maintenanceConfig';
import MaintenancePage from '../../pages/MaintenancePage';

/**
 * CustomerMaintenanceGuard
 * 
 * Centralized protection guard for all public/customer routes.
 * When isMaintenanceModeActive() is true:
 * - Completely intercepts customer routes (/, /booking, /services, /my-appointment, etc.)
 * - Renders the branded MaintenancePage
 * - Does NOT render customer pages, Customer AI modal, or booking workflows
 * 
 * When isMaintenanceModeActive() is false:
 * - Renders standard customer children components normally
 */
export default function CustomerMaintenanceGuard({ children }) {
  const inMaintenance = isMaintenanceModeActive();

  if (inMaintenance) {
    return <MaintenancePage />;
  }

  return children;
}
