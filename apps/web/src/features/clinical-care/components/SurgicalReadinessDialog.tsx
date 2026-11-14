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
import { Label } from '../../../components/ui/label.js';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  AnaesthesiaReviewStatus,
  SurgicalReviewDto,
  SurgicalReviewStatus,
  TheatreReadinessStatus,
} from '@lrms/shared';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';

interface SurgicalReadinessDialogProps {
  admissionId: string;
  review: SurgicalReviewDto;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const SurgicalReadinessDialog: React.FC<SurgicalReadinessDialogProps> = ({
  admissionId,
  review,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [anaesthesiaReviewStatus, setAnaesthesiaReviewStatus] = useState<AnaesthesiaReviewStatus>(
    review.anaesthesiaReviewStatus,
  );
  const [anaesthesiaNotes, setAnaesthesiaNotes] = useState(review.anaesthesiaNotes || '');
  const [theatreReadinessStatus, setTheatreReadinessStatus] = useState<TheatreReadinessStatus>(
    review.theatreReadinessStatus,
  );
  const [handoverNotes, setHandoverNotes] = useState(review.handoverNotes || '');
  const [markHandedOver, setMarkHandedOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    setLoading(true);
    try {
      await clinicalCareApi.updateSurgicalCoordination(admissionId, review.id, {
        anaesthesiaReviewStatus,
        anaesthesiaNotes: anaesthesiaNotes.trim() || undefined,
        theatreReadinessStatus,
        handoverNotes: handoverNotes.trim() || undefined,
        targetStatus: markHandedOver ? SurgicalReviewStatus.READY_FOR_HANDOVER : undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to update theatre coordination',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-600">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle>Theatre Coordination & Readiness Checklist</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            Review #{review.reviewReferenceId} - Multi-disciplinary Anaesthesia & Theatre
            Preparation
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
            <Label htmlFor="anaesthesia-status" className="text-xs font-semibold">
              Anaesthetic Assessment Status
            </Label>
            <select
              id="anaesthesia-status"
              value={anaesthesiaReviewStatus}
              onChange={(e) =>
                setAnaesthesiaReviewStatus(e.target.value as AnaesthesiaReviewStatus)
              }
              className="w-full text-xs p-2.5 border rounded-md bg-background"
            >
              <option value={AnaesthesiaReviewStatus.PENDING}>Pending Anaesthesia Review</option>
              <option value={AnaesthesiaReviewStatus.REVIEWED_CLEAR}>
                Reviewed & Cleared (Standard Regional/General)
              </option>
              <option value={AnaesthesiaReviewStatus.HIGH_RISK_CLEAR}>
                High Risk - Cleared with Special Measures
              </option>
              <option value={AnaesthesiaReviewStatus.FURTHER_STABILIZATION_REQUIRED}>
                Further Stabilization Required Prior to Theatre
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="anaesthesia-notes" className="text-xs font-semibold">
              Anaesthesia Notes
            </Label>
            <textarea
              id="anaesthesia-notes"
              rows={2}
              value={anaesthesiaNotes}
              onChange={(e) => setAnaesthesiaNotes(e.target.value)}
              placeholder="Airway assessment, fasting status, IV access, consent confirmed..."
              className="w-full text-xs p-2 border rounded-md"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="theatre-status" className="text-xs font-semibold">
              Operating Theatre Readiness
            </Label>
            <select
              id="theatre-status"
              value={theatreReadinessStatus}
              onChange={(e) => setTheatreReadinessStatus(e.target.value as TheatreReadinessStatus)}
              className="w-full text-xs p-2.5 border rounded-md bg-background"
            >
              <option value={TheatreReadinessStatus.NOT_INITIATED}>Not Initiated</option>
              <option value={TheatreReadinessStatus.THEATRE_NOTIFIED}>
                Theatre Team & Scrub Nurse Notified
              </option>
              <option value={TheatreReadinessStatus.PRE_OP_CHECKLIST_COMPLETE}>
                Pre-Op Checklist & Cannulation Complete
              </option>
              <option value={TheatreReadinessStatus.THEATRE_READY}>
                Operating Room Ready for Patient Transfer
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="handover-notes" className="text-xs font-semibold">
              Handover & Transfer Notes
            </Label>
            <textarea
              id="handover-notes"
              rows={2}
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="Transferring midwife notes, escort staff, handover details..."
              className="w-full text-xs p-2 border rounded-md"
            />
          </div>

          <div className="p-3 bg-muted/40 border rounded-md flex items-center space-x-2">
            <input
              type="checkbox"
              id="mark-handed-over"
              checked={markHandedOver}
              onChange={(e) => setMarkHandedOver(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="mark-handed-over" className="text-xs font-medium cursor-pointer">
              Complete Transfer & Handover to Theatre Team (Closes LRMS Workflow)
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Save Coordination Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
