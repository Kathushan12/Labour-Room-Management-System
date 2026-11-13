import React, { useState } from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { FilterBar } from '../../components/shared/FilterBar.js';
import {
  PREVIEW_ALERTS,
  PREVIEW_ADMISSIONS,
  PreviewAlert,
} from '../../mocks/ui-preview/preview-data.js';
import { AlertReceiptState, AlertSeverity } from '@lrms/shared';
import { AlertSeverityBadge, AlertReceiptBadge } from '../../components/status/Badges.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog.js';
import { BellRing, AlertTriangle, CheckCircle2, Send, Smartphone } from 'lucide-react';

export const EmergencyAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<PreviewAlert[]>(PREVIEW_ALERTS);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isEscalateOpen, setIsEscalateOpen] = useState<boolean>(false);

  // New Alert Form state
  const [selectedAdmission, setSelectedAdmission] = useState(PREVIEW_ADMISSIONS[0].id);
  const [alertType, setAlertType] = useState('FETAL_HEART_RATE_DECELERATION');
  const [message, setMessage] = useState('Persistent fetal bradycardia observed on CTG.');

  const unacknowledgedCount = alerts.filter((a) => a.acknowledgedAt === null).length;
  const acknowledgedCount = alerts.filter((a) => a.acknowledgedAt !== null).length;

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      search.trim() === '' ||
      alert.admissionRef.toLowerCase().includes(search.toLowerCase()) ||
      alert.bedNumber.toLowerCase().includes(search.toLowerCase()) ||
      alert.message.toLowerCase().includes(search.toLowerCase()) ||
      alert.alertType.toLowerCase().includes(search.toLowerCase());

    let matchesFilter = true;
    if (filter === 'UNACKNOWLEDGED') matchesFilter = alert.acknowledgedAt === null;
    else if (filter === 'ACKNOWLEDGED') matchesFilter = alert.acknowledgedAt !== null;

    return matchesSearch && matchesFilter;
  });

  const handleAcknowledge = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              receiptState: AlertReceiptState.ACKNOWLEDGED,
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: 'Dr. Jayawardena (Active Session)',
            }
          : a,
      ),
    );
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const adm = PREVIEW_ADMISSIONS.find((a) => a.id === selectedAdmission) || PREVIEW_ADMISSIONS[0];
    const newAlert: PreviewAlert = {
      id: `alt-${Date.now()}`,
      admissionRef: adm.referenceId,
      bedNumber: adm.bedNumber || 'BED-XX',
      alertType,
      severity: AlertSeverity.EMERGENCY,
      receiptState: AlertReceiptState.DELIVERED,
      message,
      dispatchedAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      acknowledgedAt: null,
      acknowledgedBy: null,
    };
    setAlerts([newAlert, ...alerts]);
    setIsEscalateOpen(false);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Emergency Alerts & Proof-of-Receipt"
        description="Audit-grade doctor notifications with 3-state delivery tracking (Dispatched → Delivered → Acknowledged)."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Emergency Alerts', active: true },
        ]}
        action={
          <Button
            onClick={() => setIsEscalateOpen(true)}
            className="bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-sm"
          >
            <BellRing className="w-4 h-4 mr-1.5" />
            Escalate Emergency Doctor Alert
          </Button>
        }
      />

      {/* 3-State Delivery Proof Explainer */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Three-State Proof-of-Receipt Lifecycle Protocol
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start space-x-3">
            <Send className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">1. Dispatched</span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Outbox record committed and socket push stream broadcasted to assigned doctor
                channel.
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/60 flex items-start space-x-3">
            <Smartphone className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-900">2. Delivered</span>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Doctor device received packet and sent automated transport ACK to the server.
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-900">3. Acknowledged</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Doctor explicitly confirmed clinical review. Timestamp and doctor ID sealed in audit
                trail.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Escalations"
          value={alerts.length}
          subtitle="During active shift"
          icon={<BellRing className="w-5 h-5 text-slate-700" />}
        />
        <StatCard
          title="Pending Acknowledgment"
          value={unacknowledgedCount}
          subtitle="Immediate doctor action needed"
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        />
        <StatCard
          title="Doctor Acknowledged"
          value={acknowledgedCount}
          subtitle="Closed loop confirmed"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Alert Feed */}
      <SectionCard
        title="Emergency Escalation Log"
        description="Comprehensive dispatch and acknowledgement timeline"
      >
        <div className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by bed, reference ID, or alert..."
            filterOptions={[
              { label: 'All Alerts', value: 'ALL' },
              { label: 'Pending Acknowledgment', value: 'UNACKNOWLEDGED' },
              { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
            ]}
            selectedFilter={filter}
            onFilterChange={setFilter}
            onReset={() => {
              setSearch('');
              setFilter('ALL');
            }}
          />

          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const isPending = alert.acknowledgedAt === null;
              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-4 transition-all shadow-xs ${
                    isPending ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <AlertSeverityBadge severity={alert.severity} />
                      <span className="font-bold text-slate-900 text-sm">{alert.alertType}</span>
                      <span className="font-mono text-xs text-slate-500">
                        ({alert.admissionRef} / {alert.bedNumber})
                      </span>
                    </div>
                    <AlertReceiptBadge state={alert.receiptState} />
                  </div>

                  <p className="text-xs text-slate-800 mt-2 font-medium">{alert.message}</p>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="space-x-4">
                      <span>
                        Dispatched:{' '}
                        <strong className="text-slate-700">
                          {new Date(alert.dispatchedAt).toLocaleTimeString()}
                        </strong>
                      </span>
                      {alert.deliveredAt && (
                        <span>
                          Delivered:{' '}
                          <strong className="text-slate-700">
                            {new Date(alert.deliveredAt).toLocaleTimeString()}
                          </strong>
                        </span>
                      )}
                      {alert.acknowledgedAt && (
                        <span>
                          Acknowledged:{' '}
                          <strong className="text-emerald-800">
                            {new Date(alert.acknowledgedAt).toLocaleTimeString()} by{' '}
                            {alert.acknowledgedBy}
                          </strong>
                        </span>
                      )}
                    </div>

                    {isPending && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAcknowledge(alert.id)}
                        className="text-xs font-semibold h-7 px-3"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Acknowledge Alert as Attending Doctor
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Escalate Dialog */}
      <Dialog open={isEscalateOpen} onOpenChange={setIsEscalateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-900 flex items-center space-x-2">
              <BellRing className="w-5 h-5 text-red-600" />
              <span>Escalate Clinical Emergency Alert</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Dispatches an immediate notification to the on-duty doctor device with transport
              proof-of-receipt tracking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAlert} className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Target Patient / Bed</Label>
              <select
                value={selectedAdmission}
                onChange={(e) => setSelectedAdmission(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {PREVIEW_ADMISSIONS.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.bedNumber} — {adm.referenceId} ({adm.patientPlaceholder})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Emergency Alert Type</Label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="FETAL_HEART_RATE_DECELERATION">
                  Fetal Heart Rate Deceleration / Distress
                </option>
                <option value="EMERGENCY_CESAREAN_ESCALATION">
                  Emergency Cesarean Escalation Required
                </option>
                <option value="POSTPARTUM_HEMORRHAGE">Postpartum Hemorrhage (PPH)</option>
                <option value="SEVERE_PREECLAMPSIA">Severe Preeclampsia / Eclampsia Warning</option>
                <option value="CORD_PROLAPSE">Umbilical Cord Prolapse</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Clinical Reason & Situation
              </Label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 text-xs"
                required
              />
            </div>

            <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-[11px] text-red-900">
              <strong>Emergency Notification Channel: </strong>
              <span>
                Dispatches to primary attending doctor and duty obstetric registrar. Escalation
                timers track 3-minute acknowledge SLA.
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEscalateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="destructive" className="font-semibold">
                Dispatch Emergency Alert
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
