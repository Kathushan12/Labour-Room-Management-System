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
import { AlertCircle, CheckSquare, Stethoscope } from 'lucide-react';
import { CarePlanReviewOutcome } from '@lrms/shared';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';

interface CarePlanReviewDialogProps {
  admissionId: string;
  carePlanId: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewed: () => void;
}

export const CarePlanReviewDialog: React.FC<CarePlanReviewDialogProps> = ({
  admissionId,
  carePlanId,
  isOpen,
  onClose,
  onReviewed,
}) => {
  const [reviewOutcome, setReviewOutcome] = useState<CarePlanReviewOutcome>(
    CarePlanReviewOutcome.APPROPRIATE_CONTINUE,
  );
  const [reviewNotes, setReviewNotes] = useState('');
  const [nextReviewAt, setNextReviewAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (reviewNotes.trim().length < 10) {
      setErrorMsg('Review notes must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await clinicalCareApi.recordCarePlanReview(admissionId, carePlanId, {
        reviewOutcome,
        reviewNotes: reviewNotes.trim(),
        nextReviewAt: nextReviewAt ? new Date(nextReviewAt).toISOString() : undefined,
      });
      onReviewed();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to record clinical care plan review',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Stethoscope className="h-5 w-5" />
            <DialogTitle>Record Clinical Care Plan Review</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            Document formal clinical review and assess continued appropriateness of this plan.
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
            <Label htmlFor="review-outcome" className="text-xs font-semibold">
              Review Outcome Assessment <span className="text-red-500">*</span>
            </Label>
            <select
              id="review-outcome"
              value={reviewOutcome}
              onChange={(e) => setReviewOutcome(e.target.value as CarePlanReviewOutcome)}
              className="w-full text-xs p-2.5 border rounded-md bg-background"
              required
            >
              <option value={CarePlanReviewOutcome.APPROPRIATE_CONTINUE}>
                Appropriate - Continue Current Plan
              </option>
              <option value={CarePlanReviewOutcome.MODIFICATION_REQUIRED}>
                Modification Required (Flag for Amendment)
              </option>
              <option value={CarePlanReviewOutcome.ESCALATION_REQUIRED}>
                Escalation Required (Senior Clinical Review)
              </option>
              <option value={CarePlanReviewOutcome.DISCONTINUED}>
                Discontinued (Delivery / Transfer / Superseded)
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="review-notes" className="text-xs font-semibold">
              Clinical Review Notes <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="review-notes"
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Clinical evaluation, fetal heart reactivity, maternal vital response..."
              required
              className="w-full text-xs p-2.5 border rounded-md"
            />
            <span className="text-[10px] text-muted-foreground block text-right">
              {reviewNotes.trim().length}/10 chars min
            </span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="next-review-time" className="text-xs font-semibold">
              Next Scheduled Review Time
            </Label>
            <Input
              id="next-review-time"
              type="datetime-local"
              value={nextReviewAt}
              onChange={(e) => setNextReviewAt(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading || reviewNotes.trim().length < 10}>
              <CheckSquare className="h-4 w-4 mr-1.5" />
              Save Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
