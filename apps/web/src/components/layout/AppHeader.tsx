import React from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { Menu, UserCircle2, LogOut, KeyRound } from 'lucide-react';
import { UserRole } from '@lrms/shared';
import { LiveState, NetworkStatusIndicator } from '../status/NetworkStatusIndicator.js';
import { HelpButton } from './HelpButton.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { useAuth } from '../../hooks/useAuth.js';
import { NotificationBell } from '../../features/notifications/NotificationBell.js';
import { roleLabel, shortName } from '../../lib/labels.js';

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
    <header className="pt-safe min-h-16 border-b border-slate-200 bg-white px-2 sm:px-6 flex items-center justify-between gap-1 sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile Toggle & Ward Context */}
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        <button
          onClick={onMobileToggle}
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="sr-only sm:hidden">LRMS</span>
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
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-3">
        {/* Real Network Status */}
        <NetworkStatusIndicator state={liveState} />

        {/* Development-Only Role Preview Switcher (hidden when genuinely signed in) */}
        {import.meta.env.VITE_SHOW_DEV_TOOLS === 'true' && !isAuthenticated && (
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
        <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200">
          <div className="hidden sm:flex w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
            <UserCircle2 className="w-5 h-5 text-slate-600" />
          </div>
          <div className="max-w-[6.5rem] sm:max-w-none text-left">
            <p className="text-xs font-semibold text-slate-900 leading-tight truncate">
              {isAuthenticated && user ? (
                <>
                  <span className="sm:hidden">{shortName(user.fullName)}</span>
                  <span className="hidden sm:inline">{user.fullName}</span>
                </>
              ) : currentRole === UserRole.ADMIN ? (
                'System Admin'
              ) : currentRole === UserRole.DOCTOR ? (
                'Dr. Jayawardena'
              ) : (
                'Staff Midwife Silva'
              )}
            </p>
            <p className="text-[11px] text-slate-600 leading-tight truncate">
              {isAuthenticated && user
                ? roleLabel(user.role)
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
              className="hidden sm:flex p-2 rounded-md text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors"
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
