import React from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { Stethoscope, BellRing, HeartPulse, Baby, AlertTriangle } from 'lucide-react';
import { PREVIEW_ADMISSIONS, PREVIEW_ALERTS } from '../../mocks/ui-preview/preview-data.js';
import { AdmissionCategoryBadge, AlertReceiptBadge } from '../../components/status/Badges.js';
import { WardDutyStatusBanner } from './components/WardDutyStatusBanner.js';
import { Button } from '../../components/ui/button.js';
import { Link } from 'react-router-dom';

export const DoctorDashboard: React.FC = () => {
  const activeAlerts = PREVIEW_ALERTS.filter((a) => a.acknowledgedAt === null);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Doctor Clinical Station"
        description="Assigned patient admissions, high-priority emergency alerts, observation review, and care-plan progression."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Doctor Dashboard', active: true },
        ]}
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            DOCTOR VIEW (UI PREVIEW)
          </span>
        }
      />

      {/* Critical Alerts Banner (High Visual Priority) */}
      {activeAlerts.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50/70 p-4 shadow-sm animate-in fade-in-50">
          <div className="flex items-start space-x-3">
            <div className="rounded-full bg-red-100 p-2 text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-red-900">
                  Active Emergency Alert ({activeAlerts.length} Unacknowledged)
                </h3>
                <span className="text-xs bg-red-200 text-red-900 font-semibold px-2 py-0.5 rounded-full">
                  Immediate Action Required
                </span>
              </div>
              <p className="text-xs text-red-800 mt-1">
                {activeAlerts[0].message} (Bed: {activeAlerts[0].bedNumber}, Ref:{' '}
                {activeAlerts[0].admissionRef})
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

      {/* Real-time Ward Duty & Responsibility Status */}
      <WardDutyStatusBanner />

      {/* Doctor KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Patients"
          value={PREVIEW_ADMISSIONS.length}
          subtitle="Direct clinical responsibility"
          icon={<Stethoscope className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          title="Emergency Alerts"
          value={activeAlerts.length}
          subtitle="Pending acknowledgement"
          icon={<BellRing className="w-5 h-5 text-red-600" />}
        />
        <StatCard
          title="Maternal Observations"
          value="Up to date"
          subtitle="Regular vitals logged"
          icon={<HeartPulse className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Fetal Monitoring"
          value="3 Active"
          subtitle="Partogram recordings active"
          icon={<Baby className="w-5 h-5 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Patients List */}
        <div className="lg:col-span-2">
          <SectionCard
            title="My Assigned Patient Admissions"
            description="Patients under active obstetric care in Ward 18"
            action={
              <Link to="/admissions">
                <Button variant="outline" size="sm" className="text-xs">
                  All Admissions
                </Button>
              </Link>
            }
          >
            <div className="space-y-3">
              {PREVIEW_ADMISSIONS.map((admission) => (
                <div
                  key={admission.id}
                  className="p-4 rounded-lg border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">
                        {admission.referenceId}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded">
                        {admission.bedNumber || 'No Bed Assigned'}
                      </span>
                      <AdmissionCategoryBadge category={admission.category} />
                    </div>
                    <p className="text-xs text-slate-600">
                      {admission.patientPlaceholder} &bull; Primary Midwife:{' '}
                      {admission.assignedNurse}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {admission.riskFlags.map((flag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-medium"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Link to="/observations/maternal">
                      <Button variant="outline" size="sm" className="text-xs">
                        Review Vitals
                      </Button>
                    </Link>
                    <Link to="/admissions">
                      <Button variant="default" size="sm" className="text-xs">
                        Care Plan
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Clinical Quick Navigation */}
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
              {PREVIEW_ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded border border-slate-100 bg-slate-50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{alert.bedNumber}</span>
                    <AlertReceiptBadge state={alert.receiptState} />
                  </div>
                  <p className="text-[11px] text-slate-600 truncate">{alert.alertType}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
