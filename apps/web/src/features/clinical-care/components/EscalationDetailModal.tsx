import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog.js';
import { Button } from '../../../components/ui/button.js';
import { Badge } from '../../../components/ui/badge.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  ShieldCheck,
  User,
} from 'lucide-react';
import { ClinicalEscalationDto, EscalationStatus, UserRole } from '@lrms/shared';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { AlertReceiptStepper } from '../../alerts/components/AlertReceiptStepper.js';
import { formatColomboDateTime, formatColomboTime } from '../../../lib/datetime.js';
import { humanizeEnum } from '../../../lib/labels.js';

interface EscalationDetailModalProps {
  admissionId: string;
  escalation: ClinicalEscalationDto;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const EscalationDetailModal: React.FC<EscalationDetailModalProps> = ({
  admissionId,
  escalation,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth();
  const [actionTab, setActionTab] = useState<'view' | 'resolve' | 'transition'>('view');
  const [responseNotes, setResponseNotes] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState<EscalationStatus>(EscalationStatus.UNDER_REVIEW);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [confirmReverse, setConfirmReverse] = useState(false);

  // REQ-6.6: only a doctor reverses an emergency escalation, with a reason.
  const canReverse =
    user?.role === UserRole.DOCTOR && Boolean(escalation.reason) && !escalation.reversedAt;

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reverseReason.trim().length < 5) {
      setErrorMsg('Give a reason of at least 5 characters for the reversal.');
      return;
    }
    if (!confirmReverse) {
      setConfirmReverse(true);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await clinicalCareApi.reverseEscalation(admissionId, escalation.id, {
        reason: reverseReason.trim(),
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message);
      setConfirmReverse(false);
    } finally {
      setLoading(false);
    }
  };

  const isTerminal =
    escalation.status === EscalationStatus.RESOLVED ||
    escalation.status === EscalationStatus.CLOSED ||
    escalation.status === EscalationStatus.CANCELLED;

  const handleAcknowledge = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await clinicalCareApi.acknowledgeEscalation(admissionId, escalation.id, {
        notes: 'Acknowledged at bedside',
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await clinicalCareApi.transitionEscalation(admissionId, escalation.id, {
        targetStatus,
        notes: transitionNotes.trim() || undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (responseNotes.trim().length < 10) {
      setErrorMsg('Clinical response notes must be at least 10 characters.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await clinicalCareApi.resolveEscalation(admissionId, escalation.id, {
        clinicalResponseNotes: responseNotes.trim(),
        closureReason: closureReason.trim() || undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Clinical Escalation #{escalation.escalationReferenceId}</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            Review detailed timeline, assigned clinical responder, and manage escalation lifecycle.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4 text-left text-xs pt-1">
          {/* Status & Priority Overview */}
          <div className="p-3 bg-muted/40 border rounded-md flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-semibold">
                {humanizeEnum(escalation.category)}
              </Badge>
              <Badge
                className={
                  escalation.priority === 'EMERGENCY'
                    ? 'bg-red-600 text-white'
                    : escalation.priority === 'URGENT'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-600 text-white'
                }
              >
                {humanizeEnum(escalation.priority)}
              </Badge>
              <Badge className="bg-primary text-primary-foreground">
                {humanizeEnum(escalation.status)}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Logged: {formatColomboDateTime(escalation.createdAt)}
            </span>
          </div>

          {/* Reason */}
          <div className="p-3 bg-card border rounded-md space-y-1">
            <span className="font-semibold text-muted-foreground block">Clinical Reason:</span>
            <p className="text-foreground font-medium">{escalation.clinicalReason}</p>
          </div>

          {/* Assignee / Response Attribution */}
          <div className="grid grid-cols-2 gap-3 text-muted-foreground text-[11px]">
            <div>
              Initiated by: <strong>{escalation.initiatedByUser?.fullName}</strong>
            </div>
            <div>
              Assigned to:{' '}
              <strong>
                {escalation.assignedRecipientUser?.fullName || 'Unassigned (On-call Doctor)'}
              </strong>
            </div>
            {escalation.acknowledgedAt && (
              <div>
                Acknowledged: <strong>{formatColomboTime(escalation.acknowledgedAt)}</strong> by{' '}
                {escalation.acknowledgedByUser?.fullName}
              </div>
            )}
            {escalation.resolvedAt && (
              <div>
                Resolved: <strong>{formatColomboTime(escalation.resolvedAt)}</strong> by{' '}
                {escalation.resolvedByUser?.fullName}
              </div>
            )}
          </div>

          {escalation.clinicalResponseNotes && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md space-y-1">
              <span className="font-semibold block flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Resolution Response:
              </span>
              <p>{escalation.clinicalResponseNotes}</p>
            </div>
          )}

          <AlertReceiptStepper alert={escalation} className="p-3 border rounded-md" />

          {escalation.reversedAt && (
            <div className="p-3 bg-slate-50 border rounded-md text-[11px]">
              <strong>Escalation reversed</strong> {formatColomboDateTime(escalation.reversedAt)}:{' '}
              {escalation.reversalReason}
            </div>
          )}

          {canReverse && (
            <form onSubmit={handleReverse} className="p-3 border rounded-md space-y-2 bg-muted/20">
              <Label htmlFor="esc-reverse-reason">Reverse escalation (doctor)</Label>
              <Input
                id="esc-reverse-reason"
                value={reverseReason}
                onChange={(e) => {
                  setReverseReason(e.target.value);
                  setConfirmReverse(false);
                }}
                placeholder="Reason, e.g. CTG recovered after repositioning"
                className="text-xs"
              />
              {confirmReverse && (
                <p role="alert" className="text-[11px] text-red-800">
                  Confirm: return this patient to the previous care plan?
                </p>
              )}
              <Button type="submit" size="sm" variant="outline" disabled={loading}>
                {confirmReverse ? 'Confirm Reversal' : 'Reverse Escalation'}
              </Button>
            </form>
          )}

          {/* Timeline History */}
          {escalation.history && escalation.history.length > 0 && (
            <div className="p-3 bg-muted/30 border rounded-md space-y-2">
              <span className="font-semibold flex items-center gap-1 text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Lifecycle Timeline History
              </span>
              <div className="space-y-1.5">
                {escalation.history.map((h) => (
                  <div
                    key={h.id}
                    className="p-2 border rounded bg-background flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-1"
                  >
                    <div>
                      <span className="font-medium">
                        {h.fromStatus ? `${humanizeEnum(h.fromStatus)} → ` : ''}
                        <strong>{humanizeEnum(h.toStatus)}</strong>
                      </span>
                      {h.reason && <span className="text-muted-foreground ml-2">({h.reason})</span>}
                      {h.notes && <p className="text-muted-foreground mt-0.5">{h.notes}</p>}
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {formatColomboTime(h.createdAt)} · {h.changedByUser?.fullName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Tabs if Not Terminal */}
          {!isTerminal && (
            <div className="border-t pt-3 space-y-3">
              <div className="flex gap-2">
                {escalation.status === EscalationStatus.OPEN &&
                  escalation.assignedRecipientUserId === user?.id && (
                    <Button
                      type="button"
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={handleAcknowledge}
                      disabled={loading}
                      data-testid="btn-ack-in-modal"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Acknowledge Escalation
                    </Button>
                  )}
                <Button
                  type="button"
                  size="sm"
                  variant={actionTab === 'transition' ? 'default' : 'outline'}
                  onClick={() => setActionTab('transition')}
                >
                  Update Status
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={actionTab === 'resolve' ? 'default' : 'outline'}
                  onClick={() => setActionTab('resolve')}
                >
                  Resolve Escalation
                </Button>
              </div>

              {actionTab === 'transition' && (
                <form
                  onSubmit={handleTransition}
                  className="p-3 border rounded-md space-y-3 bg-muted/20"
                >
                  <div className="space-y-1">
                    <Label htmlFor="target-esc-status">Target Status</Label>
                    <select
                      id="target-esc-status"
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value as EscalationStatus)}
                      className="w-full text-xs p-2 border rounded-md bg-background"
                    >
                      <option value={EscalationStatus.UNDER_REVIEW}>Under Review</option>
                      <option value={EscalationStatus.ACTION_IN_PROGRESS}>
                        Action In Progress
                      </option>
                      <option value={EscalationStatus.ESCALATED}>Escalate Further</option>
                      <option value={EscalationStatus.CANCELLED}>Cancel Escalation</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="esc-transition-notes">Notes</Label>
                    <Input
                      id="esc-transition-notes"
                      value={transitionNotes}
                      onChange={(e) => setTransitionNotes(e.target.value)}
                      placeholder="Bedside examination details or action taken..."
                      className="text-xs"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={loading}>
                    Confirm Status Change
                  </Button>
                </form>
              )}

              {actionTab === 'resolve' && (
                <form
                  onSubmit={handleResolve}
                  className="p-3 border rounded-md space-y-3 bg-muted/20"
                >
                  <div className="space-y-1">
                    <Label htmlFor="res-notes">
                      Clinical Response & Stabilisation Details{' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <textarea
                      id="res-notes"
                      rows={2}
                      value={responseNotes}
                      onChange={(e) => setResponseNotes(e.target.value)}
                      placeholder="e.g. Intravenous fluid bolus administered, fetal heart recovered to 140 bpm..."
                      required
                      className="w-full text-xs p-2 border rounded-md"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="res-closure">Closure Reason</Label>
                    <Input
                      id="res-closure"
                      value={closureReason}
                      onChange={(e) => setClosureReason(e.target.value)}
                      placeholder="e.g. Maternal BP stabilized"
                      className="text-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={loading || responseNotes.trim().length < 10}
                  >
                    Confirm Resolution
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
