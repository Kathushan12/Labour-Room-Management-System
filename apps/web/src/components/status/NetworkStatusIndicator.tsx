import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../ui/badge.js';

interface NetworkStatusIndicatorProps {
  online: boolean;
  className?: string;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  online,
  className,
}) => {
  return (
    <Badge
      variant={online ? 'outline' : 'destructive'}
      className={`text-[11px] font-medium flex items-center space-x-1 py-0.5 px-2 ${className || ''}`}
    >
      {online ? (
        <>
          <Wifi className="h-3 w-3 text-emerald-600" />
          <span className="text-slate-700">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-white" />
          <span>Offline</span>
        </>
      )}
    </Badge>
  );
};
