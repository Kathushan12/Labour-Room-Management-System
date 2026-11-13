import React from 'react';
import { UserRole } from '@lrms/shared';
import { useRolePreview } from '../../hooks/useRolePreview.js';
import { useAuth } from '../../hooks/useAuth.js';
import { AdminDashboard } from './AdminDashboard.js';
import { DoctorDashboard } from './DoctorDashboard.js';
import { NurseDashboard } from './NurseDashboard.js';

interface DashboardRouterProps {
  role?: UserRole;
}

export const DashboardRouter: React.FC<DashboardRouterProps> = ({ role }) => {
  const { currentRole } = useRolePreview();
  const auth = useAuth();
  const effectiveRole = role || (auth.isAuthenticated && auth.role ? auth.role : currentRole);

  switch (effectiveRole) {
    case UserRole.DOCTOR:
      return <DoctorDashboard />;
    case UserRole.NURSE_STAFF:
      return <NurseDashboard />;
    case UserRole.ADMIN:
    default:
      return <AdminDashboard />;
  }
};
