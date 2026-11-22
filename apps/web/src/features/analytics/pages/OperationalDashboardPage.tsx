import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AnalyticsDateRangePreset,
  OperationalOverviewDto,
  OperationalReportType,
  Permission,
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
import { AnalyticsLoadingSkeleton, AnalyticsErrorAlert } from '../components/AnalyticsStates.js';
import { PermissionGuard } from '../../../components/auth/PermissionGuard.js';
import { ReportExportDialog } from '../components/ReportExportDialog.js';
import {
  Baby,
  BedDouble,
  Clock,
  HeartPulse,
  Users,
  BellRing,
  Download,
  Activity,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const OperationalDashboardPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    preset: AnalyticsDateRangePreset.THIS_MONTH,
  });
  const [data, setData] = useState<OperationalOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getExecutiveSummary(filters);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load executive summary analytics');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" data-testid="operational-dashboard-page">
      {/* Header */}
      <PageHeader
        title="Hospital Operational Analytics & Management Dashboard"
        description="Real-time clinical throughput, bed occupancy, delivery outcomes, length of stay, and SLA response monitoring for Colombo South Teaching Hospital (Ward 18)."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Operational Analytics', active: true },
        ]}
        action={
          <div className="flex items-center space-x-2">
            <PermissionGuard permission={Permission.ANALYTICS_EXPORT}>
              <Button
                size="sm"
                onClick={() => setIsExportOpen(true)}
                className="text-xs bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
                data-testid="export-report-btn"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Generate Official Report
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {/* Date Range & Ward Selector */}
      <AnalyticsDateRangeFilter
        filters={filters}
        onChange={setFilters}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      {/* Error Alert */}
      {error && <AnalyticsErrorAlert error={error} onRetry={loadData} />}

      {/* Loading Skeleton */}
      {isLoading && <AnalyticsLoadingSkeleton kpiCount={8} />}

      {/* Content */}
      {!isLoading && data && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sub-Navigation Shortcut Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs border-b border-slate-200">
            <Link
              to="/analytics/admissions"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 shrink-0"
            >
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>Admissions</span>
            </Link>
            <Link
              to="/analytics/deliveries"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 shrink-0"
            >
              <Baby className="w-3.5 h-3.5 text-blue-600" />
              <span>Deliveries & Outcomes</span>
            </Link>
            <Link
              to="/analytics/beds"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 shrink-0"
            >
              <BedDouble className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bed Utilization</span>
            </Link>
            <Link
              to="/analytics/alos"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 shrink-0"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>ALOS Analysis</span>
            </Link>
            <Link
              to="/analytics/staffing"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 shrink-0"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Staffing & Coverage</span>
            </Link>
            <Link
              to="/analytics/alerts"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 shrink-0"
            >
              <BellRing className="w-3.5 h-3.5 text-rose-600" />
              <span>Clinical Alerts & SLA</span>
            </Link>
            <PermissionGuard permission={Permission.ANALYTICS_EXPORT}>
              <Link
                to="/analytics/reports"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-medium hover:bg-teal-100 shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" />
                <span>Reports Catalog (13)</span>
              </Link>
            </PermissionGuard>
          </div>

          {/* Primary Top-Level KPI Grid (8 Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="kpi-grid">
            <AnalyticsKpiCard
              title="Total Admissions"
              value={data.totalAdmissions.currentValue}
              subtitle="Registered patient admissions"
              icon={<Activity className="w-5 h-5 text-teal-700" />}
              iconBgColor="bg-teal-50"
              delta={
                data.totalAdmissions.percentageChange !== null
                  ? { value: data.totalAdmissions.percentageChange, label: 'vs previous period' }
                  : undefined
              }
            />
            <AnalyticsKpiCard
              title="Total Deliveries"
              value={data.totalDeliveries.currentValue}
              subtitle="Completed labour events"
              icon={<Baby className="w-5 h-5 text-blue-700" />}
              iconBgColor="bg-blue-50"
              delta={
                data.totalDeliveries.percentageChange !== null
                  ? { value: data.totalDeliveries.percentageChange, label: 'vs previous period' }
                  : undefined
              }
            />
            <AnalyticsKpiCard
              title="Bed Occupancy"
              value={`${data.currentOccupancyRate ?? 0}%`}
              subtitle={`${data.currentlyOccupiedBeds} of ${data.totalFunctioningBeds} functioning beds`}
              icon={<BedDouble className="w-5 h-5 text-indigo-700" />}
              iconBgColor="bg-indigo-50"
            />
            <AnalyticsKpiCard
              title="Average Maternal ALOS"
              value={data.maternalAlosDays !== null ? `${data.maternalAlosDays} days` : '—'}
              subtitle="Admission to postpartum discharge"
              icon={<Clock className="w-5 h-5 text-amber-700" />}
              iconBgColor="bg-amber-50"
            />
            <AnalyticsKpiCard
              title="Average Newborn ALOS"
              value={data.newbornAlosDays !== null ? `${data.newbornAlosDays} days` : '—'}
              subtitle="Birth to nursery/maternal release"
              icon={<Baby className="w-5 h-5 text-teal-700" />}
              iconBgColor="bg-teal-50"
            />
            <AnalyticsKpiCard
              title="Alert Response Latency"
              value={
                data.alertProofOfReceiptLatencySeconds !== null
                  ? `${data.alertProofOfReceiptLatencySeconds}s`
                  : '—'
              }
              subtitle="Avg doctor proof-of-receipt"
              icon={<Clock className="w-5 h-5 text-rose-700" />}
              iconBgColor="bg-rose-50"
              target="Target: < 180s"
            />
            <AnalyticsKpiCard
              title="Active Inpatients"
              value={data.currentActiveAdmissions}
              subtitle="Currently occupying labour beds"
              icon={<HeartPulse className="w-5 h-5 text-emerald-700" />}
              iconBgColor="bg-emerald-50"
            />
            <AnalyticsKpiCard
              title="Clinical Staff On Duty"
              value={data.activeOnDutyDoctors + data.activeOnDutyNurses}
              subtitle={`${data.activeOnDutyDoctors} Doctors / ${data.activeOnDutyNurses} Nurses`}
              icon={<Users className="w-5 h-5 text-slate-700" />}
              iconBgColor="bg-slate-100"
            />
          </div>

          {/* Section: Operational Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bed Status Breakdown */}
            <SectionCard
              title="Bed Physical Status Distribution"
              description="Current real-time occupancy and maintenance state"
              action={
                <Link
                  to="/analytics/beds"
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center space-x-1"
                >
                  <span>Beds Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <AnalyticsDonutChart
                data={[
                  { label: 'Occupied', value: data.currentlyOccupiedBeds, color: '#1e3a8a' },
                  { label: 'Available', value: data.availableBeds, color: '#0d9488' },
                  { label: 'Cleaning', value: data.cleaningBeds, color: '#f59e0b' },
                  { label: 'Maintenance', value: data.maintenanceBeds, color: '#94a3b8' },
                ]}
                totalLabel="Total Beds"
                centerValue={data.totalFunctioningBeds}
              />
            </SectionCard>

            {/* Response & Turnover Performance */}
            <SectionCard
              title="Clinical Response & Bed Turnover Metrics"
              description="Emergency acknowledgment latency and hygiene turnaround"
              action={
                <Link
                  to="/analytics/alerts"
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center space-x-1"
                >
                  <span>Alerts Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">
                      Emergency SLA Compliance (≤ 180s acknowledgment)
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Doctors must acknowledge emergency notifications within 3 minutes of
                      escalation.
                    </p>
                  </div>
                  <span className="text-xl font-extrabold text-emerald-700 shrink-0">
                    {data.alertProofOfReceiptLatencySeconds !== null &&
                    data.alertProofOfReceiptLatencySeconds <= 180
                      ? 'Compliant'
                      : 'Monitoring'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Avg Response Latency</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {data.alertProofOfReceiptLatencySeconds !== null
                        ? `${data.alertProofOfReceiptLatencySeconds} seconds`
                        : 'No alerts in period'}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Bed Turnover Latency</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {data.averageBedCleaningTurnaroundMins !== null
                        ? `${data.averageBedCleaningTurnaroundMins} mins`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Export Report Dialog */}
      <PermissionGuard permission={Permission.ANALYTICS_EXPORT}>
        <ReportExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          defaultReportType={OperationalReportType.DAILY_OPERATIONAL_SUMMARY}
          defaultPreset={filters.preset}
          defaultWardId={filters.wardId}
        />
      </PermissionGuard>
    </div>
  );
};
