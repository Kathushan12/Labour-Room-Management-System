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
import { AlertCircle, FilePlus2, Send } from 'lucide-react';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';
import { colomboInputToIso } from '../../../lib/datetime.js';

interface CarePlanCreateDialogProps {
  admissionId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CarePlanCreateDialog: React.FC<CarePlanCreateDialogProps> = ({
  admissionId,
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [assessmentSummary, setAssessmentSummary] = useState('');
  const [clinicalConcerns, setClinicalConcerns] = useState('');
  const [objectives, setObjectives] = useState('');
  const [plannedActions, setPlannedActions] = useState('');
  const [submitForApproval, setSubmitForApproval] = useState(false);
  const [plannedReviewAt, setPlannedReviewAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    setLoading(true);
    try {
      await clinicalCareApi.createCarePlan(admissionId, {
        title: title.trim(),
        assessmentSummary: assessmentSummary.trim(),
        clinicalConcerns: clinicalConcerns.trim() || undefined,
        objectives: objectives.trim(),
        plannedActions: plannedActions.trim(),
        submitForApproval,
        plannedReviewAt: plannedReviewAt ? colomboInputToIso(plannedReviewAt) : undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || err.message || 'Failed to create clinical care plan',
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
            <FilePlus2 className="h-5 w-5" />
            <DialogTitle>Formulate Clinical Care Plan</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            Draft a structured clinical care plan for this admission episode. Care plans require
            Doctor approval to become ACTIVE.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-left">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="plan-title" className="text-xs font-semibold">
              Care Plan Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Active Labour Management & Fetal Monitoring Plan"
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="plan-assessment" className="text-xs font-semibold">
              Clinical Assessment Summary <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="plan-assessment"
              rows={3}
              value={assessmentSummary}
              onChange={(e) => setAssessmentSummary(e.target.value)}
              placeholder="Baseline obstetric assessment, cervical dilatation, contraction frequency..."
              required
              className="w-full text-xs p-2.5 border rounded-md"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="plan-concerns" className="text-xs font-semibold">
              Clinical Concerns / Risk Flags
            </Label>
            <Input
              id="plan-concerns"
              value={clinicalConcerns}
              onChange={(e) => setClinicalConcerns(e.target.value)}
              placeholder="e.g. Gestational diabetes, borderline elevated BP..."
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-objectives" className="text-xs font-semibold">
                Clinical Objectives <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="plan-objectives"
                rows={3}
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="Target maternal & fetal parameters..."
                required
                className="w-full text-xs p-2.5 border rounded-md"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="plan-actions" className="text-xs font-semibold">
                Planned Interventions <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="plan-actions"
                rows={3}
                value={plannedActions}
                onChange={(e) => setPlannedActions(e.target.value)}
                placeholder="Monitoring intervals, examinations, supportive care..."
                required
                className="w-full text-xs p-2.5 border rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="plan-review-time" className="text-xs font-semibold">
              Planned Review Date & Time
            </Label>
            <Input
              id="plan-review-time"
              type="datetime-local"
              value={plannedReviewAt}
              onChange={(e) => setPlannedReviewAt(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="submit-approval"
              checked={submitForApproval}
              onChange={(e) => setSubmitForApproval(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="submit-approval" className="text-xs font-medium cursor-pointer">
              Submit immediately for Medical Officer / Consultant approval
            </Label>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {submitForApproval ? (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Submit for Approval
                </>
              ) : (
                'Save as Draft'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
