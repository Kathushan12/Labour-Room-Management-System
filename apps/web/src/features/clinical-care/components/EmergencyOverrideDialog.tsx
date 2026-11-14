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
import { AlertCircle, Lock, ShieldAlert, Timer } from 'lucide-react';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';

interface EmergencyOverrideDialogProps {
  admissionId: string;
  isOpen: boolean;
  onClose: () => void;
  onOverrideGranted: () => void;
}

export const EmergencyOverrideDialog: React.FC<EmergencyOverrideDialogProps> = ({
  admissionId,
  isOpen,
  onClose,
  onOverrideGranted,
}) => {
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (reason.trim().length < 15) {
      setErrorMsg('Clinical justification must be at least 15 characters to prevent abuse.');
      return;
    }

    setLoading(true);
    try {
      await clinicalCareApi.requestEmergencyOverride(admissionId, {
        reason: reason.trim(),
        overrideDurationMinutes: durationMinutes,
      });
      onOverrideGranted();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to record emergency break-glass override',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
            <DialogTitle>Declare Break-Glass Emergency Access</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs pt-1">
            Break-glass access allows unassigned clinicians to immediately inspect and document
            clinical care in emergency situations. All access is{' '}
            <strong>strictly audited, time-bounded, and reviewed by clinical governance</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1 text-left">
            <Label htmlFor="override-reason" className="text-xs font-semibold">
              Emergency Clinical Justification <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="override-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Acute fetal distress on night rounds while primary doctor is scrubbed in theatre..."
              className="w-full text-xs p-2.5 border rounded-md focus:ring-2 focus:ring-rose-500"
              required
            />
            <span className="text-[10px] text-muted-foreground block text-right">
              {reason.trim().length}/15 chars minimum
            </span>
          </div>

          <div className="space-y-1 text-left">
            <Label
              htmlFor="override-duration"
              className="text-xs font-semibold flex items-center gap-1"
            >
              <Timer className="h-3.5 w-3.5" /> Emergency Window Duration
            </Label>
            <select
              id="override-duration"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full text-xs p-2 border rounded-md bg-background"
            >
              <option value={15}>15 Minutes (Rapid resuscitation)</option>
              <option value={30}>30 Minutes (Immediate assessment)</option>
              <option value={60}>60 Minutes (Standard emergency window)</option>
              <option value={120}>120 Minutes (Extended night review)</option>
              <option value={240}>240 Minutes (Duty shift coverage)</option>
            </select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              disabled={loading || reason.trim().length < 15}
            >
              <Lock className="h-4 w-4 mr-1.5" />
              {loading ? 'Authorizing Access...' : 'Authorize Emergency Access'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
