import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from './NotificationContext.js';
import { AlertCircle, ExternalLink, X } from 'lucide-react';

export const ClinicalEscalationToast: React.FC = () => {
  const { activeToast, dismissToast } = useNotifications();
  const navigate = useNavigate();

  if (!activeToast) return null;

  const handleAction = () => {
    if (activeToast.admissionId) {
      navigate(`/admissions/${activeToast.admissionId}`);
    }
    dismissToast();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white dark:bg-slate-900 border-l-4 border-amber-500 rounded-lg shadow-xl p-4 animate-in slide-in-from-bottom duration-200 border border-slate-200 dark:border-slate-800"
    >
      <div className="flex items-start gap-3">
        <div className="p-1 bg-amber-100 dark:bg-amber-950/60 rounded-md shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Clinical Escalation Alert
            </span>
            <button
              onClick={dismissToast}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
              title="Dismiss toast"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
            {activeToast.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
            {activeToast.safeMessage}
          </p>

          {activeToast.admissionId && (
            <div className="mt-3 flex items-center justify-end">
              <button
                onClick={handleAction}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 hover:underline"
              >
                <span>Review Episode</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
