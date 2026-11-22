import React, { useState } from 'react';
import { AuthorizeMaternalDischargeInput, DischargeDestination } from '@lrms/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { AlertCircle, BedDouble, CheckCircle2, Loader2 } from 'lucide-react';

const DESTINATION_LABELS: Record<DischargeDestination, string> = {
  [DischargeDestination.POSTNATAL]: 'Postnatal ward',
  [DischargeDestination.ANTENATAL]: 'Antenatal ward',
  [DischargeDestination.THEATRE]: 'Theatre',
  [DischargeDestination.ICU]: 'ICU',
  [DischargeDestination.OTHER]: 'Other',
};

interface MaternalDischargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admissionReferenceId: string;
  hasActiveBed: boolean;
  onSubmit: (input: AuthorizeMaternalDischargeInput) => Promise<void>;
}

export const MaternalDischargeModal: React.FC<MaternalDischargeModalProps> = ({
  open,
  onOpenChange,
  admissionReferenceId,
  hasActiveBed,
  onSubmit,
}) => {
  const [dischargeDestination, setDischargeDestination] = useState<DischargeDestination>(
    DischargeDestination.POSTNATAL,
  );
  const [maternalCondition, setMaternalCondition] = useState('Stable, afebrile, lochia normal');
  const [dischargeSummary, setDischargeSummary] = useState(
    'Uncomplicated delivery and satisfactory postpartum recovery. Vitals stable.',
  );
  const [followUpInstructions, setFollowUpInstructions] = useState(
    'Postnatal clinic review in 2 weeks at MOH. Return immediately if fever or heavy bleeding.',
  );
  const [confirming, setConfirming] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);

      if (!maternalCondition || maternalCondition.trim().length < 2) {
        setErrorMsg('Maternal clinical condition summary is required.');
        return;
      }
      if (maternalCondition.length > 50) {
        setErrorMsg('Maternal condition summary must not exceed 50 characters.');
        return;
      }
      if (!dischargeSummary || dischargeSummary.trim().length < 10) {
        setErrorMsg('Discharge summary must be at least 10 characters.');
        return;
      }
      if (!followUpInstructions || followUpInstructions.trim().length < 5) {
        setErrorMsg('Follow-up instructions must be at least 5 characters.');
        return;
      }

      // SAF-4: discharge needs an explicit second confirmation naming the patient.
      if (!confirming) {
        setConfirming(true);
        return;
      }

      setSubmitting(true);
      await onSubmit({
        dischargeDestination,
        maternalCondition: maternalCondition.trim(),
        dischargeSummary: dischargeSummary.trim(),
        followUpInstructions: followUpInstructions.trim(),
      });

      setConfirming(false);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authorize maternal discharge.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Authorize Maternal Discharge — {admissionReferenceId}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Closes the admission. The bed is sent for cleaning.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="discharge-destination" className="text-xs">
              Discharge / Transfer Destination *
            </Label>
            <select
              id="discharge-destination"
              value={dischargeDestination}
              onChange={(e) => {
                setDischargeDestination(e.target.value as DischargeDestination);
                setConfirming(false);
              }}
              className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
            >
              {Object.values(DischargeDestination).map((d) => (
                <option key={d} value={d}>
                  {DESTINATION_LABELS[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Maternal Condition at Discharge (Max 50 chars) *</Label>
            <Input
              type="text"
              maxLength={50}
              value={maternalCondition}
              onChange={(e) => setMaternalCondition(e.target.value)}
              placeholder="e.g. Stable, afebrile, lochia normal"
              required
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Clinical Discharge Summary *</Label>
            <textarea
              rows={3}
              value={dischargeSummary}
              onChange={(e) => setDischargeSummary(e.target.value)}
              placeholder="Detailed maternal clinical course, delivery outcome, and recovery assessment..."
              required
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Follow-Up & Emergency Instructions *</Label>
            <textarea
              rows={2}
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              placeholder="Postnatal clinic dates, medication instructions, danger signs..."
              required
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
          </div>

          {hasActiveBed && (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 rounded-lg flex items-center gap-2 text-xs font-semibold text-teal-900 dark:text-teal-200">
              <BedDouble className="w-3.5 h-3.5 shrink-0" />
              The bed will be set to CLEANING when you discharge.
            </div>
          )}

          {confirming && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900"
            >
              <strong>Confirm discharge of {admissionReferenceId}</strong> to{' '}
              {DESTINATION_LABELS[dischargeDestination]}? The admission becomes read-only.
            </div>
          )}

          {/* Independent Discharge Notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200 text-xs">
            <strong>Independent Clinical Discharge Governance:</strong> Authorizing maternal
            discharge does NOT automatically discharge linked newborns. Newborns remain{' '}
            <code>IN_CARE</code> until separately authorized by a paediatrician/doctor.
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (confirming ? setConfirming(false) : onOpenChange(false))}
              disabled={submitting}
            >
              {confirming ? 'Back' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirming ? 'Confirm Discharge' : 'Discharge Patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
