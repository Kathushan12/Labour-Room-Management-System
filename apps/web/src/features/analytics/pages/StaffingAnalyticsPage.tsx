import React, { useState, useEffect, useCallback } from 'react';
import {
  AnalyticsDateRangePreset,
  StaffingAnalyticsDto,
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
import { AnalyticsDataTable, ColumnDef } from '../components/AnalyticsDataTable.js';
import { AnalyticsLoadingSkeleton, AnalyticsErrorAlert } from '../components/AnalyticsStates.js';
import { PermissionGuard } from '../../../components/auth/PermissionGuard.js';
import { ReportExportDialog } from '../components/ReportExportDialog.js';
import { Users, Stethoscope, Clock, ShieldCheck, Download, CalendarCheck } from 'lucide-react';
import { humanizeEnum } from '../../../lib/labels.js';

export const StaffingAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    preset: AnalyticsDateRangePreset.THIS_MONTH,
  });
  const [data, setData] = useState<StaffingAnalyticsDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getStaffingAnalytics(filters);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load staffing analytics');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const workloadColumns: ColumnDef<any>[] = [
    {
      key: 'staffName',
      header: 'Staff Member',
      render: (row) => <span className="font-semibold text-slate-900">{row.staffName}</span>,
    },
    {
      key: 'staffRegistrationId',
      header: 'SLMC Registration',
      render: (row) => (
        <span className="font-mono text-slate-600">{row.staffRegistrationId || '—'}</span>
      ),
    },
    {
      key: 'activeAssignedAdmissions',
      header: 'Active Inpatients',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
          {row.activeAssignedAdmissions} patients
        </span>
      ),
    },
    {
      key: 'scheduledShiftsCount',
      header: 'Shifts Scheduled',
      align: 'right',
      render: (row) => <span>{row.scheduledShiftsCount} shifts</span>,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" data-testid="staffing-analytics-page">
      <PageHeader
        title="Clinical Staffing, Roster Coverage & Workload Distribution"
        description="Duty roster coverage rates, active clinical on-duty personnel, and current patient caseload distribution across doctors and nursing staff for Ward 18."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Operational Analytics', href: '/analytics' },
          { label: 'Staffing & Coverage', active: true },
        ]}
        action={
          <PermissionGuard permission={Permission.ANALYTICS_EXPORT}>
            <Button
              size="sm"
              onClick={() => setIsExportOpen(true)}
              className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export Staffing Roster
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
      {isLoading && <AnalyticsLoadingSkeleton kpiCount={5} />}

      {!isLoading && data && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <AnalyticsKpiCard
              title="Registered Doctors"
              value={data.totalActiveDoctors}
              subtitle="Active medical officers"
              icon={<Stethoscope className="w-5 h-5 text-slate-700" />}
              iconBgColor="bg-slate-100"
            />
            <AnalyticsKpiCard
              title="Registered Nurses"
              value={data.totalActiveNurses}
              subtitle="Active nursing staff"
              icon={<Users className="w-5 h-5 text-teal-700" />}
              iconBgColor="bg-teal-50"
            />
            <AnalyticsKpiCard
              title="On Duty Doctors"
              value={data.currentOnDutyDoctorsCount}
              subtitle="Currently in Ward 18"
              icon={<Stethoscope className="w-5 h-5 text-blue-700" />}
              iconBgColor="bg-blue-50"
            />
            <AnalyticsKpiCard
              title="On Duty Nurses"
              value={data.currentOnDutyNursesCount}
              subtitle="Currently in Ward 18"
              icon={<Users className="w-5 h-5 text-emerald-700" />}
              iconBgColor="bg-emerald-50"
            />
            <AnalyticsKpiCard
              title="Scheduled Shifts"
              value={data.totalScheduledShifts}
              subtitle="Total duty slots planned"
              icon={<CalendarCheck className="w-5 h-5 text-indigo-700" />}
              iconBgColor="bg-indigo-50"
            />
          </div>

          {/* Shifts by Shift Type */}
          <SectionCard
            title="Scheduled Shifts by Shift Interval"
            description="Distribution of Morning, Evening, and Night duty shifts"
          >
            <AnalyticsBarChart
              data={data.shiftsByType.map((st: { shiftType: string; count: number }) => ({
                label: humanizeEnum(st.shiftType),
                value: st.count,
                color: st.shiftType.includes('MORNING')
                  ? '#0d9488'
                  : st.shiftType.includes('EVENING')
                    ? '#f59e0b'
                    : '#1e3a8a',
              }))}
              unit="shifts"
            />
          </SectionCard>

          {/* Caseload Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Obstetric Medical Officer Caseload"
              description="Active inpatient assignments for medical officers and registrars"
            >
              <AnalyticsDataTable
                columns={workloadColumns}
                data={data.doctorWorkload}
                emptyText="No active patient assignments for doctors"
                maxHeight="320px"
              />
            </SectionCard>

            <SectionCard
              title="Nursing & Midwifery Staff Caseload"
              description="Bedside maternal and fetal monitoring patient distribution"
            >
              <AnalyticsDataTable
                columns={workloadColumns}
                data={data.nurseWorkload}
                emptyText="No active patient assignments for nursing staff"
                maxHeight="320px"
              />
            </SectionCard>
          </div>
        </div>
      )}

      <PermissionGuard permission={Permission.ANALYTICS_EXPORT}>
        <ReportExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          defaultReportType={OperationalReportType.STAFF_WORKLOAD}
          defaultPreset={filters.preset}
          defaultWardId={filters.wardId}
        />
      </PermissionGuard>
    </div>
  );
};
