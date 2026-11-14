import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from './NotificationContext.js';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';

export const EmergencyAlertBanner: React.FC = () => {
  const { activeEmergency, dismissEmergencyBanner } = useNotifications();
  const navigate = useNavigate();

  if (!activeEmergency) return null;

  const handleAction = () => {
    if (activeEmergency.admissionId) {
      navigate(`/admissions/${activeEmergency.admissionId}`);
    }
    dismissEmergencyBanner();
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-rose-700 text-white px-4 py-3 shadow-lg flex items-center justify-between gap-4 border-b-2 border-rose-900 animate-in slide-in-from-top duration-200 sticky top-0 z-50"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-1.5 bg-rose-800 rounded-lg shrink-0 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider bg-rose-900 px-2 py-0.5 rounded text-rose-100 border border-rose-600">
              ACUTE EMERGENCY
            </span>
            <span className="text-sm font-bold truncate">{activeEmergency.title}</span>
          </div>
          <p className="text-xs text-rose-100 truncate mt-0.5">{activeEmergency.safeMessage}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {activeEmergency.admissionId && (
          <button
            onClick={handleAction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-rose-800 hover:bg-rose-50 text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <span>View Episode</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={dismissEmergencyBanner}
          className="p-1.5 text-rose-200 hover:text-white rounded-lg hover:bg-rose-800 transition-colors"
          title="Dismiss banner"
          aria-label="Dismiss emergency banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
