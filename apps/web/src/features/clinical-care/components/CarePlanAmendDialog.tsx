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
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { AlertCircle, FileEdit, History } from 'lucide-react';
import { ClinicalCarePlanDto } from '@lrms/shared';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';
import { colomboInputToIso, toColomboInput } from '../../../lib/datetime.js';

interface CarePlanAmendDialogProps {
  admissionId: string;
  plan: ClinicalCarePlanDto;
  isOpen: boolean;
  onClose: () => void;
  onAmended: () => void;
}

export const CarePlanAmendDialog: React.FC<CarePlanAmendDialogProps> = ({
  admissionId,
  plan,
  isOpen,
  onClose,
  onAmended,
}) => {
  const currentVer = plan.currentVersion;

  const [title, setTitle] = useState(currentVer?.title || '');
  const [assessmentSummary, setAssessmentSummary] = useState(currentVer?.assessmentSummary || '');
  const [clinicalConcerns, setClinicalConcerns] = useState(currentVer?.clinicalConcerns || '');
  const [objectives, setObjectives] = useState(currentVer?.objectives || '');
  const [plannedActions, setPlannedActions] = useState(currentVer?.plannedActions || '');
  const [changeReason, setChangeReason] = useState('');
  const [plannedReviewAt, setPlannedReviewAt] = useState(
    plan.plannedReviewAt ? toColomboInput(plan.plannedReviewAt) : '',
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (changeReason.trim().length < 10) {
      setErrorMsg('Mandatory amendment reason must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await clinicalCareApi.amendCarePlan(admissionId, plan.id, {
        title: title.trim(),
        assessmentSummary: assessmentSummary.trim(),
        clinicalConcerns: clinicalConcerns.trim() || undefined,
        objectives: objectives.trim(),
        plannedActions: plannedActions.trim(),
        changeReason: changeReason.trim(),
        plannedReviewAt: plannedReviewAt ? colomboInputToIso(plannedReviewAt) : undefined,
      });
      onAmended();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || err.message || 'Failed to amend clinical care plan',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <FileEdit className="h-5 w-5" />
            <DialogTitle>
              Amend Care Plan (Creates Version {plan.currentVersionNumber + 1})
            </DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            Approved care plans cannot be directly modified. Amending creates an immutable new
            version preserving complete clinical revision history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-left">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs space-y-1">
            <Label
              htmlFor="change-reason"
              className="font-semibold text-amber-900 flex items-center gap-1"
            >
              <History className="h-3.5 w-3.5" /> Clinical Justification for Amendment{' '}
              <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="change-reason"
              rows={2}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. Cervical dilatation plateaued at 6cm for 4 hours; initiating oxytocin augmentation..."
              required
              className="w-full text-xs p-2 border rounded-md"
            />
            <span className="text-[10px] text-amber-700 block text-right">
              {changeReason.trim().length}/10 chars min
            </span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="amend-title" className="text-xs font-semibold">
              Care Plan Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amend-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="amend-assessment" className="text-xs font-semibold">
              Updated Clinical Assessment <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="amend-assessment"
              rows={3}
              value={assessmentSummary}
              onChange={(e) => setAssessmentSummary(e.target.value)}
              required
              className="w-full text-xs p-2.5 border rounded-md"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="amend-concerns" className="text-xs font-semibold">
              Updated Clinical Concerns / Risk Factors
            </Label>
            <textarea
              id="amend-concerns"
              rows={2}
              value={clinicalConcerns}
              onChange={(e) => setClinicalConcerns(e.target.value)}
              placeholder="e.g. Meconium stained liquor grade 1, maternal exhaustion..."
              className="w-full text-xs p-2.5 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amend-objectives" className="text-xs font-semibold">
                Updated Objectives <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="amend-objectives"
                rows={3}
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                required
                className="w-full text-xs p-2.5 border rounded-md"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="amend-actions" className="text-xs font-semibold">
                Updated Planned Actions <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="amend-actions"
                rows={3}
                value={plannedActions}
                onChange={(e) => setPlannedActions(e.target.value)}
                required
                className="w-full text-xs p-2.5 border rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="amend-review-time" className="text-xs font-semibold">
              Next Planned Review Time
            </Label>
            <Input
              id="amend-review-time"
              type="datetime-local"
              value={plannedReviewAt}
              onChange={(e) => setPlannedReviewAt(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading || changeReason.trim().length < 10}>
              Commit Version {plan.currentVersionNumber + 1}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
