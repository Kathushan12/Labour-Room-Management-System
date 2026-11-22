import React, { useState } from 'react';
import { useNotifications } from './NotificationContext.js';
import { NotificationItem } from './NotificationItem.js';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator.js';
import { NotificationPriority } from '@lrms/shared';
import { CheckCheck, RefreshCw, BellOff, X } from 'lucide-react';

interface NotificationCenterProps {
  onClose?: () => void;
}

type FilterTab = 'ALL' | 'UNREAD' | 'EMERGENCY' | 'URGENT' | 'ROUTINE';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const {
    notifications,
    unreadCounts,
    connectionStatus,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const filteredNotifications = notifications.filter((n) => {
    switch (activeTab) {
      case 'UNREAD':
        return !n.readAt;
      case 'EMERGENCY':
        return n.priority === NotificationPriority.EMERGENCY;
      case 'URGENT':
        return n.priority === NotificationPriority.URGENT;
      case 'ROUTINE':
        return n.priority === NotificationPriority.ROUTINE;
      case 'ALL':
      default:
        return true;
    }
  });

  return (
    <div className="flex flex-col h-full max-h-[85vh] w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Clinical Notifications</span>
            {unreadCounts.unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {unreadCounts.unreadCount}
              </span>
            )}
          </h3>
          <div className="mt-1">
            <ConnectionStatusIndicator status={connectionStatus} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => refreshNotifications()}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {unreadCounts.unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 px-2 pt-1 gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-2 font-medium rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'ALL'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-500'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab('UNREAD')}
          className={`px-3 py-2 font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1 ${
            activeTab === 'UNREAD'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-500'
          }`}
        >
          Unread
          {unreadCounts.unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
              {unreadCounts.unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('EMERGENCY')}
          className={`px-3 py-2 font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1 ${
            activeTab === 'EMERGENCY'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-500'
          }`}
        >
          Emergency
          {unreadCounts.emergencyCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
              {unreadCounts.emergencyCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('URGENT')}
          className={`px-3 py-2 font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1 ${
            activeTab === 'URGENT'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-500'
          }`}
        >
          Urgent
          {unreadCounts.urgentCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
              {unreadCounts.urgentCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ROUTINE')}
          className={`px-3 py-2 font-medium rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'ROUTINE'
              ? 'border-slate-600 text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-500'
          }`}
        >
          Routine
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <BellOff className="w-8 h-8 mx-auto text-slate-500 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-500">
              No notifications in this view
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              Clinical alerts and escalation notices will appear here in real-time.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onMarkAsRead={markAsRead}
              onClosePanel={onClose}
            />
          ))
        )}
      </div>

      {/* Footer Notice */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-500 text-center leading-tight">
        <span>
          Marking alerts as read does not acknowledge clinical escalation or emergency status.
        </span>
      </div>
    </div>
  );
};
