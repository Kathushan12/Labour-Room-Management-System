import React, { useState } from 'react';
import { AuthorizeNewbornDischargeInput, NewbornDischargeStatus } from '@lrms/shared';
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
import { AlertCircle, Baby, CheckCircle2, Loader2 } from 'lucide-react';

interface NewbornDischargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newbornId: string;
  babyLabel: string;
  newbornReferenceId: string;
  onSubmit: (input: AuthorizeNewbornDischargeInput) => Promise<void>;
}

export const NewbornDischargeModal: React.FC<NewbornDischargeModalProps> = ({
  open,
  onOpenChange,
  newbornId,
  babyLabel,
  newbornReferenceId,
  onSubmit,
}) => {
  const [dischargeDestination, setDischargeDestination] = useState('Home with mother');
  const [newbornCondition, setNewbornCondition] = useState('Vigorous, pink, tolerating feeds');
  const [dischargeStatus, setDischargeStatus] = useState<NewbornDischargeStatus>(
    NewbornDischargeStatus.DISCHARGED_WITH_MOTHER,
  );
  const [dischargeSummary, setDischargeSummary] = useState(
    'Normal neonatal course. Stable vitals, tolerating breastfeeding well.',
  );
  const [feedingPlan, setFeedingPlan] = useState('Exclusive breastfeeding on demand.');
  const [followUpInstructions, setFollowUpInstructions] = useState(
    'Infant immunization and growth monitoring clinic at local MOH clinic.',
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);

      if (!dischargeDestination || dischargeDestination.trim().length < 2) {
        setErrorMsg('Discharge destination is required.');
        return;
      }
      if (!newbornCondition || newbornCondition.trim().length < 2) {
        setErrorMsg('Newborn condition is required.');
        return;
      }
      if (newbornCondition.length > 50) {
        setErrorMsg('Newborn condition must not exceed 50 characters.');
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

      await onSubmit({
        dischargeDestination: dischargeDestination.trim(),
        newbornCondition: newbornCondition.trim(),
        dischargeStatus,
        dischargeSummary: dischargeSummary.trim(),
        feedingPlan: feedingPlan || null,
        followUpInstructions: followUpInstructions.trim(),
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authorize infant discharge.';
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
            <Baby className="w-4 h-4 text-emerald-600" />
            Authorize Infant Discharge — {babyLabel} ({newbornReferenceId})
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Independent newborn discharge authorization by attending paediatrician / doctor.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Discharge Status *</Label>
              <select
                value={dischargeStatus}
                onChange={(e) => setDischargeStatus(e.target.value as NewbornDischargeStatus)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={NewbornDischargeStatus.DISCHARGED_WITH_MOTHER}>
                  Discharged with Mother
                </option>
                <option value={NewbornDischargeStatus.TRANSFERRED_SCBU}>Transferred to SCBU</option>
                <option value={NewbornDischargeStatus.TRANSFERRED_NICU}>Transferred to NICU</option>
                <option value={NewbornDischargeStatus.DECEASED}>Deceased</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Destination *</Label>
              <Input
                type="text"
                value={dischargeDestination}
                onChange={(e) => setDischargeDestination(e.target.value)}
                placeholder="e.g. Home with mother / SCBU Ward 19"
                required
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Infant Condition at Discharge (Max 50 chars) *</Label>
            <Input
              type="text"
              maxLength={50}
              value={newbornCondition}
              onChange={(e) => setNewbornCondition(e.target.value)}
              placeholder="e.g. Vigorous, pink, tolerating feeds"
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
              placeholder="Summary of neonatal course, birth weight, discharge weight, examination findings..."
              required
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Infant Feeding Plan</Label>
            <Input
              type="text"
              value={feedingPlan}
              onChange={(e) => setFeedingPlan(e.target.value)}
              placeholder="e.g. Exclusive breastfeeding on demand every 2-3 hours..."
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Follow-Up & Vaccination Instructions *</Label>
            <textarea
              rows={2}
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              placeholder="Neonatal clinic review dates, immunization schedule, red flags..."
              required
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Authorize Infant Discharge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
