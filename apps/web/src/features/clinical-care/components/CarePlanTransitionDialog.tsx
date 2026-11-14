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
import { AlertCircle, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { CarePlanLifecycleState, UserRole } from '@lrms/shared';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';

interface CarePlanTransitionDialogProps {
  admissionId: string;
  carePlanId: string;
  currentState: CarePlanLifecycleState;
  userRole?: UserRole;
  isOpen: boolean;
  onClose: () => void;
  onTransitioned: () => void;
}

export const CarePlanTransitionDialog: React.FC<CarePlanTransitionDialogProps> = ({
  admissionId,
  carePlanId,
  currentState,
  userRole,
  isOpen,
  onClose,
  onTransitioned,
}) => {
  const [targetState, setTargetState] = useState<CarePlanLifecycleState>(
    currentState === CarePlanLifecycleState.DRAFT
      ? CarePlanLifecycleState.PENDING_APPROVAL
      : CarePlanLifecycleState.ACTIVE,
  );
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available transitions per current state
  const getAvailableTransitions = (): CarePlanLifecycleState[] => {
    switch (currentState) {
      case CarePlanLifecycleState.DRAFT:
        return [CarePlanLifecycleState.PENDING_APPROVAL, CarePlanLifecycleState.CANCELLED];
      case CarePlanLifecycleState.PENDING_APPROVAL:
        return [
          CarePlanLifecycleState.ACTIVE,
          CarePlanLifecycleState.DRAFT,
          CarePlanLifecycleState.CANCELLED,
        ];
      case CarePlanLifecycleState.ACTIVE:
        return [
          CarePlanLifecycleState.REVIEW_REQUIRED,
          CarePlanLifecycleState.ON_HOLD,
          CarePlanLifecycleState.COMPLETED,
          CarePlanLifecycleState.CANCELLED,
        ];
      case CarePlanLifecycleState.REVIEW_REQUIRED:
        return [
          CarePlanLifecycleState.ACTIVE,
          CarePlanLifecycleState.ON_HOLD,
          CarePlanLifecycleState.CANCELLED,
        ];
      case CarePlanLifecycleState.ON_HOLD:
        return [
          CarePlanLifecycleState.ACTIVE,
          CarePlanLifecycleState.COMPLETED,
          CarePlanLifecycleState.CANCELLED,
        ];
      default:
        return [];
    }
  };

  const available = getAvailableTransitions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (targetState === CarePlanLifecycleState.ACTIVE && userRole !== UserRole.DOCTOR) {
      setErrorMsg(
        'Separation of Duties: Only Medical Doctors can approve a care plan into ACTIVE status.',
      );
      return;
    }

    setLoading(true);
    try {
      await clinicalCareApi.transitionCarePlan(admissionId, carePlanId, {
        targetState,
        reason: reason.trim() || undefined,
      });
      onTransitioned();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || err.message || 'Failed to transition care plan state',
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
            <ArrowRightLeft className="h-5 w-5" />
            <DialogTitle>Transition Care Plan State</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            Current State: <strong className="uppercase">{currentState.replace(/_/g, ' ')}</strong>
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
            <Label htmlFor="target-state" className="text-xs font-semibold">
              Target State <span className="text-red-500">*</span>
            </Label>
            <select
              id="target-state"
              value={targetState}
              onChange={(e) => setTargetState(e.target.value as CarePlanLifecycleState)}
              className="w-full text-xs p-2.5 border rounded-md bg-background"
              required
            >
              {available.map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {targetState === CarePlanLifecycleState.ACTIVE && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Doctor clinical approval required to activate care plan.</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="transition-reason" className="text-xs font-semibold">
              Clinical Justification / Transition Reason
            </Label>
            <textarea
              id="transition-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Rationale for this care plan state transition..."
              className="w-full text-xs p-2.5 border rounded-md"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              Confirm Transition
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
