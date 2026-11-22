import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationDto, NotificationPriority } from '@lrms/shared';
import { AlertTriangle, AlertCircle, Info, Check, ExternalLink } from 'lucide-react';

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkAsRead: (id: string) => void;
  onClosePanel?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onClosePanel,
}) => {
  const navigate = useNavigate();
  const isUnread = !notification.readAt;

  const formatRelativeTime = (timestamp: string) => {
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.EMERGENCY:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse border border-rose-300 dark:border-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            EMERGENCY
          </span>
        );
      case NotificationPriority.URGENT:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            URGENT
          </span>
        );
      case NotificationPriority.ROUTINE:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Info className="w-3 h-3 text-slate-500" />
            ROUTINE
          </span>
        );
    }
  };

  const handleNavigate = () => {
    if (notification.admissionId) {
      navigate(`/admissions/${notification.admissionId}`);
      if (onClosePanel) onClosePanel();
    }
  };

  return (
    <div
      className={`p-3.5 border-b border-slate-200 dark:border-slate-800 transition-colors ${
        isUnread
          ? 'bg-blue-50/50 dark:bg-blue-950/20'
          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {getPriorityBadge(notification.priority)}
          {isUnread && (
            <span
              className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"
              title="Unread notification"
            />
          )}
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-500 font-mono">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>

      <h4 className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
        {notification.title}
      </h4>

      <p className="mt-1 text-xs text-slate-600 dark:text-slate-500 leading-relaxed">
        {notification.safeMessage}
      </p>

      <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div>
          {notification.admissionId && (
            <button
              onClick={handleNavigate}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
            >
              <span>View Episode</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isUnread && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Mark as read"
            >
              <Check className="w-3 h-3 text-slate-500" />
              <span>Mark Read</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
