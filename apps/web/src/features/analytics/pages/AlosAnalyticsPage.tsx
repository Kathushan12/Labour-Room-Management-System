import React, { useState, useEffect, useCallback } from 'react';
import {
  AnalyticsDateRangePreset,
  AlosAnalyticsDto,
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
import { AnalyticsTrendLine } from '../components/AnalyticsTrendLine.js';
import { AnalyticsDataTable, ColumnDef } from '../components/AnalyticsDataTable.js';
import { AnalyticsLoadingSkeleton, AnalyticsErrorAlert } from '../components/AnalyticsStates.js';
import { PermissionGuard } from '../../../components/auth/PermissionGuard.js';
import { ReportExportDialog } from '../components/ReportExportDialog.js';
import { Clock, Baby, HeartPulse, Info, Download } from 'lucide-react';
import { humanizeEnum } from '../../../lib/labels.js';

export const AlosAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    preset: AnalyticsDateRangePreset.THIS_MONTH,
  });
  const [data, setData] = useState<AlosAnalyticsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getAlosAnalytics(filters);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load ALOS analytics');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const monthlyColumns: ColumnDef<any>[] = [
    { key: 'month', header: 'Reporting Month' },
    {
      key: 'maternalAlos',
      header: 'Maternal ALOS',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-slate-900">
          {row.maternalAlos !== null ? `${row.maternalAlos} days` : '—'}
        </span>
      ),
    },
    {
      key: 'newbornAlos',
      header: 'Newborn ALOS',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-teal-800">
          {row.newbornAlos !== null ? `${row.newbornAlos} days` : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" data-testid="alos-analytics-page">
      <PageHeader
        title="Average Length of Stay (ALOS) & Clinical Throughput"
        description="Independent maternal and newborn hospitalization durations, stratified by clinical risk acuity, care plan, and historical monthly trends."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Operational Analytics', href: '/analytics' },
          { label: 'ALOS Analysis', active: true },
        ]}
        action={
          <PermissionGuard permission={Permission.ANALYTICS_EXPORT}>
            <Button
              size="sm"
              onClick={() => setIsExportOpen(true)}
              className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export ALOS Report
            </Button>
          </PermissionGuard>
        }
      />

      {/* Clinical Guidance Notice: Separate Maternal & Newborn Calculation */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-xs text-teal-900 flex items-start space-x-3 shadow-xs">
        <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-teal-950">
            Clinical Methodology: Strict ALOS Independence
          </h4>
          <p className="mt-1 leading-relaxed text-teal-800">
            In line with Sri Lanka Ministry of Health maternity guidelines and patient-privacy
            principles,
            <strong> maternal length of stay</strong> (admission to postpartum discharge) and
            <strong> newborn length of stay</strong> (birth timestamp to neonatal release) are
            computed as strictly independent metrics. Neonatal stays in special care nurseries do
            not artificially inflate maternal metrics.
          </p>
        </div>
      </div>

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
              title="Maternal Mean ALOS"
              value={data.maternalAlosDays !== null ? `${data.maternalAlosDays}d` : '—'}
              subtitle="Admission to postpartum discharge"
              icon={<HeartPulse className="w-5 h-5 text-amber-700" />}
              iconBgColor="bg-amber-50"
            />
            <AnalyticsKpiCard
              title="Maternal Median LOS"
              value={data.maternalMedianLosDays !== null ? `${data.maternalMedianLosDays}d` : '—'}
              subtitle="50th percentile maternal stay"
              icon={<Clock className="w-5 h-5 text-slate-700" />}
              iconBgColor="bg-slate-100"
            />
            <AnalyticsKpiCard
              title="Newborn Mean ALOS"
              value={data.newbornAlosDays !== null ? `${data.newbornAlosDays}d` : '—'}
              subtitle="Birth timestamp to release"
              icon={<Baby className="w-5 h-5 text-teal-700" />}
              iconBgColor="bg-teal-50"
            />
            <AnalyticsKpiCard
              title="Newborn Median LOS"
              value={data.newbornMedianLosDays !== null ? `${data.newbornMedianLosDays}d` : '—'}
              subtitle="50th percentile newborn stay"
              icon={<Clock className="w-5 h-5 text-blue-700" />}
              iconBgColor="bg-blue-50"
            />
          </div>

          {/* Care Plan Acuity Breakdown */}
          <SectionCard
            title="Maternal ALOS by Clinical Category"
            description="Mean hospitalization days across clinical admission categories"
          >
            <AnalyticsBarChart
              data={data.maternalAlosByCategory.map(
                (cp: { category: string; count: number; alosDays: number | null }) => ({
                  label: humanizeEnum(cp.category),
                  value: cp.alosDays ?? 0,
                  sublabel: `${cp.count} pts`,
                }),
              )}
              unit="days"
            />
          </SectionCard>

          {/* Historical Monthly Trend */}
          <SectionCard
            title="Monthly Historical ALOS Progression"
            description="Comparative monthly trends for mothers and infants"
          >
            <AnalyticsTrendLine
              data={data.monthlyAlosTrends.map(
                (m: {
                  month: string;
                  maternalAlos: number | null;
                  newbornAlos: number | null;
                }) => ({
                  date: m.month,
                  value: m.maternalAlos ?? 0,
                  secondaryValue: m.newbornAlos ?? 0,
                  label: m.month,
                }),
              )}
              primaryLabel="Maternal ALOS (days)"
              secondaryLabel="Newborn ALOS (days)"
              primaryColor="#d97706"
              secondaryColor="#0d9488"
              unit="days"
            />
          </SectionCard>

          {/* Historical Table */}
          <SectionCard
            title="Monthly ALOS Summary Table"
            description="Historical monthly breakdown with discharge volumes"
          >
            <AnalyticsDataTable
              columns={monthlyColumns}
              data={data.monthlyAlosTrends}
              maxHeight="320px"
            />
          </SectionCard>
        </div>
      )}

      <PermissionGuard permission={Permission.ANALYTICS_EXPORT}>
        <ReportExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          defaultReportType={OperationalReportType.MATERNAL_ALOS}
          defaultPreset={filters.preset}
          defaultWardId={filters.wardId}
        />
      </PermissionGuard>
    </div>
  );
};
