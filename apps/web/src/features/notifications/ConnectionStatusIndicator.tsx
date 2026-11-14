import React from 'react';
import { ConnectionStatus } from '../../services/realtime.js';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  className = '',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'CONNECTED':
        return {
          color: 'bg-emerald-500',
          pulse: false,
          label: 'Live Real-Time',
          textColor: 'text-emerald-700 dark:text-emerald-400',
        };
      case 'CONNECTING':
        return {
          color: 'bg-amber-500',
          pulse: true,
          label: 'Connecting...',
          textColor: 'text-amber-700 dark:text-amber-400',
        };
      case 'RECONNECTING':
        return {
          color: 'bg-amber-500',
          pulse: true,
          label: 'Reconnecting...',
          textColor: 'text-amber-700 dark:text-amber-400',
        };
      case 'DISCONNECTED':
      default:
        return {
          color: 'bg-slate-400',
          pulse: false,
          label: 'Offline (Polling)',
          textColor: 'text-slate-600 dark:text-slate-400',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 ${config.textColor} ${className}`}
      title={`WebSocket Status: ${config.label}`}
      role="status"
      aria-label={`WebSocket status ${config.label}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
      </span>
      <span>{config.label}</span>
    </div>
  );
};
