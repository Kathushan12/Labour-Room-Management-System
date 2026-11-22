import React, { useState } from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { FilterBar } from '../../components/shared/FilterBar.js';
import { EscalationReason, Permission } from '@lrms/shared';
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
import { PermissionGuard } from '../../components/auth/PermissionGuard.js';
import { clinicalCareApi } from '../../services/clinical-care.api.js';
import { useClinicalDashboardData } from '../dashboard/useClinicalDashboardData.js';
import { categoryLabel, isPendingAlert, receiptStateOf, severityOf } from './alert-feed.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useAlertStateRefresh } from '../../hooks/useRealtimeNotifications.js';
import { AlertReceiptStepper } from './components/AlertReceiptStepper.js';

const REASON_OPTIONS: { value: EscalationReason; label: string }[] = [
  { value: EscalationReason.FETAL_DISTRESS, label: 'Fetal distress' },
  { value: EscalationReason.FAILURE_TO_PROGRESS, label: 'Failure to progress' },
  { value: EscalationReason.MATERNAL_COMPLICATION, label: 'Maternal complication' },
  { value: EscalationReason.OTHER, label: 'Other' },
];

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
    ?.message || fallback;

export const EmergencyAlertsPage: React.FC = () => {
  const { user } = useAuth();
  const { admissions, alerts, loading, error, wardId, reload, refresh } =
    useClinicalDashboardData();
  useAlertStateRefresh(refresh, { wardId });
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isEscalateOpen, setIsEscalateOpen] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [selectedAdmission, setSelectedAdmission] = useState('');
  const [reason, setReason] = useState<EscalationReason>(EscalationReason.FETAL_DISTRESS);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);

  const unacknowledgedCount = alerts.filter(isPendingAlert).length;
  const acknowledgedCount = alerts.filter((a) => a.acknowledgedAt !== null).length;

  const filteredAlerts = alerts.filter((alert) => {
    const needle = search.toLowerCase();
    const matchesSearch =
      search.trim() === '' ||
      alert.admissionReferenceId.toLowerCase().includes(needle) ||
      (alert.bedNumber ?? '').toLowerCase().includes(needle) ||
      alert.clinicalReason.toLowerCase().includes(needle) ||
      alert.category.toLowerCase().includes(needle);

    let matchesFilter = true;
    if (filter === 'UNACKNOWLEDGED') matchesFilter = isPendingAlert(alert);
    else if (filter === 'ACKNOWLEDGED') matchesFilter = alert.acknowledgedAt !== null;

    return matchesSearch && matchesFilter;
  });

  const handleAcknowledge = async (admissionId: string, escalationId: string) => {
    setActionError(null);
    try {
      await clinicalCareApi.acknowledgeEscalation(admissionId, escalationId);
      reload();
    } catch (err) {
      setActionError(errorMessage(err, 'Failed to acknowledge the alert.'));
    }
  };

  const handleOpenEscalate = () => {
    setActionError(null);
    setSelectedAdmission(admissions[0]?.id ?? '');
    setMessage('');
    setConfirming(false);
    setIsEscalateOpen(true);
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    // REQ-6.2 / SAF-4: second step confirms the patient by Ref ID and bed.
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await clinicalCareApi.createEscalation(selectedAdmission, {
        reason,
        clinicalReason: message.trim() || null,
      });
      setIsEscalateOpen(false);
      reload();
    } catch (err) {
      setActionError(errorMessage(err, 'Failed to dispatch the alert.'));
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
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
          <PermissionGuard permission={Permission.ESCALATIONS_CREATE}>
            <Button
              onClick={handleOpenEscalate}
              className="bg-red-700 hover:bg-red-800 text-white font-semibold text-xs shadow-sm"
            >
              <BellRing className="w-4 h-4 mr-1.5" />
              Escalate Emergency Doctor Alert
            </Button>
          </PermissionGuard>
        }
      />

      {(error || actionError) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          {actionError || error}
        </div>
      )}

      {/* 3-State Delivery Proof Explainer */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Alert progress
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start space-x-3">
            <Send className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">1. Dispatched</span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Alert sent to the attending doctor
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/60 flex items-start space-x-3">
            <Smartphone className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-900">2. Delivered</span>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Alert received on the doctor's device
              </p>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-900">3. Acknowledged</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Doctor confirmed and is responding
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Escalations"
          value={loading ? '…' : alerts.length}
          subtitle="During active shift"
          icon={<BellRing className="w-5 h-5 text-slate-700" />}
        />
        <StatCard
          title="Pending Acknowledgment"
          value={loading ? '…' : unacknowledgedCount}
          subtitle="Immediate doctor action needed"
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
        />
        <StatCard
          title="Doctor Acknowledged"
          value={loading ? '…' : acknowledgedCount}
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
            {!loading && filteredAlerts.length === 0 && (
              <p className="text-xs text-slate-500">No alerts match the current filter.</p>
            )}
            {filteredAlerts.map((alert) => {
              const isPending = isPendingAlert(alert);
              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-4 transition-all shadow-xs ${
                    isPending ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <AlertSeverityBadge severity={severityOf(alert)} />
                      <span className="font-bold text-slate-900 text-sm">
                        {categoryLabel(alert.category)}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        ({alert.admissionReferenceId} / {alert.bedNumber ?? 'No bed'})
                      </span>
                    </div>
                    <AlertReceiptBadge state={receiptStateOf(alert)} />
                  </div>

                  <p className="text-xs text-slate-800 mt-2 font-medium">{alert.clinicalReason}</p>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col lg:flex-row lg:items-start justify-between gap-3 text-[11px] text-slate-600">
                    <div className="flex-1 max-w-xl space-y-1">
                      <p>
                        Doctor:{' '}
                        <strong className="text-slate-800">
                          {alert.assignedRecipientUser?.fullName ?? 'No doctor assigned'}
                        </strong>
                        {alert.acknowledgedAt && alert.acknowledgedByUser && (
                          <> · acknowledged by {alert.acknowledgedByUser.fullName}</>
                        )}
                      </p>
                      <AlertReceiptStepper alert={alert} />
                    </div>

                    {isPending && alert.assignedRecipientUserId === user?.id && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAcknowledge(alert.admissionId, alert.id)}
                        className="text-xs font-semibold min-h-[44px] px-4"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Acknowledge
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
              Sends an immediate alert to the on-duty doctor and tracks when it is received and
              acknowledged.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAlert} className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Target Patient / Bed</Label>
              <select
                value={selectedAdmission}
                onChange={(e) => {
                  setSelectedAdmission(e.target.value);
                  setConfirming(false);
                }}
                className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {admissions.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.bedNumber ?? 'No bed'} — {adm.admissionReferenceId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Reason</Label>
              <select
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value as EscalationReason);
                  setConfirming(false);
                }}
                className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Note (optional)</Label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional bedside note"
                className="mt-1 text-xs"
              />
            </div>

            <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-[11px] text-red-900">
              <strong>Emergency Notification Channel: </strong>
              <span>
                Sent to the attending doctor (or the on-duty ward doctor). If it is not
                acknowledged within the ward alert timeout, this screen shows TIMED-OUT with the
                doctor's phone number.
              </span>
            </div>

            {confirming && (
              <div
                role="alert"
                className="rounded-md bg-red-100 border border-red-400 p-2.5 text-[11px] text-red-900"
              >
                <strong>
                  Confirm escalation of{' '}
                  {(() => {
                    const adm = admissions.find((a) => a.id === selectedAdmission);
                    return adm
                      ? `${adm.admissionReferenceId} (bed ${adm.bedNumber ?? 'none'})`
                      : 'this patient';
                  })()}
                </strong>{' '}
                to EMERGENCY_CESAREAN?
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => (confirming ? setConfirming(false) : setIsEscalateOpen(false))}
              >
                {confirming ? 'Back' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                className="font-semibold"
                disabled={submitting || !selectedAdmission}
              >
                {submitting ? 'Dispatching...' : confirming ? 'Confirm Escalation' : 'Escalate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
