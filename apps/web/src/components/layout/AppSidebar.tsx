import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { UserRole, Permission, ROLE_PERMISSIONS } from '@lrms/shared';
import { useAuth } from '../../hooks/useAuth.js';
import {
  HeartPulse,
  LayoutDashboard,
  UserPlus,
  BedDouble,
  Activity,
  BellRing,
  FileBarChart2,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Clock,
  Baby,
  FileSpreadsheet,
} from 'lucide-react';
import { Badge } from '../ui/badge.js';

interface AppSidebarProps {
  currentRole: UserRole;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  className?: string;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  end?: boolean;
  roles?: UserRole[];
  permission?: Permission;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentRole,
  isMobileOpen,
  onMobileClose,
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const { isAuthenticated, permissions } = useAuth();

  const effectivePermissions = isAuthenticated ? permissions : (ROLE_PERMISSIONS[currentRole] ?? []);

  // Each item mirrors the guard on its route in AppRoutes so no menu entry leads to /unauthorized.
  const allItems: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admissions', label: 'Admissions & Triage', icon: UserPlus },
    { to: '/beds', label: 'Bed Board', icon: BedDouble },
    { to: '/shifts', label: 'Duty Roster & Shifts', icon: Clock },
    { to: '/observations/maternal', label: 'Maternal Vitals', icon: Activity },
    { to: '/observations/fetal', label: 'Fetal Vitals', icon: Baby },
    { to: '/alerts', label: 'Emergency Alerts', icon: BellRing, badge: 'Priority' },
    {
      to: '/analytics',
      label: 'Operational Analytics',
      icon: FileBarChart2,
      end: true,
      permission: Permission.ANALYTICS_VIEW,
    },
    {
      to: '/staff',
      label: 'Staff Accounts',
      icon: Users,
      roles: [UserRole.ADMIN],
      permission: Permission.USERS_VIEW,
    },
    {
      to: '/analytics/reports',
      label: 'Reports & Analytics',
      icon: FileBarChart2,
      roles: [UserRole.ADMIN],
      permission: Permission.ANALYTICS_EXPORT,
    },
    {
      to: '/analytics/reports',
      label: 'Clinical Summaries',
      icon: FileBarChart2,
      roles: [UserRole.DOCTOR],
      permission: Permission.ANALYTICS_EXPORT,
    },
    {
      to: '/audit',
      label: 'Security Audit Logs',
      icon: ShieldCheck,
      roles: [UserRole.ADMIN],
      permission: Permission.REPORTS_VIEW_AUDIT_LOGS,
    },
  ];

  const navItems = allItems.filter(
    (item) =>
      (!item.roles || item.roles.includes(currentRole)) &&
      (!item.permission || effectivePermissions.includes(item.permission)),
  );

  const sidebarContent = (
    <aside
      className={`flex flex-col h-full bg-slate-900 text-slate-100 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } ${className || ''}`}
    >
      {/* Branding */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shrink-0 shadow">
            <HeartPulse className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold tracking-tight text-white leading-tight truncate">
                LRMS Kalubowila
              </h2>
              <p className="text-[10px] text-teal-400 font-medium truncate">Labour Room System</p>
            </div>
          )}
        </div>
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Role Pill */}
      {!collapsed && (
        <div className="px-4 py-3 bg-slate-950/50 border-b border-slate-800/80">
          <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            Active Workspace
          </p>
          <div className="flex items-center space-x-1.5 mt-1">
            <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-medium text-slate-200">
              {currentRole === UserRole.ADMIN
                ? 'Administrator Portal'
                : currentRole === UserRole.DOCTOR
                  ? 'Doctor Clinical Station'
                  : 'Nursing / Midwife Station'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center px-3 py-3 lg:py-2 min-h-[44px] lg:min-h-0 text-xs font-medium rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${collapsed ? 'justify-center' : 'justify-between'}`
              }
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
              {!collapsed && item.badge && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase">
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer info */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
          Colombo South Teaching Hospital · Ward 18
        </div>
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0">{sidebarContent}</div>

      {/* Mobile Drawer (Slide-over) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative z-50 flex h-full w-64 flex-col bg-slate-900 shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
