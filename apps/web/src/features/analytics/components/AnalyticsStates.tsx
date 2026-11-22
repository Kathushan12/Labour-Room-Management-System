import React from 'react';
import { Skeleton } from '../../../components/ui/skeleton.js';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert.js';
import { Button } from '../../../components/ui/button.js';
import { AlertTriangle, Database, RotateCw } from 'lucide-react';

export const AnalyticsLoadingSkeleton: React.FC<{ kpiCount?: number }> = ({ kpiCount = 4 }) => {
  return (
    <div className="space-y-6 animate-pulse" data-testid="analytics-loading-skeleton">
      {/* Date Filter Skeleton */}
      <Skeleton className="h-14 w-full rounded-xl bg-slate-100" />

      {/* KPI Cards Grid Skeleton */}
      <div
        className={`grid grid-cols-2 lg:grid-cols-${kpiCount > 4 ? 4 : kpiCount} gap-3 sm:gap-4`}
      >
        {Array.from({ length: kpiCount }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24 bg-slate-200 rounded" />
              <Skeleton className="h-7 w-7 rounded-lg bg-slate-100" />
            </div>
            <Skeleton className="h-8 w-28 bg-slate-200 rounded" />
            <Skeleton className="h-3 w-36 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <Skeleton className="h-4 w-40 bg-slate-200 rounded" />
          <Skeleton className="h-56 w-full bg-slate-100 rounded-lg" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <Skeleton className="h-4 w-40 bg-slate-200 rounded" />
          <Skeleton className="h-56 w-full bg-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export const AnalyticsEmptyState: React.FC<{
  title?: string;
  description?: string;
  onReset?: () => void;
}> = ({
  title = 'No Clinical Data Available',
  description = 'No operational events or clinical records were found for the selected reporting period and ward.',
  onReset,
}) => {
  return (
    <div
      className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3"
      data-testid="analytics-empty-state"
    >
      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
        <Database className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md">{description}</p>
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset} className="mt-2 text-xs">
          Reset Filter to Current Month
        </Button>
      )}
    </div>
  );
};

export const AnalyticsErrorAlert: React.FC<{
  error: string | Error;
  onRetry?: () => void;
}> = ({ error, onRetry }) => {
  const errorMessage =
    typeof error === 'string' ? error : error.message || 'Failed to load analytics data';

  return (
    <Alert
      variant="destructive"
      className="border-red-200 bg-red-50 text-red-900"
      data-testid="analytics-error-alert"
    >
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-sm font-semibold">Operational Analytics Error</AlertTitle>
      <AlertDescription className="text-xs mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>{errorMessage}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-xs border-red-300 text-red-800 hover:bg-red-100 shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
