import React, { useEffect } from 'react';
import { AnalyticsDateRangePreset } from '@lrms/shared';
import { Calendar, RotateCw, Filter } from 'lucide-react';
import { Button } from '../../../components/ui/button.js';
import { useActiveWard } from '../../../hooks/useActiveWard.js';

export interface AnalyticsFilterState {
  preset: AnalyticsDateRangePreset;
  startDate?: string;
  endDate?: string;
  wardId?: string;
}

interface AnalyticsDateRangeFilterProps {
  filters: AnalyticsFilterState;
  onChange: (filters: AnalyticsFilterState) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

const PRESET_LABELS: Record<AnalyticsDateRangePreset, string> = {
  [AnalyticsDateRangePreset.TODAY]: 'Today',
  [AnalyticsDateRangePreset.YESTERDAY]: 'Yesterday',
  [AnalyticsDateRangePreset.THIS_WEEK]: 'This Week',
  [AnalyticsDateRangePreset.LAST_WEEK]: 'Last Week',
  [AnalyticsDateRangePreset.THIS_MONTH]: 'This Month',
  [AnalyticsDateRangePreset.LAST_MONTH]: 'Last Month',
  [AnalyticsDateRangePreset.LAST_30_DAYS]: 'Last 30 Days',
  [AnalyticsDateRangePreset.LAST_90_DAYS]: 'Last 90 Days',
  [AnalyticsDateRangePreset.CUSTOM]: 'Custom Range',
};

export const AnalyticsDateRangeFilter: React.FC<AnalyticsDateRangeFilterProps> = ({
  filters,
  onChange,
  onRefresh,
  isLoading = false,
  className = '',
}) => {
  const { ward } = useActiveWard();

  useEffect(() => {
    if (ward && !filters.wardId) onChange({ ...filters, wardId: ward.id });
  }, [ward]);

  const handlePresetChange = (newPreset: AnalyticsDateRangePreset) => {
    if (newPreset === AnalyticsDateRangePreset.CUSTOM) {
      const today = new Date().toISOString().split('T')[0];
      onChange({
        ...filters,
        preset: newPreset,
        startDate: filters.startDate || today,
        endDate: filters.endDate || today,
      });
    } else {
      onChange({
        ...filters,
        preset: newPreset,
        startDate: undefined,
        endDate: undefined,
      });
    }
  };

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col gap-3 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}
      data-testid="analytics-date-range-filter"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Preset Selector */}
        <div className="flex min-w-0 items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <label htmlFor="analytics-preset-select" className="font-semibold text-slate-700">
            Period:
          </label>
          <select
            id="analytics-preset-select"
            aria-label="Reporting Period"
            value={filters.preset}
            onChange={(e) => handlePresetChange(e.target.value as AnalyticsDateRangePreset)}
            className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs sm:h-8 sm:flex-none text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {Object.values(AnalyticsDateRangePreset).map((p) => (
              <option key={String(p)} value={String(p)}>
                {PRESET_LABELS[p as AnalyticsDateRangePreset]}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Pickers */}
        {filters.preset === AnalyticsDateRangePreset.CUSTOM && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 animate-fadeIn">
            <span className="text-slate-500">From</span>
            <input
              type="date"
              aria-label="Start Date"
              value={filters.startDate || ''}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
              className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs sm:h-8 sm:flex-none text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-slate-500">To</span>
            <input
              type="date"
              aria-label="End Date"
              value={filters.endDate || ''}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
              className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs sm:h-8 sm:flex-none text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}

        {/* Ward Selector */}
        <div className="flex min-w-0 items-center gap-2 sm:border-l sm:border-slate-200 sm:pl-3">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="shrink-0 text-slate-600">Ward:</span>
          <select
            aria-label="Ward Filter"
            value={filters.wardId ?? ward?.id ?? ''}
            onChange={(e) => onChange({ ...filters, wardId: e.target.value })}
            className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs sm:h-8 sm:flex-none text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {ward && (
              <option value={ward.id}>
                {ward.name} ({ward.code})
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Action / Refresh */}
      <div className="flex items-center gap-2">
        <span className="hidden md:inline text-[11px] text-slate-500 font-mono">
          Asia/Colombo (UTC+05:30)
        </span>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-11 w-full text-xs text-slate-700 hover:text-slate-900 sm:h-8 sm:w-auto"
            aria-label="Refresh Data"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
};
