import React from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { Stethoscope, BellRing, HeartPulse, Baby, AlertTriangle } from 'lucide-react';
import { AdmissionCategoryBadge, AlertReceiptBadge } from '../../components/status/Badges.js';
import { WardDutyStatusBanner } from './components/WardDutyStatusBanner.js';
import { Button } from '../../components/ui/button.js';
import { Link } from 'react-router-dom';
import { useClinicalDashboardData } from './useClinicalDashboardData.js';
import { categoryLabel, isPendingAlert, receiptStateOf } from '../alerts/alert-feed.js';
import { formatColomboTime } from '../../lib/datetime.js';
import { useAlertStateRefresh } from '../../hooks/useRealtimeNotifications.js';
import { humanizeEnum } from '../../lib/labels.js';

export const DoctorDashboard: React.FC = () => {
  const { admissions, alerts, loading, error, wardId, reload, refresh } =
    useClinicalDashboardData();
  useAlertStateRefresh(refresh, { wardId });
  const pendingAlerts = alerts.filter(isPendingAlert);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Doctor Clinical Station"
        description="Assigned patient admissions, high-priority emergency alerts, observation review, and care-plan progression."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Doctor Dashboard', active: true },
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

      {pendingAlerts.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50/70 p-4 shadow-sm animate-in fade-in-50">
          <div className="flex items-start space-x-3">
            <div className="rounded-full bg-red-100 p-2 text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-red-900">
                  Active Emergency Alert ({pendingAlerts.length} Unacknowledged)
                </h3>
                <span className="text-xs bg-red-200 text-red-900 font-semibold px-2 py-0.5 rounded-full">
                  Immediate Action Required
                </span>
              </div>
              <p className="text-xs text-red-800 mt-1">
                {pendingAlerts[0].clinicalReason} (Bed: {pendingAlerts[0].bedNumber ?? 'Unassigned'}
                , Ref: {pendingAlerts[0].admissionReferenceId})
              </p>
            </div>
            <Link to="/alerts">
              <Button size="sm" variant="destructive" className="text-xs shrink-0 font-semibold">
                Review & Acknowledge
              </Button>
            </Link>
          </div>
        </div>
      )}

      <WardDutyStatusBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Patients"
          value={loading ? '…' : admissions.length}
          subtitle="Direct clinical responsibility"
          icon={<Stethoscope className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          title="Emergency Alerts"
          value={loading ? '…' : pendingAlerts.length}
          subtitle="Pending acknowledgement"
          icon={<BellRing className="w-5 h-5 text-red-600" />}
        />
        <StatCard
          title="Maternal Observations"
          value="Review"
          subtitle="Open an admission to see vitals"
          icon={<HeartPulse className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Fetal Monitoring"
          value="Review"
          subtitle="Open an admission to see partogram"
          icon={<Baby className="w-5 h-5 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="My Assigned Patient Admissions"
            description="Active admissions where you are the responsible doctor"
            action={
              <Link to="/admissions">
                <Button variant="outline" size="sm" className="text-xs">
                  All Admissions
                </Button>
              </Link>
            }
          >
            <div className="space-y-3">
              {!loading && admissions.length === 0 && !error && (
                <p className="text-xs text-slate-500">No active admissions are assigned to you.</p>
              )}
              {admissions.map((admission) => (
                <div
                  key={admission.id}
                  className="p-4 rounded-lg border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {admission.admissionReferenceId}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
                        {admission.bedNumber || 'No Bed Assigned'}
                      </span>
                      <AdmissionCategoryBadge category={admission.admissionCategory} />
                    </div>
                    <p className="text-xs text-slate-600">
                      Admitted {formatColomboTime(admission.admittedAt)} &bull;{' '}
                      {humanizeEnum(admission.currentCarePlan)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {admission.riskFlags
                        .filter((f) => f.isActive)
                        .map((flag) => (
                          <span
                            key={flag.id}
                            className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-medium"
                          >
                            {flag.label}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Link to={`/admissions/${admission.id}`}>
                      <Button variant="default" size="sm" className="text-xs">
                        Open Admission
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Observation Review Shortlinks"
            description="Direct vital tracking inspection"
          >
            <div className="space-y-2">
              <Link to="/observations/maternal" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10">
                  <HeartPulse className="w-4 h-4 mr-2 text-teal-600" />
                  Maternal Blood Pressure & Glucose
                </Button>
              </Link>
              <Link to="/observations/fetal" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10">
                  <Baby className="w-4 h-4 mr-2 text-purple-600" />
                  Fetal Heart Rate & Partogram
                </Button>
              </Link>
              <Link to="/alerts" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10">
                  <BellRing className="w-4 h-4 mr-2 text-red-600" />
                  Emergency Alert Escalations
                </Button>
              </Link>
            </div>
          </SectionCard>

          <SectionCard title="Recent Alert Dispatch Log" description="Proof-of-receipt tracking">
            <div className="space-y-2.5">
              {!loading && alerts.length === 0 && (
                <p className="text-xs text-slate-500">No alerts for your patients.</p>
              )}
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded border border-slate-100 bg-slate-50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {alert.bedNumber ?? alert.admissionReferenceId}
                    </span>
                    <AlertReceiptBadge state={receiptStateOf(alert)} />
                  </div>
                  <p className="text-[11px] text-slate-600 truncate">
                    {categoryLabel(alert.category)}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
