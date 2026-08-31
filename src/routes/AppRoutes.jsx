import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HomePage from '../pages/HomePage';
import BookingPlaceholder from '../pages/BookingPlaceholder';
import MyAppointmentPage from '../pages/MyAppointmentPage';
import SocialProofPlaceholder from '../pages/SocialProofPlaceholder';
import BarberLoginPage from '../pages/BarberLoginPage';
import BarberDashboardPage from '../pages/BarberDashboardPage';
import StaffProtectedRoute from '../components/common/StaffProtectedRoute';
import CustomerMaintenanceGuard from '../components/common/CustomerMaintenanceGuard';

export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Staff Authentication & Management Portal (Dedicated Layout, EXEMPT from Customer Maintenance) ── */}
      <Route path="/barber-login" element={<BarberLoginPage />} />
      <Route
        path="/barber-dashboard"
        element={
          <StaffProtectedRoute>
            <BarberDashboardPage />
          </StaffProtectedRoute>
        }
      />
      {/* Legacy/Shortcut redirects */}
      <Route path="/staff-dashboard" element={<Navigate to="/barber-dashboard" replace />} />
      <Route path="/barber" element={<Navigate to="/barber-dashboard" replace />} />

      {/* ── Customer-Facing Website (Protected by Centralized Maintenance Guard) ── */}
      <Route
        path="/"
        element={
          <CustomerMaintenanceGuard>
            <MainLayout>
              <HomePage />
            </MainLayout>
          </CustomerMaintenanceGuard>
        }
      />
      <Route
        path="/booking"
        element={
          <CustomerMaintenanceGuard>
            <MainLayout>
              <BookingPlaceholder />
            </MainLayout>
          </CustomerMaintenanceGuard>
        }
      />
      <Route
        path="/services"
        element={
          <CustomerMaintenanceGuard>
            <MainLayout>
              <HomePage />
            </MainLayout>
          </CustomerMaintenanceGuard>
        }
      />
      <Route
        path="/gallery"
        element={
          <CustomerMaintenanceGuard>
            <MainLayout>
              <HomePage />
            </MainLayout>
          </CustomerMaintenanceGuard>
        }
      />
      <Route
        path="/my-appointment"
        element={
          <CustomerMaintenanceGuard>
            <MainLayout>
              <MyAppointmentPage />
            </MainLayout>
          </CustomerMaintenanceGuard>
        }
      />
      <Route
        path="/social"
        element={
          <CustomerMaintenanceGuard>
            <MainLayout>
              <SocialProofPlaceholder />
            </MainLayout>
          </CustomerMaintenanceGuard>
        }
      />
      <Route
        path="/social-proof"
        element={
          <CustomerMaintenanceGuard>
            <MainLayout>
              <SocialProofPlaceholder />
            </MainLayout>
          </CustomerMaintenanceGuard>
        }
      />

      {/* 404 Catch-All (Routes back to customer root, guarded by Maintenance Guard) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
