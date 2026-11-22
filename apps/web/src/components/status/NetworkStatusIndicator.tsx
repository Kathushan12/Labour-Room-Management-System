import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../ui/badge.js';

export type LiveState = 'LIVE' | 'RECONNECTING' | 'OFFLINE';

interface NetworkStatusIndicatorProps {
  state: LiveState;
  className?: string;
}

// SRS 3.1: Live / Reconnecting / Offline, shown as icon plus text.
export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  state,
  className,
}) => {
  return (
    <Badge
      variant={state === 'OFFLINE' ? 'destructive' : 'outline'}
      role="status"
      className={`text-[11px] font-medium flex items-center space-x-1 py-0.5 px-2 ${className || ''}`}
    >
      {state === 'LIVE' && (
        <>
          <Wifi className="h-3 w-3 text-emerald-600" aria-hidden="true" />
          <span className="text-slate-700">Live</span>
        </>
      )}
      {state === 'RECONNECTING' && (
        <>
          <RefreshCw className="h-3 w-3 text-amber-600 animate-spin" aria-hidden="true" />
          <span className="text-amber-800">Reconnecting</span>
        </>
      )}
      {state === 'OFFLINE' && (
        <>
          <WifiOff className="h-3 w-3 text-white" aria-hidden="true" />
          <span>Offline</span>
        </>
      )}
    </Badge>
  );
};
