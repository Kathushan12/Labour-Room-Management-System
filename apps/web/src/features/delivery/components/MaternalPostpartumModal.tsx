import React, { useState } from 'react';
import {
  CreatePostpartumMaternalAssessmentInput,
  LochiaAmount,
  LochiaType,
  MaternalReviewStatus,
  UterineTone,
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
import { Activity, AlertCircle, Loader2 } from 'lucide-react';

interface MaternalPostpartumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreatePostpartumMaternalAssessmentInput) => Promise<void>;
}

export const MaternalPostpartumModal: React.FC<MaternalPostpartumModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [systolicBp, setSystolicBp] = useState<string>('120');
  const [diastolicBp, setDiastolicBp] = useState<string>('80');
  const [pulseRate, setPulseRate] = useState<string>('76');
  const [respiratoryRate, setRespiratoryRate] = useState<string>('18');
  const [temperatureCelsius, setTemperatureCelsius] = useState<string>('36.8');
  const [fundalHeightCm, setFundalHeightCm] = useState<string>('');
  const [uterineTone, setUterineTone] = useState<UterineTone>(UterineTone.WELL_CONTRACTED);
  const [lochiaAmount, setLochiaAmount] = useState<LochiaAmount>(LochiaAmount.NORMAL);
  const [lochiaType, setLochiaType] = useState<LochiaType>(LochiaType.RUBRA);
  const [perinealWoundStatus, setPerinealWoundStatus] = useState<string>('Clean, dry, intact');
  const [painScore, setPainScore] = useState<string>('2');
  const [bladderStatus, setBladderStatus] = useState<string>('Voided spontaneously');
  const [clinicalReviewStatus, setClinicalReviewStatus] = useState<MaternalReviewStatus>(
    MaternalReviewStatus.ROUTINE,
  );
  const [clinicalNotes, setClinicalNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const sys = systolicBp ? parseInt(systolicBp, 10) : undefined;
      const dia = diastolicBp ? parseInt(diastolicBp, 10) : undefined;
      const pulse = pulseRate ? parseInt(pulseRate, 10) : undefined;
      const rr = respiratoryRate ? parseInt(respiratoryRate, 10) : undefined;
      const temp = temperatureCelsius ? parseFloat(temperatureCelsius) : undefined;
      const fundal = fundalHeightCm ? parseFloat(fundalHeightCm) : undefined;
      const pain = painScore ? parseInt(painScore, 10) : undefined;

      await onSubmit({
        systolicBp: sys,
        diastolicBp: dia,
        pulseRate: pulse,
        respiratoryRate: rr,
        temperatureCelsius: temp,
        fundalHeightCm: fundal,
        uterineTone,
        lochiaAmount,
        lochiaType,
        perinealWoundStatus: perinealWoundStatus || null,
        painScore: pain,
        bladderStatus: bladderStatus || null,
        clinicalReviewStatus,
        clinicalNotes: clinicalNotes || null,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save maternal assessment.';
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
            <Activity className="w-4 h-4 text-teal-600" />
            Record Postpartum Maternal Assessment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Document vitals, uterine tone, lochia, perineum condition, and clinical escalation
            review.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Systolic BP (mmHg)</Label>
              <Input
                type="number"
                min="50"
                max="260"
                value={systolicBp}
                onChange={(e) => setSystolicBp(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Diastolic BP (mmHg)</Label>
              <Input
                type="number"
                min="30"
                max="180"
                value={diastolicBp}
                onChange={(e) => setDiastolicBp(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Pulse Rate (bpm)</Label>
              <Input
                type="number"
                min="30"
                max="220"
                value={pulseRate}
                onChange={(e) => setPulseRate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Temp (°C)</Label>
              <Input
                type="number"
                step="0.1"
                min="30"
                max="45"
                value={temperatureCelsius}
                onChange={(e) => setTemperatureCelsius(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Uterine Tone *</Label>
              <select
                value={uterineTone}
                onChange={(e) => setUterineTone(e.target.value as UterineTone)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={UterineTone.WELL_CONTRACTED}>Well Contracted</option>
                <option value={UterineTone.RELAXED_BOGGY}>Relaxed / Boggy</option>
                <option value={UterineTone.TONIC}>Tonic</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Lochia Amount</Label>
              <select
                value={lochiaAmount}
                onChange={(e) => setLochiaAmount(e.target.value as LochiaAmount)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={LochiaAmount.NORMAL}>Normal</option>
                <option value={LochiaAmount.SCANT}>Scant</option>
                <option value={LochiaAmount.MODERATE}>Moderate</option>
                <option value={LochiaAmount.HEAVY_EXCESSIVE}>Heavy / Excessive</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Lochia Type</Label>
              <select
                value={lochiaType}
                onChange={(e) => setLochiaType(e.target.value as LochiaType)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={LochiaType.RUBRA}>Rubra (Red)</option>
                <option value={LochiaType.SEROSA}>Serosa (Pink/Brown)</option>
                <option value={LochiaType.ALBA}>Alba (White/Yellow)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Pain Score (0-10)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={painScore}
                onChange={(e) => setPainScore(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Bladder Status</Label>
              <Input
                type="text"
                value={bladderStatus}
                onChange={(e) => setBladderStatus(e.target.value)}
                placeholder="Voided / Catheterized"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Clinical Review Status</Label>
              <select
                value={clinicalReviewStatus}
                onChange={(e) => setClinicalReviewStatus(e.target.value as MaternalReviewStatus)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={MaternalReviewStatus.ROUTINE}>Routine Observation</option>
                <option value={MaternalReviewStatus.REVIEW_REQUESTED}>
                  Review Requested by Doctor
                </option>
                <option value={MaternalReviewStatus.ESCALATED}>Escalated Emergency</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Perineal Wound Status</Label>
            <Input
              type="text"
              value={perinealWoundStatus}
              onChange={(e) => setPerinealWoundStatus(e.target.value)}
              placeholder="e.g. Clean, dry, sutured episiotomy intact..."
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Clinical Notes</Label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Postpartum recovery observations..."
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
              Save Assessment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
