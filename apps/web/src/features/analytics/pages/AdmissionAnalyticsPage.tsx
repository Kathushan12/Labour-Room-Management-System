import React, { useState, useEffect, useCallback } from 'react';
import {
  AnalyticsDateRangePreset,
  AdmissionAnalyticsDto,
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
import { AnalyticsTrendLine } from '../components/AnalyticsTrendLine.js';
import { AnalyticsDataTable, ColumnDef } from '../components/AnalyticsDataTable.js';
import { AnalyticsLoadingSkeleton, AnalyticsErrorAlert } from '../components/AnalyticsStates.js';
import { ReportExportDialog } from '../components/ReportExportDialog.js';
import { Activity, UserCheck, ArrowRightLeft, UserMinus, Download } from 'lucide-react';

export const AdmissionAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    preset: AnalyticsDateRangePreset.THIS_MONTH,
  });
  const [data, setData] = useState<AdmissionAnalyticsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getAdmissionAnalytics(filters);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load admission analytics');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dailyTrendColumns: ColumnDef<{ date: string; admissions: number; discharges: number }>[] = [
    { key: 'date', header: 'Date (Asia/Colombo)' },
    { key: 'admissions', header: 'Admissions Registered', align: 'right' },
    { key: 'discharges', header: 'Discharges Processed', align: 'right' },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" data-testid="admission-analytics-page">
      <PageHeader
        title="Patient Admission & Clinical Triage Analytics"
        description="Detailed patient intake volume, urgency classification, triage status distribution, and daily patient flow for Ward 18."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Operational Analytics', href: '/analytics' },
          { label: 'Admissions', active: true },
        ]}
        action={
          <Button
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Admission Data
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
      {isLoading && <AnalyticsLoadingSkeleton kpiCount={4} />}

      {!isLoading && data && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsKpiCard
              title="Total Admissions"
              value={data.totalAdmissions}
              subtitle="Registered intake in period"
              icon={<Activity className="w-5 h-5 text-teal-700" />}
              iconBgColor="bg-teal-50"
            />
            <AnalyticsKpiCard
              title="Active Inpatients"
              value={data.activeAdmissionsCount}
              subtitle="Currently in Ward 18"
              icon={<UserCheck className="w-5 h-5 text-blue-700" />}
              iconBgColor="bg-blue-50"
            />
            <AnalyticsKpiCard
              title="Discharged Patients"
              value={data.dischargedAdmissionsCount}
              subtitle="Authorized postpartum release"
              icon={<UserMinus className="w-5 h-5 text-emerald-700" />}
              iconBgColor="bg-emerald-50"
            />
            <AnalyticsKpiCard
              title="Transfers Out"
              value={data.transferredAdmissionsCount}
              subtitle="To ICU, NICU, or Theatre"
              icon={<ArrowRightLeft className="w-5 h-5 text-amber-700" />}
              iconBgColor="bg-amber-50"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Admission Urgency & Category Breakdown"
              description="Classification by clinical presentation at admission"
            >
              <AnalyticsBarChart
                data={data.admissionsByCategory.map(
                  (c: { category: string; count: number; percentage: number }) => ({
                    label: c.category.replace(/_/g, ' '),
                    value: c.count,
                    sublabel: `${c.percentage}%`,
                  }),
                )}
                unit="pts"
              />
            </SectionCard>

            <SectionCard
              title="Current Admission Status Distribution"
              description="Inpatient clinical progression stages"
            >
              <AnalyticsDonutChart
                data={data.admissionsByStatus.map((s: { status: string; count: number }) => ({
                  label: s.status.replace(/_/g, ' '),
                  value: s.count,
                }))}
                totalLabel="Total"
                centerValue={data.totalAdmissions}
              />
            </SectionCard>
          </div>

          {/* Time Series Trend */}
          <SectionCard
            title="Daily Patient Flow (Admissions vs Discharges)"
            description="Daily admission registrations and discharge completions"
          >
            <AnalyticsTrendLine
              data={data.dailyTrends.map(
                (d: { date: string; admissions: number; discharges: number }) => ({
                  date: d.date,
                  value: d.admissions,
                  secondaryValue: d.discharges,
                  label: d.date.slice(5),
                }),
              )}
              primaryLabel="Admissions"
              secondaryLabel="Discharges"
              primaryColor="#0d9488"
              secondaryColor="#1e3a8a"
              unit="pts"
            />
          </SectionCard>

          {/* Detailed Daily Breakdown Table */}
          <SectionCard
            title="Daily Admission & Discharge Log"
            description="Tabular daily breakdown of patient flow"
          >
            <AnalyticsDataTable
              columns={dailyTrendColumns}
              data={data.dailyTrends}
              maxHeight="320px"
            />
          </SectionCard>
        </div>
      )}

      <ReportExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultReportType={OperationalReportType.ADMISSION_STATISTICS}
        defaultPreset={filters.preset}
        defaultWardId={filters.wardId}
      />
    </div>
  );
};
