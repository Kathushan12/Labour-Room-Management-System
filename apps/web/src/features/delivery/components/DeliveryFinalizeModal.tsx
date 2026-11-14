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
import { AlertCircle, Lock, Loader2 } from 'lucide-react';

interface DeliveryFinalizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryReferenceId: string;
  onFinalize: (clinicalSummary?: string) => Promise<void>;
}

export const DeliveryFinalizeModal: React.FC<DeliveryFinalizeModalProps> = ({
  open,
  onOpenChange,
  deliveryReferenceId,
  onFinalize,
}) => {
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await onFinalize(summary || undefined);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to finalize delivery record.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            Finalize Delivery Record
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Locking delivery {deliveryReferenceId}. Finalized records require an explicit clinical
            amendment justification for future edits.
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
            <Label className="text-xs">Clinical Summary / Debriefing Note (Optional)</Label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Uncomplicated second stage. Both twins delivered alive with good neonatal transition..."
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
          </div>

          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs">
            Finalization transitions the delivery from DRAFT to FINALIZED and notifies the ward
            clinical team.
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
              Confirm Finalize
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
