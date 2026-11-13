import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { UserRole } from '@lrms/shared';
import { AppSidebar } from './AppSidebar.js';
import { AppHeader } from './AppHeader.js';
import { AppFooter } from './AppFooter.js';
import { useNetworkStatus } from '../../hooks/useNetworkStatus.js';
import { useRolePreview } from '../../hooks/useRolePreview.js';
import { useAuth } from '../../hooks/useAuth.js';

export interface AppLayoutProps {
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentRole: propRole,
  onRoleChange: propOnRoleChange,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const networkStatus = useNetworkStatus();
  const roleContext = useRolePreview();
  const auth = useAuth();

  const currentRole =
    propRole || (auth.isAuthenticated && auth.role ? auth.role : roleContext.currentRole);
  const onRoleChange = propOnRoleChange || roleContext.setCurrentRole;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row">
      {/* Sidebar */}
      <AppSidebar
        currentRole={currentRole}
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          currentRole={currentRole}
          onRoleChange={onRoleChange}
          onMobileToggle={() => setMobileOpen(!mobileOpen)}
          networkStatus={networkStatus}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        <AppFooter />
      </div>
    </div>
  );
};
