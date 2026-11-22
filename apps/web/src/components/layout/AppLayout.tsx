import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { UserRole } from '@lrms/shared';
import { AppSidebar } from './AppSidebar.js';
import { AppHeader } from './AppHeader.js';
import { AppFooter } from './AppFooter.js';
import { BottomNav } from './BottomNav.js';
import { useNetworkStatus } from '../../hooks/useNetworkStatus.js';
import { useRolePreview } from '../../hooks/useRolePreview.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useNotifications } from '../../features/notifications/NotificationContext.js';
import { LiveState } from '../status/NetworkStatusIndicator.js';
import { WifiOff } from 'lucide-react';

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
  const { connectionStatus } = useNotifications();

  const offline =
    !networkStatus.browserOnline || (!networkStatus.loading && !networkStatus.apiConnected);
  const liveState: LiveState = offline
    ? 'OFFLINE'
    : connectionStatus === 'CONNECTED'
      ? 'LIVE'
      : 'RECONNECTING';

  const showBottomNav = currentRole !== UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row pl-safe pr-safe">
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
          liveState={liveState}
          networkStatus={networkStatus}
        />

        {/* SAF-3: while offline every input on the screen is disabled. */}
        {offline && (
          <div
            role="alert"
            className="bg-red-700 text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 sticky top-16 z-20"
          >
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            Offline: clinical entry is disabled until the connection returns. Do not rely on this
            screen; check the ward board when back online.
          </div>
        )}

        {/* Dynamic Page Content */}
        <main className={`min-w-0 flex-1 ${showBottomNav ? 'pb-20 lg:pb-0' : ''}`}>
          <fieldset disabled={offline} className="contents">
            <Outlet />
          </fieldset>
        </main>

        <AppFooter />
        {showBottomNav && <BottomNav onMore={() => setMobileOpen(true)} />}
      </div>
    </div>
  );
};
