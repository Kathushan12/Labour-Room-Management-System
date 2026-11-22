import React, { useState, useEffect, useCallback } from 'react';
import {
  AnalyticsDateRangePreset,
  BedUtilizationAnalyticsDto,
  OperationalReportType,
} from '@lrms/shared';
import { analyticsApi } from '../../../services/analytics.api.js';
import { PageHeader, SectionCard } from '../../../components/shared/HeadersAndCards.js';
import { Button } from '../../../components/ui/button.js';
import {
  AnalyticsDateRangeFilter,
  AnalyticsFilterState,
} from '../components/AnalyticsDateRangeFilter.js';
import { AnalyticsKpiCard } from '../components/AnalyticsKpiCard.js';
import { AnalyticsBarChart } from '../components/AnalyticsBarChart.js';
import { AnalyticsDonutChart } from '../components/AnalyticsDonutChart.js';
import { AnalyticsDataTable, ColumnDef } from '../components/AnalyticsDataTable.js';
import { AnalyticsLoadingSkeleton, AnalyticsErrorAlert } from '../components/AnalyticsStates.js';
import { ReportExportDialog } from '../components/ReportExportDialog.js';
import { BedDouble, Sparkles, CheckCircle2, Clock, Download } from 'lucide-react';
import { Badge } from '../../../components/ui/badge.js';

