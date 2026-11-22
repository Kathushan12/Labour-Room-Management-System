import React, { useState, useEffect, useCallback } from 'react';
import {
  AnalyticsDateRangePreset,
  DeliveryAnalyticsDto,
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
import { AnalyticsLoadingSkeleton, AnalyticsErrorAlert } from '../components/AnalyticsStates.js';
import { ReportExportDialog } from '../components/ReportExportDialog.js';
import { Baby, Scissors, HeartPulse, Download, Activity } from 'lucide-react';

export const DeliveryAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    preset: AnalyticsDateRangePreset.THIS_MONTH,
  });
  const [data, setData] = useState<DeliveryAnalyticsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getDeliveryAnalytics(filters);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery analytics');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" data-testid="delivery-analytics-page">
      <PageHeader
        title="Delivery Outcomes, Birth Records & Maternal Health"
        description="Comprehensive delivery modalities, surgical intervention rates, multiple birth ratios, and maternal postpartum trauma metrics."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Operational Analytics', href: '/analytics' },
          { label: 'Deliveries & Outcomes', active: true },
        ]}
        action={
          <Button
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Delivery Report
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
              title="Total Deliveries"
              value={data.totalDeliveries}
              subtitle="Completed labour events"
              icon={<HeartPulse className="w-5 h-5 text-teal-700" />}
              iconBgColor="bg-teal-50"
            />
            <AnalyticsKpiCard
              title="Multiple Births"
              value={data.multipleBirthDeliveriesCount}
              subtitle={`${data.multipleBirthRatioPercentage}% of total deliveries`}
              icon={<Baby className="w-5 h-5 text-purple-700" />}
              iconBgColor="bg-purple-50"
            />
            <AnalyticsKpiCard
              title="Avg Blood Loss"
              value={data.averageBloodLossMl !== null ? `${data.averageBloodLossMl} mL` : '—'}
              subtitle="Estimated postpartum blood loss"
              icon={<Activity className="w-5 h-5 text-rose-700" />}
              iconBgColor="bg-rose-50"
            />
            <AnalyticsKpiCard
              title="Modes Tracked"
              value={data.deliveriesByMode.length}
              subtitle="Distinct delivery categories"
              icon={<Scissors className="w-5 h-5 text-indigo-700" />}
              iconBgColor="bg-indigo-50"
            />
          </div>

          {/* Delivery Mode & Trauma Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Delivery Mode Breakdown"
              description="Clinical delivery method distribution"
            >
              <AnalyticsDonutChart
                data={data.deliveriesByMode.map(
                  (dm: { mode: string; count: number; percentage: number }) => ({
                    label: dm.mode.replace(/_/g, ' '),
                    value: dm.count,
                  }),
                )}
                totalLabel="Deliveries"
                centerValue={data.totalDeliveries}
              />
            </SectionCard>

            <SectionCard
              title="Perineal Trauma & Tear Distribution"
              description="Obstetric perineal laceration severity"
            >
              <AnalyticsBarChart
                data={data.perinealTraumaDistribution.map(
                  (pt: { status: string; count: number }) => ({
                    label: pt.status.replace(/_/g, ' '),
                    value: pt.count,
                  }),
                )}
                unit="pts"
              />
            </SectionCard>
          </div>

          {/* Placenta Delivery Status */}
          <SectionCard
            title="Placental Delivery & Complication Monitoring"
            description="Complete vs manual removal or retained placenta status"
          >
            <AnalyticsBarChart
              data={data.placentaDeliveryStatusDistribution.map(
                (pd: { status: string; count: number }) => ({
                  label: pd.status.replace(/_/g, ' '),
                  value: pd.count,
                }),
              )}
              unit="pts"
            />
          </SectionCard>
        </div>
      )}

      <ReportExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultReportType={OperationalReportType.DELIVERY_OUTCOMES}
        defaultPreset={filters.preset}
        defaultWardId={filters.wardId}
      />
    </div>
  );
};
