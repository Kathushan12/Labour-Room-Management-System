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
import { AlertCircle, AlertTriangle, Send } from 'lucide-react';
import { ClinicalObservationType, EscalationCategory, EscalationPriority } from '@lrms/shared';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';

interface EscalationCreateDialogProps {
  admissionId: string;
  sourceObservationType?: ClinicalObservationType | null;
  sourceObservationId?: string | null;
  sourceObservationSummary?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const EscalationCreateDialog: React.FC<EscalationCreateDialogProps> = ({
  admissionId,
  sourceObservationType,
  sourceObservationId,
  sourceObservationSummary,
  isOpen,
  onClose,
  onCreated,
}) => {
  const [category, setCategory] = useState<EscalationCategory>(
    sourceObservationType === ClinicalObservationType.FETAL
      ? EscalationCategory.FETAL
      : sourceObservationType === ClinicalObservationType.MATERNAL
        ? EscalationCategory.MATERNAL
        : EscalationCategory.LABOUR_PROGRESSION,
  );
  const [priority, setPriority] = useState<EscalationPriority>(EscalationPriority.URGENT);
  const [clinicalReason, setClinicalReason] = useState(
    sourceObservationSummary ? `Escalated from observation: ${sourceObservationSummary} - ` : '',
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (clinicalReason.trim().length < 10) {
      setErrorMsg('Clinical escalation reason must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await clinicalCareApi.createEscalation(admissionId, {
        category,
        priority,
        clinicalReason: clinicalReason.trim(),
        sourceObservationType: sourceObservationType || undefined,
        sourceObservationId: sourceObservationId || undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to dispatch clinical escalation',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Initiate Structured Clinical Escalation</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            Trigger formal clinical escalation for deteriorating maternal/fetal parameters or labour
            progression arrest.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-left">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {sourceObservationId && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-md text-xs space-y-1">
              <span className="font-semibold block">Linked Source Observation:</span>
              <p className="text-[11px]">
                {sourceObservationType?.replace(/_/g, ' ')} (ID: {sourceObservationId.slice(0, 8)}
                ...)
              </p>
              {sourceObservationSummary && (
                <p className="text-[11px] text-muted-foreground">{sourceObservationSummary}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="esc-category" className="text-xs font-semibold">
                Category <span className="text-red-500">*</span>
              </Label>
              <select
                id="esc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as EscalationCategory)}
                className="w-full text-xs p-2.5 border rounded-md bg-background"
                required
              >
                <option value={EscalationCategory.MATERNAL}>Maternal</option>
                <option value={EscalationCategory.FETAL}>Fetal</option>
                <option value={EscalationCategory.LABOUR_PROGRESSION}>Labour Progression</option>
                <option value={EscalationCategory.RISK_FLAG}>Risk Flag</option>
                <option value={EscalationCategory.OBSTETRIC_EMERGENCY}>Obstetric Emergency</option>
                <option value={EscalationCategory.OTHER}>Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="esc-priority" className="text-xs font-semibold">
                Priority <span className="text-red-500">*</span>
              </Label>
              <select
                id="esc-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as EscalationPriority)}
                className="w-full text-xs p-2.5 border rounded-md bg-background"
                required
              >
                <option value={EscalationPriority.ROUTINE}>Routine</option>
                <option value={EscalationPriority.URGENT}>Urgent</option>
                <option value={EscalationPriority.EMERGENCY}>Emergency</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="esc-reason" className="text-xs font-semibold">
              Clinical Reason / Bedside Evaluation <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="esc-reason"
              rows={3}
              value={clinicalReason}
              onChange={(e) => setClinicalReason(e.target.value)}
              placeholder="e.g. FHR deceleration < 100 bpm lasting 90s; uterine hyperstimulation suspected..."
              required
              className="w-full text-xs p-2.5 border rounded-md"
            />
            <span className="text-[10px] text-muted-foreground block text-right">
              {clinicalReason.trim().length}/10 chars min
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              disabled={loading || clinicalReason.trim().length < 10}
              data-testid="btn-submit-escalation"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Dispatch Escalation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
