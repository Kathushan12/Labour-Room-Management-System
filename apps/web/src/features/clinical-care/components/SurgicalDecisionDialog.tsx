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
import { AlertCircle, FileCheck, Stethoscope } from 'lucide-react';
import { CaesareanDecision } from '@lrms/shared';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';

interface SurgicalDecisionDialogProps {
  admissionId: string;
  reviewId: string;
  isOpen: boolean;
  onClose: () => void;
  onDecided: () => void;
}

export const SurgicalDecisionDialog: React.FC<SurgicalDecisionDialogProps> = ({
  admissionId,
  reviewId,
  isOpen,
  onClose,
  onDecided,
}) => {
  const [caesareanDecision, setCaesareanDecision] = useState<CaesareanDecision>(
    CaesareanDecision.APPROVED_FOR_THEATRE,
  );
  const [decisionRationale, setDecisionRationale] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (decisionRationale.trim().length < 10) {
      setErrorMsg('Consultant clinical rationale must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await clinicalCareApi.recordSurgicalDecision(admissionId, reviewId, {
        caesareanDecision,
        decisionRationale: decisionRationale.trim(),
      });
      onDecided();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || err.message || 'Failed to record surgical decision',
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
            <DialogTitle>Obstetric Consultant Surgical Review Decision</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            Separation of Duties: Only medical officers / obstetric consultants can record a
            human-authorized decision regarding Caesarean section or continued trial of labour.
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
            <Label htmlFor="caesarean-decision" className="text-xs font-semibold">
              Obstetric Decision <span className="text-red-500">*</span>
            </Label>
            <select
              id="caesarean-decision"
              value={caesareanDecision}
              onChange={(e) => setCaesareanDecision(e.target.value as CaesareanDecision)}
              className="w-full text-xs p-2.5 border rounded-md bg-background"
              required
            >
              <option value={CaesareanDecision.APPROVED_FOR_THEATRE}>
                APPROVED FOR THEATRE (Emergency Caesarean Indicated)
              </option>
              <option value={CaesareanDecision.NOT_INDICATED}>
                NOT INDICATED (Continue monitored vaginal trial)
              </option>
              <option value={CaesareanDecision.DEFERRED}>
                DEFERRED (Re-evaluate in 30-60 minutes)
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="decision-rationale" className="text-xs font-semibold">
              Consultant Clinical Rationale & Indication <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="decision-rationale"
              rows={3}
              value={decisionRationale}
              onChange={(e) => setDecisionRationale(e.target.value)}
              placeholder="e.g. Category 1 / 2 Caesarean Section approved due to acute fetal distress and failed descent..."
              required
              className="w-full text-xs p-2.5 border rounded-md"
            />
            <span className="text-[10px] text-muted-foreground block text-right">
              {decisionRationale.trim().length}/10 chars min
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-primary text-primary-foreground font-medium"
              disabled={loading || decisionRationale.trim().length < 10}
              data-testid="btn-commit-surgical-decision"
            >
              <FileCheck className="h-4 w-4 mr-1.5" />
              Sign Decision
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
