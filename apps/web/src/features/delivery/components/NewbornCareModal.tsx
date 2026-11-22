import React, { useState } from 'react';
import {
  CreatePostpartumNewbornAssessmentInput,
  NewbornCordCondition,
  NewbornFeedingStatus,
  NewbornGeneralCondition,
  NewbornJaundiceStatus,
} from '@lrms/shared';
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
import { Activity, AlertCircle, Baby, Loader2 } from 'lucide-react';

interface NewbornCareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newbornId: string;
  babyLabel: string;
  onSubmit: (input: CreatePostpartumNewbornAssessmentInput) => Promise<void>;
}

export const NewbornCareModal: React.FC<NewbornCareModalProps> = ({
  open,
  onOpenChange,
  newbornId,
  babyLabel,
  onSubmit,
}) => {
  const [generalCondition, setGeneralCondition] = useState<NewbornGeneralCondition>(
    NewbornGeneralCondition.VIGOROUS_ALERT,
  );
  const [respiratoryRate, setRespiratoryRate] = useState<string>('44');
  const [heartRate, setHeartRate] = useState<string>('138');
  const [temperatureCelsius, setTemperatureCelsius] = useState<string>('36.6');
  const [feedingStatus, setFeedingStatus] = useState<NewbornFeedingStatus>(
    NewbornFeedingStatus.BREASTFEEDING_DIRECT,
  );
  const [cordCondition, setCordCondition] = useState<NewbornCordCondition>(
    NewbornCordCondition.CLEAN_DRY,
  );
  const [urinePassed, setUrinePassed] = useState<boolean>(true);
  const [meconiumPassed, setMeconiumPassed] = useState<boolean>(true);
  const [jaundiceStatus, setJaundiceStatus] = useState<NewbornJaundiceStatus>(
    NewbornJaundiceStatus.NONE,
  );
  const [clinicalNotes, setClinicalNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const rr = respiratoryRate ? parseInt(respiratoryRate, 10) : undefined;
      const hr = heartRate ? parseInt(heartRate, 10) : undefined;
      const temp = temperatureCelsius ? parseFloat(temperatureCelsius) : undefined;

      await onSubmit({
        generalCondition,
        respiratoryRate: rr,
        heartRate: hr,
        temperatureCelsius: temp,
        feedingStatus,
        cordCondition,
        urinePassed,
        meconiumPassed,
        jaundiceStatus,
        clinicalNotes: clinicalNotes || null,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save newborn assessment.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Baby className="w-4 h-4 text-teal-600" />
            Record Postpartum Newborn Assessment — {babyLabel}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Vital signs, feeding tolerance, umbilical cord check, urine/meconium excretion, and
            neonatal jaundice.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">General Clinical Condition *</Label>
              <select
                value={generalCondition}
                onChange={(e) => setGeneralCondition(e.target.value as NewbornGeneralCondition)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={NewbornGeneralCondition.VIGOROUS_ALERT}>Vigorous & Alert</option>
                <option value={NewbornGeneralCondition.LETHARGIC}>Lethargic</option>
                <option value={NewbornGeneralCondition.IRRITABLE}>Irritable</option>
                <option value={NewbornGeneralCondition.CYANOTIC}>Cyanotic</option>
                <option value={NewbornGeneralCondition.APNEIC}>Apneic</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Feeding Status *</Label>
              <select
                value={feedingStatus}
                onChange={(e) => setFeedingStatus(e.target.value as NewbornFeedingStatus)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={NewbornFeedingStatus.BREASTFEEDING_DIRECT}>
                  Direct Breastfeeding (Good latch)
                </option>
                <option value={NewbornFeedingStatus.EXPRESSED_BREAST_MILK}>
                  Expressed Breast Milk (EBM)
                </option>
                <option value={NewbornFeedingStatus.FORMULA}>Formula</option>
                <option value={NewbornFeedingStatus.IV_FLUIDS}>IV Fluids</option>
                <option value={NewbornFeedingStatus.NOT_TOLERATING}>
                  Not Tolerating / Vomiting
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Heart Rate (bpm)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="50"
                max="240"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Resp Rate (breaths/m)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="10"
                max="120"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Axillary Temp (°C)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="30"
                max="45"
                value={temperatureCelsius}
                onChange={(e) => setTemperatureCelsius(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Umbilical Cord Condition *</Label>
              <select
                value={cordCondition}
                onChange={(e) => setCordCondition(e.target.value as NewbornCordCondition)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={NewbornCordCondition.CLEAN_DRY}>Clean and Dry (Normal)</option>
                <option value={NewbornCordCondition.BLEEDING}>Bleeding Cord</option>
                <option value={NewbornCordCondition.SEROUS_DISCHARGE}>
                  Serous Discharge / Moist
                </option>
                <option value={NewbornCordCondition.ODOROUS}>
                  Odorous / Foul (Infection risk)
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Neonatal Jaundice Status</Label>
              <select
                value={jaundiceStatus}
                onChange={(e) => setJaundiceStatus(e.target.value as NewbornJaundiceStatus)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={NewbornJaundiceStatus.NONE}>None (No icterus detected)</option>
                <option value={NewbornJaundiceStatus.MILD_FACIAL}>Mild (Facial icterus)</option>
                <option value={NewbornJaundiceStatus.MODERATE_TRUNK}>
                  Moderate (Trunk & Abdomen)
                </option>
                <option value={NewbornJaundiceStatus.SEVERE_DISTAL}>
                  Severe (Distal extremities)
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="urine-passed-checkbox"
                checked={urinePassed}
                onChange={(e) => setUrinePassed(e.target.checked)}
                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <label
                htmlFor="urine-passed-checkbox"
                className="text-xs font-semibold cursor-pointer"
              >
                Urine Passed (Diaper wet)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="meconium-passed-checkbox"
                checked={meconiumPassed}
                onChange={(e) => setMeconiumPassed(e.target.checked)}
                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <label
                htmlFor="meconium-passed-checkbox"
                className="text-xs font-semibold cursor-pointer"
              >
                Meconium Passed (Dark stool)
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Clinical Examination Notes</Label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Neonatal behavior, cry quality, Moro reflex..."
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
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
            <Button type="submit" size="sm" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Newborn Check
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
