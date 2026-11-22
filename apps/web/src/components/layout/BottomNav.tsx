import React from 'react';
import { NavLink } from 'react-router-dom';
import { BedDouble, BellRing, LayoutDashboard, Menu, UserPlus } from 'lucide-react';
import { useNotifications } from '../../features/notifications/NotificationContext.js';

interface BottomNavProps {
  onMore: () => void;
}

const ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admissions', label: 'Admissions', icon: UserPlus },
  { to: '/beds', label: 'Bed Board', icon: BedDouble },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
];

// Thumb-reach navigation for nurses and doctors on the phone app (SRS 3.1). Hidden on desktop.
export const BottomNav: React.FC<BottomNavProps> = ({ onMore }) => {
  const { unreadCounts } = useNotifications();
  const urgent = unreadCounts.emergencyCount;

  const base =
    'relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium';

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-safe pl-safe pr-safe lg:hidden"
    >
      <div className="flex">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${base} ${isActive ? 'text-teal-800 bg-teal-50 border-t-2 border-teal-700' : 'text-slate-600 border-t-2 border-transparent'}`
            }
          >
            <span className="relative">
              <Icon className="h-5 w-5" aria-hidden="true" />
              {to === '/alerts' && urgent > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-700 px-1 text-[11px] font-bold leading-none text-white">
                  {urgent > 9 ? '9+' : urgent}
                  <span className="sr-only"> emergency alerts</span>
                </span>
              )}
            </span>
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMore}
          className={`${base} border-t-2 border-transparent text-slate-600`}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
};
