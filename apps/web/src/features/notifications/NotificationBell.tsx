import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from './NotificationContext.js';
import { NotificationCenter } from './NotificationCenter.js';

export const NotificationBell: React.FC = () => {
  const { unreadCounts } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  const hasUnread = unreadCounts.unreadCount > 0;
  const hasEmergency = unreadCounts.emergencyCount > 0;
  const hasUrgent = unreadCounts.urgentCount > 0;

  const getBadgeStyle = () => {
    if (hasEmergency) {
      return 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400';
    }
    if (hasUrgent) {
      return 'bg-amber-600 text-white ring-2 ring-amber-300';
    }
    return 'bg-blue-600 text-white';
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Notifications"
        aria-label={`Notifications: ${unreadCounts.unreadCount} unread`}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {hasUnread && (
          <span
            className={`absolute top-1 right-1 min-w-[18px] h-[18px] px-1 text-[11px] font-bold rounded-full flex items-center justify-center ${getBadgeStyle()}`}
          >
            {unreadCounts.unreadCount > 99 ? '99+' : unreadCounts.unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto mt-2 z-50 sm:w-96 sm:max-w-[90vw] animate-in fade-in slide-in-from-top-2 duration-150">
          <NotificationCenter onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
};
