import React from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { Menu, UserCircle2, LogOut, KeyRound } from 'lucide-react';
import { UserRole } from '@lrms/shared';
import { LiveState, NetworkStatusIndicator } from '../status/NetworkStatusIndicator.js';
import { HelpButton } from './HelpButton.js';
import { ServiceStatusIndicator } from '../status/ServiceStatusIndicator.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { useAuth } from '../../hooks/useAuth.js';
import { NotificationBell } from '../../features/notifications/NotificationBell.js';

interface AppHeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onMobileToggle: () => void;
  liveState: LiveState;
  networkStatus: {
    browserOnline: boolean;
    apiConnected: boolean;
    dbReady: boolean;
    dbLatencyMs: number | null;
    loading: boolean;
    refresh: () => void;
  };
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentRole,
  onRoleChange,
  onMobileToggle,
  liveState,
  networkStatus,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const inRouter = useInRouterContext();

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Toggle & Ward Context */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMobileToggle}
          className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-800 hidden sm:inline">
              Colombo South Teaching Hospital (Kalubowila)
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-slate-50 text-slate-600 py-0 px-1.5 hidden md:inline-flex"
            >
              Ward 18: Labour Room
            </Badge>
          </div>
        </div>
      </div>

      {/* Right: Network, Health, Role Switcher & Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Real Network Status */}
        <NetworkStatusIndicator state={liveState} />

        {/* Real Backend & DB Status */}
        <div className="hidden sm:block">
          <ServiceStatusIndicator
            apiConnected={networkStatus.apiConnected}
            dbReady={networkStatus.dbReady}
            loading={networkStatus.loading}
            dbLatencyMs={networkStatus.dbLatencyMs}
            onRefresh={networkStatus.refresh}
          />
        </div>

        {/* Development-Only Role Preview Switcher (hidden when genuinely signed in) */}
        {import.meta.env.DEV && !isAuthenticated && (
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase px-1.5 hidden md:inline">
              Preview Role:
            </span>
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
              aria-label="Development Role Preview Switcher"
            >
              <option value={UserRole.NURSE_STAFF}>Nurse / Midwife</option>
              <option value={UserRole.DOCTOR}>Doctor (Obstetrician)</option>
              <option value={UserRole.ADMIN}>Administrator</option>
            </select>
          </div>
        )}

        {inRouter && <HelpButton />}

        {/* Real-Time Notification Bell & Dropdown */}
        <NotificationBell />

        {/* User Profile, Change Password & Sign Out */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
            <UserCircle2 className="w-5 h-5 text-slate-600" />
          </div>
          <div className="text-left">
            <p className="hidden sm:block text-xs font-semibold text-slate-900 leading-tight">
              {isAuthenticated && user
                ? user.fullName
                : currentRole === UserRole.ADMIN
                  ? 'System Admin'
                  : currentRole === UserRole.DOCTOR
                    ? 'Dr. Jayawardena'
                    : 'Staff Midwife Silva'}
            </p>
            <p className="text-[10px] text-slate-500 leading-tight">
              {isAuthenticated && user
                ? user.role
                : currentRole === UserRole.ADMIN
                  ? 'IT Administration'
                  : currentRole === UserRole.DOCTOR
                    ? 'On-Duty Obstetrician'
                    : 'Labour Ward 18'}
            </p>
          </div>

          {isAuthenticated && inRouter && (
            <Link
              to="/change-password"
              className="p-2 rounded-md text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors"
              title="Change Password"
              aria-label="Change Password"
            >
              <KeyRound className="w-4 h-4" />
            </Link>
          )}

          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              className="text-slate-500 hover:text-red-600"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
