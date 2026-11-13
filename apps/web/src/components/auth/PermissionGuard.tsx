import React from 'react';
import { Permission } from '@lrms/shared';
import { useAuth } from '../../hooks/useAuth.js';

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { permissions, isAuthenticated } = useAuth();

  if (!isAuthenticated || !permissions.includes(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
