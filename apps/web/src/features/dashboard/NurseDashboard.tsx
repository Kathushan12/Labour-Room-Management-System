import React from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import {
  HeartPulse,
  Baby,
  BedDouble,
  UserPlus,
  BellRing,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  AdmissionCategoryBadge,
  BedStatusBadge,
  AlertReceiptBadge,
} from '../../components/status/Badges.js';
import { WardDutyStatusBanner } from './components/WardDutyStatusBanner.js';
import { Button } from '../../components/ui/button.js';
import { Link } from 'react-router-dom';
import { useClinicalDashboardData } from './useClinicalDashboardData.js';
import {
  categoryLabel,
  isPendingAlert,
  isTimedOutAlert,
  receiptStateOf,
} from '../alerts/alert-feed.js';
import { formatColomboTime } from '../../lib/datetime.js';
import { useAlertStateRefresh } from '../../hooks/useRealtimeNotifications.js';
import {
  AlertReceiptStepper,
  CallDoctorWarning,
} from '../alerts/components/AlertReceiptStepper.js';
import { humanizeEnum } from '../../lib/labels.js';

export const NurseDashboard: React.FC = () => {
  const { admissions, bedBoard, alerts, loading, error, wardId, reload, refresh } =
    useClinicalDashboardData();
  useAlertStateRefresh(refresh, { wardId });
  const activeAlerts = alerts.filter(isPendingAlert);
  const timedOutAlerts = alerts.filter(isTimedOutAlert);
  const beds = bedBoard?.beds ?? [];
  const cleaningBeds = bedBoard?.cleaningBedsCount ?? 0;
  const availableBeds = bedBoard?.availableBedsCount ?? 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Midwife & Nursing Clinical Station"
        description="Rapid triage, patient admissions, vital observation recording, bed turnover management, and emergency escalation."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Nurse Dashboard', active: true },
        ]}
      />

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          <span>{error}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={reload}>
            Retry
          </Button>
        </div>
      )}

      {/* Critical Alert Ribbon if unacknowledged */}
      {activeAlerts.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50/70 p-4 shadow-sm animate-in fade-in-50">
          <div className="flex items-start space-x-3">
            <div className="rounded-full bg-red-100 p-2 text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-red-900">
                  Doctor Notification Dispatched ({activeAlerts.length} Active Alert)
                </h3>
                <span className="text-xs bg-red-200 text-red-900 font-semibold px-2 py-0.5 rounded-full">
                  Doctor Delivery Tracked
                </span>
              </div>
              <p className="text-xs text-red-800 mt-1">
                {activeAlerts[0].clinicalReason} (Bed: {activeAlerts[0].bedNumber ?? 'Unassigned'},
                Ref: {activeAlerts[0].admissionReferenceId})
              </p>
              {timedOutAlerts.map((alert) => (
                <div key={alert.id} className="mt-2">
                  <p className="text-[11px] font-semibold text-red-900">
                    {alert.admissionReferenceId} · Bed {alert.bedNumber ?? '—'}
                  </p>
                  <CallDoctorWarning
                    noDoctor={false}
                    recipientName={alert.assignedRecipientUser?.fullName}
                    contactNumber={alert.recipientContactNumber}
                  />
                </div>
              ))}
            </div>
            <Link to="/alerts">
              <Button size="sm" variant="destructive" className="text-xs shrink-0 font-semibold">
                View Proof-of-Receipt
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Real-time Ward Duty & Responsibility Status */}
      <WardDutyStatusBanner />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Labour Inpatients"
          value={loading ? '…' : admissions.length}
          subtitle="Currently admitted in ward"
          icon={<HeartPulse className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          title="Available Ready Beds"
          value={loading ? '…' : availableBeds}
          subtitle="Cleaned & sanitized"
          icon={<BedDouble className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Beds in Turnover"
          value={loading ? '…' : cleaningBeds}
          subtitle="Awaiting sanitization & check"
          icon={<Sparkles className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Doctor Escalations"
          value={loading ? '…' : alerts.length}
          subtitle={`${activeAlerts.length} pending acknowledgement`}
          icon={<BellRing className="w-5 h-5 text-red-600" />}
        />
      </div>

      {/* Quick Action Shortcuts */}
      <SectionCard
        title="Immediate Clinical Actions"
        description="Direct shortcuts for shift workflows"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link to="/admissions" className="block">
            <Button
              variant="outline"
              className="w-full h-16 flex flex-col items-center justify-center gap-1.5 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50"
            >
              <UserPlus className="w-5 h-5 text-teal-700" />
              <span className="text-xs font-semibold text-slate-800">Rapid Triage</span>
            </Button>
          </Link>
          <Link to="/observations/maternal" className="block">
            <Button
              variant="outline"
              className="w-full h-16 flex flex-col items-center justify-center gap-1.5 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50"
            >
              <HeartPulse className="w-5 h-5 text-teal-700" />
              <span className="text-xs font-semibold text-slate-800">Maternal Vitals</span>
            </Button>
          </Link>
          <Link to="/observations/fetal" className="block">
            <Button
              variant="outline"
              className="w-full h-16 flex flex-col items-center justify-center gap-1.5 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50"
            >
              <Baby className="w-5 h-5 text-purple-700" />
              <span className="text-xs font-semibold text-slate-800">Fetal Monitoring</span>
            </Button>
          </Link>
          <Link to="/beds" className="block">
            <Button
              variant="outline"
              className="w-full h-16 flex flex-col items-center justify-center gap-1.5 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50"
            >
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-semibold text-slate-800">Bed Cleaning</span>
            </Button>
          </Link>
          <Link to="/alerts" className="block">
            <Button
              variant="outline"
              className="w-full h-16 flex flex-col items-center justify-center gap-1.5 border-red-200 hover:border-red-500 hover:bg-red-50/50"
            >
              <BellRing className="w-5 h-5 text-red-600" />
              <span className="text-xs font-semibold text-red-900">Escalate Alert</span>
            </Button>
          </Link>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Patients Table */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Assigned Inpatient Monitoring"
            description="Active labour room admissions requiring routine nurse monitoring"
            action={
              <Link to="/admissions">
                <Button variant="ghost" size="sm" className="text-xs text-teal-700">
                  All Admissions →
                </Button>
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="pb-2.5">Bed / Ref</th>
                    <th className="pb-2.5">Category</th>
                    <th className="pb-2.5">Care Plan</th>
                    <th className="pb-2.5">Admitted</th>
                    <th className="pb-2.5">Risk Flags</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!loading && admissions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-slate-500">
                        No active admissions are assigned to you.
                      </td>
                    </tr>
                  )}
                  {admissions.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-900">{adm.bedNumber ?? 'No bed'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {adm.admissionReferenceId}
                        </div>
                      </td>
                      <td className="py-3">
                        <AdmissionCategoryBadge category={adm.admissionCategory} />
                      </td>
                      <td className="py-3">
                        <span className="font-medium text-slate-700">
                          {humanizeEnum(adm.currentCarePlan)}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">{formatColomboTime(adm.admittedAt)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {adm.riskFlags
                            .filter((rf) => rf.isActive)
                            .map((rf) => (
                              <span
                                key={rf.id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium"
                              >
                                {rf.label}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <Link to={`/admissions/${adm.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] px-2">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Bed Turnover & Doctor Dispatch Status */}
        <div className="space-y-6">
          <SectionCard
            title="Bed Turnover & Cleaning Status"
            description="Sanitization progress between discharges"
            action={
              <Link to="/beds">
                <Button variant="ghost" size="sm" className="text-xs text-teal-700">
                  Bed Board →
                </Button>
              </Link>
            }
          >
            <div className="space-y-3">
              {beds.slice(0, 5).map((bed) => (
                <div
                  key={bed.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{bed.bedNumber}</div>
                    <div className="text-[11px] text-slate-500">
                      {bed.currentAllocation?.admissionReferenceId || 'No active patient'}
                    </div>
                  </div>
                  <BedStatusBadge displayStatus={bed.displayStatus} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Active Alert Acknowledgements"
            description="Proof-of-receipt from assigned doctors"
          >
            <div className="space-y-2.5">
              {!loading && alerts.length === 0 && (
                <p className="text-xs text-slate-500">No alerts for your patients.</p>
              )}
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded border border-slate-100 bg-slate-50 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {alert.bedNumber ?? alert.admissionReferenceId}
                    </span>
                    <AlertReceiptBadge state={receiptStateOf(alert)} />
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {categoryLabel(alert.category)}: {alert.clinicalReason}
                  </p>
                  <AlertReceiptStepper alert={alert} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
