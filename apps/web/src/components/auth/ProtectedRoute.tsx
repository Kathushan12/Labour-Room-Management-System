import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { UserRole, Permission } from '@lrms/shared';
import { useAuth } from '../../hooks/useAuth.js';
import { Activity } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
  allowPendingPasswordChange?: boolean;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  requiredPermission,
  allowPendingPasswordChange = false,
  children,
}) => {
  const { isAuthenticated, isLoading, role, permissions, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md animate-pulse">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Verifying Clinical Session</h2>
            <p className="text-xs text-slate-500 mt-1">
              Connecting securely to Labour Room services...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce mandatory first-login password change across all ordinary routes
  if (mustChangePassword && !allowPendingPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
