import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertReceiptReportRow,
  AnalyticsDateRangePreset,
  ClinicalAlertAnalyticsDto,
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
import { AnalyticsDataTable, ColumnDef } from '../components/AnalyticsDataTable.js';
import { fetchWards } from '../../../services/wards.api.js';
import { formatColomboTimeWithSeconds } from '../../../lib/datetime.js';
import { humanizeEnum } from '../../../lib/labels.js';

const timeOrDash = (iso: string | null) => (iso ? formatColomboTimeWithSeconds(iso) : '—');
const secondsOrDash = (s: number | null) => (s == null ? '—' : `${s}s`);

// REQ-9.3: every alert with its proof-of-receipt times (Asia/Colombo, 24-hour).
const RECEIPT_COLUMNS: ColumnDef<AlertReceiptReportRow>[] = [
  { key: 'escalationReferenceId', header: 'Alert' },
  { key: 'admissionReferenceId', header: 'Admission Ref' },
  { key: 'bedNumber', header: 'Bed', render: (r) => r.bedNumber ?? '—' },
  { key: 'dispatchedAt', header: 'Dispatched', render: (r) => timeOrDash(r.dispatchedAt) },
  { key: 'deliveredAt', header: 'Delivered', render: (r) => timeOrDash(r.deliveredAt) },
  { key: 'acknowledgedAt', header: 'Acknowledged', render: (r) => timeOrDash(r.acknowledgedAt) },
  {
    key: 'secondsToDelivered',
    header: 'To deliver',
    align: 'right',
    render: (r) => secondsOrDash(r.secondsToDelivered),
  },
  {
    key: 'secondsToAcknowledged',
    header: 'To acknowledge',
    align: 'right',
    render: (r) => secondsOrDash(r.secondsToAcknowledged),
  },
  {
    key: 'timedOutAt',
    header: 'Timed out',
    render: (r) =>
      r.timedOutAt ? (
        <span className="inline-flex items-center gap-1 font-semibold text-red-800">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          Yes
        </span>
      ) : (
        'No'
      ),
  },
];
import { BellRing, ShieldCheck, Clock, AlertTriangle, Download, Zap } from 'lucide-react';

export const ClinicalAlertAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    preset: AnalyticsDateRangePreset.THIS_MONTH,
  });
  const [data, setData] = useState<ClinicalAlertAnalyticsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(120);

  useEffect(() => {
    void fetchWards().then((res) => {
      const ward = res.data?.items[0];
      if (ward?.alertTimeoutSeconds) setTimeoutSeconds(ward.alertTimeoutSeconds);
    });
  }, []);

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
          <PermissionGuard permission={Permission.ANALYTICS_EXPORT}>
            <Button
              size="sm"
              onClick={() => setIsExportOpen(true)}
              className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export Alert Audit Log
            </Button>
          </PermissionGuard>
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

      {!isLoading &&
        data &&
        (() => {
          const receipts = data.alertReceipts;
          const withinTimeout = receipts.alerts.filter(
            (a) => a.secondsToAcknowledged != null && a.secondsToAcknowledged <= timeoutSeconds,
          ).length;
          const compliance =
            receipts.totalAlerts > 0
              ? Math.round((withinTimeout / receipts.totalAlerts) * 1000) / 10
              : null;
          return (
            <div className="space-y-6 animate-fadeIn">
              {/* Top KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                  title="Avg Time to Acknowledge"
                  value={secondsOrDash(receipts.averageSecondsToAcknowledged)}
                  subtitle={`Avg to delivered: ${secondsOrDash(receipts.averageSecondsToDelivered)}`}
                  icon={<Clock className="w-5 h-5 text-indigo-700" />}
                  iconBgColor="bg-indigo-50"
                  target={`Ward timeout: ${timeoutSeconds}s`}
                />
                <AnalyticsKpiCard
                  title="Acknowledged in Time"
                  value={compliance !== null ? `${compliance}%` : '—'}
                  subtitle={`${receipts.timedOutCount} alert(s) timed out`}
                  icon={<ShieldCheck className="w-5 h-5 text-emerald-700" />}
                  iconBgColor="bg-emerald-50"
                  target={`Within ${timeoutSeconds}s`}
                />
              </div>

              {/* SLA Performance Card */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-teal-600" />
                      <span>Acknowledged Within the Ward Alert Timeout</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      An alert not acknowledged within {timeoutSeconds} seconds (set by the
                      administrator) shows TIMED-OUT on the ward board so staff phone the doctor.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-black text-emerald-700">{compliance ?? 0}%</span>
                    <span className="text-[11px] text-slate-500 block font-medium">
                      Compliance Rate
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (compliance ?? 0) >= 95
                        ? 'bg-emerald-600'
                        : (compliance ?? 0) >= 80
                          ? 'bg-amber-500'
                          : 'bg-rose-600'
                    }`}
                    style={{ width: `${Math.min(compliance ?? 0, 100)}%` }}
                  />
                </div>
              </div>

              <SectionCard
                title="Alert Proof-of-Receipt Times"
                description={`${receipts.totalAlerts} alerts · ${receipts.deliveredCount} delivered · ${receipts.acknowledgedCount} acknowledged · ${receipts.timedOutCount} timed out`}
              >
                <AnalyticsDataTable
                  columns={RECEIPT_COLUMNS}
                  data={receipts.alerts}
                  emptyText="No doctor alerts in this period"
                  maxHeight="420px"
                  testId="alert-receipt-table"
                />
              </SectionCard>

              {/* Severity Breakdown & Outbox Telemetry */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard
                  title="Clinical Escalation Severity Breakdown"
                  description="Proportion of alerts across severity levels"
                >
                  <AnalyticsDonutChart
                    data={data.alertsBySeverity.map((s: { severity: string; count: number }) => ({
                      label: humanizeEnum(s.severity),
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
                  title="Alert Delivery Status"
                  description="How many alerts were sent, delivered and are still waiting"
                >
                  <div className="p-4 bg-slate-50 rounded-lg space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200">
                      <span className="text-slate-600 font-medium">Total Alerts Sent</span>
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
                      <span className="text-slate-600 font-medium">Failed Deliveries</span>
                      <span className="font-bold text-slate-900">
                        {data.notificationOutboxStats.deadLetterEvents}
                      </span>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          );
        })()}

      <PermissionGuard permission={Permission.ANALYTICS_EXPORT}>
        <ReportExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          defaultReportType={OperationalReportType.CLINICAL_ALERT_RESPONSE}
          defaultPreset={filters.preset}
          defaultWardId={filters.wardId}
        />
      </PermissionGuard>
    </div>
  );
};