export const BedAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    preset: AnalyticsDateRangePreset.THIS_MONTH,
  });
  const [data, setData] = useState<BedUtilizationAnalyticsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getBedAnalytics(filters);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load bed utilization analytics');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const bedColumns: ColumnDef<any>[] = [
    {
      key: 'bedNumber',
      header: 'Bed Number',
      render: (row) => <span className="font-bold text-slate-900">{row.bedNumber}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isActive ? 'outline' : 'destructive'} className="text-[11px]">
          {row.isActive ? 'ACTIVE' : 'OUT_OF_SERVICE'}
        </Badge>
      ),
    },
    {
      key: 'currentStatus',
      header: 'Occupancy',
      render: (row) => {
        const color =
          row.currentStatus === 'OCCUPIED'
            ? 'bg-blue-100 text-blue-800'
            : row.currentStatus === 'AVAILABLE'
              ? 'bg-emerald-100 text-emerald-800'
              : row.currentStatus === 'CLEANING'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-800';
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${color}`}>
            {row.currentStatus}
          </span>
        );
      },
    },
    {
      key: 'totalAllocationsInPeriod',
      header: 'Allocations in Period',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-slate-900">{row.totalAllocationsInPeriod}</span>
      ),
    },
    {
      key: 'occupiedHours',
      header: 'Cumulative Occupied Hours',
      align: 'right',
      render: (row) => <span>{row.occupiedHours} hrs</span>,
    },
    {
      key: 'occupancyPercentage',
      header: 'Occupancy %',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
          {row.occupancyPercentage}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" data-testid="bed-analytics-page">
      <PageHeader
        title="Ward Bed Utilization, Turnover & Sanitation Monitoring"
        description="Physical bed capacity, active occupancy rates, sanitation turnaround latency, and individual bed turnover metrics for Ward 18."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Operational Analytics', href: '/analytics' },
          { label: 'Bed Utilization', active: true },
        ]}
        action={
          <Button
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Bed Report
          </Button>
        }
      />

      <AnalyticsDateRangeFilter
        filters={filters}
        onChange={setFilters}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      {error && <AnalyticsErrorAlert error={error} onRetry={loadData} />}
      {isLoading && <AnalyticsLoadingSkeleton kpiCount={5} />}

      {!isLoading && data && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <AnalyticsKpiCard
              title="Physical Beds"
              value={data.totalInstalledBeds}
              subtitle="Total registered inventory"
              icon={<BedDouble className="w-5 h-5 text-slate-700" />}
              iconBgColor="bg-slate-100"
            />
            <AnalyticsKpiCard
              title="Functioning Beds"
              value={data.functioningBeds}
              subtitle="Operational & ready"
              icon={<CheckCircle2 className="w-5 h-5 text-teal-700" />}
              iconBgColor="bg-teal-50"
            />
            <AnalyticsKpiCard
              title="Occupied Beds"
              value={data.currentlyOccupiedBeds}
              subtitle="Currently in clinical use"
              icon={<BedDouble className="w-5 h-5 text-blue-700" />}
              iconBgColor="bg-blue-50"
            />
            <AnalyticsKpiCard
              title="Bed Occupancy Rate"
              value={`${data.currentOccupancyRate ?? 0}%`}
              subtitle="Proportion of functioning beds"
              icon={<BedDouble className="w-5 h-5 text-indigo-700" />}
              iconBgColor="bg-indigo-50"
              target="Target: 75-85%"
            />
            <AnalyticsKpiCard
              title="Avg Cleaning Turnaround"
              value={
                data.cleaningTurnaroundStats.averageCleaningTurnaroundMins !== null
                  ? `${data.cleaningTurnaroundStats.averageCleaningTurnaroundMins}m`
                  : '—'
              }
              subtitle="Discharge to clean certification"
              icon={<Sparkles className="w-5 h-5 text-amber-700" />}
              iconBgColor="bg-amber-50"
              target="Target: < 45m"
            />
          </div>

          {/* Bed Status Breakdown & Cleaning Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Bed Physical Status Distribution"
              description="Current real-time occupancy and maintenance state"
            >
              <AnalyticsBarChart
                data={[
                  { label: 'Occupied', value: data.currentlyOccupiedBeds, color: '#1e3a8a' },
                  { label: 'Available', value: data.availableBeds, color: '#0d9488' },
                  {
                    label: 'Cleaning Required',
                    value: data.cleaningRequiredBeds,
                    color: '#f59e0b',
                  },
                  {
                    label: 'Cleaning In Progress',
                    value: data.cleaningInProgressBeds,
                    color: '#eab308',
                  },
                  { label: 'Out of Service', value: data.outOfServiceBeds, color: '#94a3b8' },
                ]}
                unit="beds"
              />
            </SectionCard>

            <SectionCard
              title="Cleaning Cycles Completed"
              description="Hygiene turnover statistics across reporting period"
            >
              <div className="p-4 bg-slate-50 rounded-lg space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Total Cleaning Cycles</span>
                  <span className="font-bold text-slate-900">
                    {data.cleaningTurnaroundStats.totalCleaningCyclesCompleted} cycles
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Average Turnaround Time</span>
                  <span className="font-bold text-slate-900">
                    {data.cleaningTurnaroundStats.averageCleaningTurnaroundMins !== null
                      ? `${data.cleaningTurnaroundStats.averageCleaningTurnaroundMins} minutes`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Median Turnaround Time</span>
                  <span className="font-bold text-slate-900">
                    {data.cleaningTurnaroundStats.medianCleaningTurnaroundMins !== null
                      ? `${data.cleaningTurnaroundStats.medianCleaningTurnaroundMins} minutes`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Fastest / Longest Turnaround</span>
                  <span className="font-bold text-slate-900">
                    {data.cleaningTurnaroundStats.minCleaningTurnaroundMins ?? '—'}m /{' '}
                    {data.cleaningTurnaroundStats.maxCleaningTurnaroundMins ?? '—'}m
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Individual Bed Utilization Table */}
          <SectionCard
            title="Individual Bed Utilization & Cumulative Occupancy"
            description="Per-bed throughput, allocations, and cumulative occupied hours"
          >
            <AnalyticsDataTable
              columns={bedColumns}
              data={data.bedUtilizationList}
              maxHeight="400px"
            />
          </SectionCard>
        </div>
      )}

      <ReportExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultReportType={OperationalReportType.BED_UTILIZATION}
        defaultPreset={filters.preset}
        defaultWardId={filters.wardId}
      />
    </div>
  );
};
