import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isStaffAuthenticated } from '../../services/authService';

/**
 * Route protection wrapper that ensures only authenticated staff can access the dashboard.
 * If unauthenticated, seamlessly redirects to /barber-login.
 */
export default function StaffProtectedRoute({ children }) {
  const location = useLocation();
  const isAuthenticated = isStaffAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/barber-login" state={{ from: location }} replace />;
  }

  return children;
}
