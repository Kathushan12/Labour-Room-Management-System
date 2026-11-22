import React, { useState, useEffect, useCallback } from 'react';
import {
  AnalyticsDateRangePreset,
  ClinicalAlertAnalyticsDto,
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
import { BellRing, ShieldCheck, Clock, AlertTriangle, Download, Zap } from 'lucide-react';

export const ClinicalAlertAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    preset: AnalyticsDateRangePreset.THIS_MONTH,
  });
  const [data, setData] = useState<ClinicalAlertAnalyticsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getAlertAnalytics(filters);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load clinical alert analytics');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" data-testid="clinical-alert-analytics-page">
      <PageHeader
        title="Emergency Escalations & Clinical Alert SLA Response Monitoring"
        description="Real-time clinical escalation tracking, severity distribution, doctor proof-of-receipt latency, and 3-minute emergency SLA compliance for Ward 18."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Operational Analytics', href: '/analytics' },
          { label: 'Clinical Alerts & SLA', active: true },
        ]}
        action={
          <Button
            size="sm"
            onClick={() => setIsExportOpen(true)}
            className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Alert Audit Log
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
              title="Total Emergency Alerts"
              value={data.totalEmergencyAlerts}
              subtitle="Clinical notification events"
              icon={<BellRing className="w-5 h-5 text-rose-700" />}
              iconBgColor="bg-rose-50"
            />
            <AnalyticsKpiCard
              title="Clinical Escalations"
              value={data.totalClinicalEscalations}
              subtitle="Care plan escalation callouts"
              icon={<AlertTriangle className="w-5 h-5 text-amber-700" />}
              iconBgColor="bg-amber-50"
            />
            <AnalyticsKpiCard
              title="Avg Response Latency"
              value={
                data.averageAcknowledgementLatencySeconds !== null
                  ? `${data.averageAcknowledgementLatencySeconds}s`
                  : '—'
              }
              subtitle="Time to doctor proof-of-receipt"
              icon={<Clock className="w-5 h-5 text-indigo-700" />}
              iconBgColor="bg-indigo-50"
              target="Target: < 180s"
            />
            <AnalyticsKpiCard
              title="3-Min SLA Compliance"
              value={
                data.slaUnder3MinutesPercentage !== null
                  ? `${data.slaUnder3MinutesPercentage}%`
                  : '—'
              }
              subtitle="Acknowledged within 180 seconds"
              icon={<ShieldCheck className="w-5 h-5 text-emerald-700" />}
              iconBgColor="bg-emerald-50"
              target="Target: ≥ 95%"
            />
          </div>

          {/* SLA Performance Card */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-teal-600" />
                  <span>3-Minute Critical Escalation Proof-of-Receipt Mandate</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sri Lanka Ministry of Health emergency obstetric protocol requires on-call medical
                  officers to acknowledge critical escalations within 180 seconds.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-emerald-700">
                  {data.slaUnder3MinutesPercentage ?? 0}%
                </span>
                <span className="text-[11px] text-slate-400 block font-medium">
                  Compliance Rate
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (data.slaUnder3MinutesPercentage ?? 0) >= 95
                    ? 'bg-emerald-600'
                    : (data.slaUnder3MinutesPercentage ?? 0) >= 80
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                }`}
                style={{ width: `${Math.min(data.slaUnder3MinutesPercentage ?? 0, 100)}%` }}
              />
            </div>
          </div>

          {/* Severity Breakdown & Outbox Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Clinical Escalation Severity Breakdown"
              description="Proportion of alerts across severity levels"
            >
              <AnalyticsDonutChart
                data={data.alertsBySeverity.map((s: { severity: string; count: number }) => ({
                  label: s.severity.replace(/_/g, ' '),
                  value: s.count,
                  color:
                    s.severity === 'CRITICAL' || s.severity === 'EMERGENCY'
                      ? '#e11d48'
                      : s.severity === 'HIGH' || s.severity === 'URGENT'
                        ? '#f59e0b'
                        : '#0d9488',
                }))}
                totalLabel="Total"
                centerValue={data.totalEmergencyAlerts}
              />
            </SectionCard>

            <SectionCard
              title="Notification Outbox & Telemetry Health"
              description="Reliable delivery pipeline and dead-letter queue metrics"
            >
              <div className="p-4 bg-slate-50 rounded-lg space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Total Outbox Events</span>
                  <span className="font-bold text-slate-900">
                    {data.notificationOutboxStats.totalEvents}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Delivered & Processed</span>
                  <span className="font-bold text-emerald-700">
                    {data.notificationOutboxStats.processedEvents}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-600 font-medium">Pending Delivery</span>
                  <span className="font-bold text-amber-700">
                    {data.notificationOutboxStats.pendingEvents}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Dead Letter Events (Failed)</span>
                  <span className="font-bold text-slate-900">
                    {data.notificationOutboxStats.deadLetterEvents}
                  </span>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      <ReportExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultReportType={OperationalReportType.CLINICAL_ALERT_RESPONSE}
        defaultPreset={filters.preset}
        defaultWardId={filters.wardId}
      />
    </div>
  );
};
