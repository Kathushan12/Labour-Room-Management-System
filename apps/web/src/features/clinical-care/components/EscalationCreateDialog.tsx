import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog.js';
import { Button } from '../../../components/ui/button.js';
import { Label } from '../../../components/ui/label.js';
import { AlertCircle, AlertTriangle, Send } from 'lucide-react';
import {
  AlreadyEscalatedDetails,
  ClinicalObservationType,
  EscalationReason,
} from '@lrms/shared';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';
import { fetchAdmissionDetail } from '../../../services/admissions.api.js';
import { fetchAdmissionBedHistory } from '../../../services/beds.api.js';

interface EscalationCreateDialogProps {
  admissionId: string;
  sourceObservationType?: ClinicalObservationType | null;
  sourceObservationId?: string | null;
  sourceObservationSummary?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const REASON_LABELS: Record<EscalationReason, string> = {
  [EscalationReason.FETAL_DISTRESS]: 'Fetal distress',
  [EscalationReason.FAILURE_TO_PROGRESS]: 'Failure to progress',
  [EscalationReason.MATERNAL_COMPLICATION]: 'Maternal complication',
  [EscalationReason.OTHER]: 'Other',
};

const ALERT_STATE_LABELS: Record<string, string> = {
  DISPATCHED: 'Dispatched (not yet on the doctor device)',
  DELIVERED: 'Delivered to the doctor device',
  ACKNOWLEDGED: 'Acknowledged by the doctor',
};

// REQ-6.2: one action (choose reason, Escalate) plus one confirmation.
export const EscalationCreateDialog: React.FC<EscalationCreateDialogProps> = ({
  admissionId,
  sourceObservationType,
  sourceObservationId,
  sourceObservationSummary,
  isOpen,
  onClose,
  onCreated,
}) => {
  const [reason, setReason] = useState<EscalationReason>(
    sourceObservationType === ClinicalObservationType.MATERNAL
      ? EscalationReason.MATERNAL_COMPLICATION
      : EscalationReason.FETAL_DISTRESS,
  );
  const [note, setNote] = useState(sourceObservationSummary ?? '');
  const [confirming, setConfirming] = useState(false);
  const [refId, setRefId] = useState<string | null>(null);
  const [bedNumber, setBedNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [existing, setExisting] = useState<AlreadyEscalatedDetails | null>(null);

  // SAF-4 / SAF-5: the confirmation names the patient by Admission Ref ID and bed.
  useEffect(() => {
    if (!isOpen) return;
    void fetchAdmissionDetail(admissionId).then((r) => setRefId(r.data?.admissionReferenceId ?? null));
    void fetchAdmissionBedHistory(admissionId).then((r) => {
      const active = r.data?.items.find((a) => !a.releasedAt);
      setBedNumber(active?.bedNumber ?? null);
    });
  }, [isOpen, admissionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (reason === EscalationReason.OTHER && note.trim().length === 0) {
      setErrorMsg('Describe the reason when you choose Other.');
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    try {
      await clinicalCareApi.createEscalation(admissionId, {
        reason,
        clinicalReason: note.trim() || null,
        sourceObservationType: sourceObservationType || undefined,
        sourceObservationId: sourceObservationId || undefined,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const body = (
        err as {
          response?: { data?: { error?: { code?: string; message?: string; details?: unknown } } };
        }
      ).response?.data?.error;
      if (body?.code === 'ALREADY_ESCALATED') {
        setExisting((body.details as AlreadyEscalatedDetails | undefined) ?? null);
      }
      setErrorMsg(body?.message || (err as Error).message || 'Failed to escalate');
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  const patientLabel = `${refId ?? 'this patient'}${bedNumber ? ` (bed ${bedNumber})` : ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Escalate to Emergency Cesarean</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            {patientLabel}: changes the care plan to EMERGENCY_CESAREAN and alerts the attending
            doctor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-left">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start gap-2"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                {errorMsg}
                {existing && (
                  <>
                    <br />
                    Current alert {existing.escalationReferenceId}:{' '}
                    <strong>
                      {existing.timedOut
                        ? 'TIMED OUT - phone the doctor'
                        : (ALERT_STATE_LABELS[existing.alertState] ?? existing.alertState)}
                    </strong>
                  </>
                )}
              </span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="esc-reason-code" className="text-xs font-semibold">
              Reason <span className="text-red-500">*</span>
            </Label>
            <select
              id="esc-reason-code"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value as EscalationReason);
                setConfirming(false);
              }}
              className="w-full text-xs p-2.5 border rounded-md bg-background min-h-[44px]"
              required
            >
              {Object.values(EscalationReason).map((r) => (
                <option key={r} value={r}>
                  {REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="esc-reason" className="text-xs font-semibold">
              Note {reason === EscalationReason.OTHER && <span className="text-red-500">*</span>}
            </Label>
            <textarea
              id="esc-reason"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional bedside note"
              className="w-full text-xs p-2.5 border rounded-md"
            />
          </div>

          {confirming && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-300 rounded-md text-xs text-red-900"
            >
              <strong>Confirm escalation of {patientLabel}</strong> for{' '}
              {REASON_LABELS[reason].toLowerCase()}?
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (confirming ? setConfirming(false) : onClose())}
              disabled={loading}
              className="min-h-[44px]"
            >
              {confirming ? 'Back' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-red-700 hover:bg-red-800 text-white font-medium min-h-[44px]"
              disabled={loading}
              data-testid="btn-submit-escalation"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {confirming ? 'Confirm Escalation' : 'Escalate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
