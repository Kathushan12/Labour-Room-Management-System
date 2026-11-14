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
import { AlertCircle, Siren } from 'lucide-react';
import { EmergencyResponseCategory } from '@lrms/shared';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';

interface EmergencyResponseDialogProps {
  admissionId: string;
  isOpen: boolean;
  onClose: () => void;
  onInitiated: () => void;
}

export const EmergencyResponseDialog: React.FC<EmergencyResponseDialogProps> = ({
  admissionId,
  isOpen,
  onClose,
  onInitiated,
}) => {
  const [category, setCategory] = useState<EmergencyResponseCategory>(
    EmergencyResponseCategory.OBSTETRIC_EMERGENCY,
  );
  const [clinicalReason, setClinicalReason] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('Obstetric Crash Team 1');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (clinicalReason.trim().length < 10) {
      setErrorMsg('Clinical emergency reason must be at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await clinicalCareApi.initiateEmergencyResponse(admissionId, {
        category,
        clinicalReason: clinicalReason.trim(),
        assignedTeam: assignedTeam.trim() || undefined,
      });
      onInitiated();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to initiate emergency response',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <Siren className="h-6 w-6 animate-pulse" />
            <DialogTitle>Mobilize Emergency Clinical Response Team</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs">
            Initiate high-priority emergency protocol for acute maternal collapse, cord prolapse,
            severe bradycardia, or massive hemorrhage.
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
            <Label htmlFor="er-category" className="text-xs font-semibold">
              Emergency Category <span className="text-red-500">*</span>
            </Label>
            <select
              id="er-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as EmergencyResponseCategory)}
              className="w-full text-xs p-2.5 border rounded-md bg-background"
              required
            >
              <option value={EmergencyResponseCategory.OBSTETRIC_EMERGENCY}>
                Obstetric Emergency (PPH, Eclampsia, Cord Prolapse)
              </option>
              <option value={EmergencyResponseCategory.FETAL_EMERGENCY}>
                Fetal Emergency (Sustained Bradycardia &lt; 80 bpm)
              </option>
              <option value={EmergencyResponseCategory.MATERNAL_EMERGENCY}>
                Maternal Emergency (Hypovolemic Shock, Anaphylaxis)
              </option>
              <option value={EmergencyResponseCategory.LABOUR_EMERGENCY}>
                Labour Emergency (Uterine Rupture, Shoulder Dystocia)
              </option>
              <option value={EmergencyResponseCategory.SURGICAL_REVIEW_REQUEST}>
                Urgent Surgical Theatre Review
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="er-team" className="text-xs font-semibold">
              Assigned Response Team
            </Label>
            <input
              id="er-team"
              type="text"
              value={assignedTeam}
              onChange={(e) => setAssignedTeam(e.target.value)}
              placeholder="e.g. Ward 18 Crash Team A, Senior Registrar on Duty..."
              className="w-full text-xs p-2.5 border rounded-md"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="er-reason" className="text-xs font-semibold">
              Clinical Nature of Emergency <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="er-reason"
              rows={3}
              value={clinicalReason}
              onChange={(e) => setClinicalReason(e.target.value)}
              placeholder="e.g. Acute maternal hypotension 70/40, unrecordable pulse post delivery, massive hemorrhage..."
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
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={loading || clinicalReason.trim().length < 10}
              data-testid="btn-confirm-emergency-dispatch"
            >
              <Siren className="h-4 w-4 mr-1.5" />
              Dispatch Emergency Team
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
