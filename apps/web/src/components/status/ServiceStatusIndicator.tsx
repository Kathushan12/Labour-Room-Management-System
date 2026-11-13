import React from 'react';
import { Server, Database, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/badge.js';

interface ServiceStatusIndicatorProps {
  apiConnected: boolean;
  dbReady: boolean;
  loading: boolean;
  dbLatencyMs: number | null;
  onRefresh?: () => void;
  className?: string;
}

export const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({
  apiConnected,
  dbReady,
  loading,
  dbLatencyMs,
  onRefresh,
  className,
}) => {
  return (
    <div className={`flex items-center space-x-2 text-xs ${className || ''}`}>
      {/* Backend API status */}
      <Badge
        variant={apiConnected ? 'outline' : 'destructive'}
        className="text-[11px] font-medium flex items-center space-x-1 py-0.5 px-2"
        title={apiConnected ? 'Backend REST API connected' : 'Backend API disconnected'}
      >
        <Server className={`h-3 w-3 ${apiConnected ? 'text-teal-600' : 'text-white'}`} />
        <span>API: {apiConnected ? 'Live' : 'Unavailable'}</span>
      </Badge>

      {/* Database readiness status */}
      <Badge
        variant={dbReady ? 'outline' : 'warning'}
        className="text-[11px] font-medium flex items-center space-x-1 py-0.5 px-2"
        title={
          dbReady
            ? `PostgreSQL ready (${dbLatencyMs !== null ? `${dbLatencyMs}ms` : 'active'})`
            : 'PostgreSQL database dependency unavailable'
        }
      >
        <Database className={`h-3 w-3 ${dbReady ? 'text-teal-600' : 'text-amber-700'}`} />
        <span>
          DB: {dbReady ? (dbLatencyMs !== null ? `${dbLatencyMs}ms` : 'Ready') : 'Not Ready'}
        </span>
      </Badge>

      {/* Manual refresh action */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          title="Refresh service health probe"
          aria-label="Refresh service health probe"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
        </button>
      )}
    </div>
  );
};
