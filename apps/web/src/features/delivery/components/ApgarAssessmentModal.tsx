import React, { useState, useMemo } from 'react';
import { ApgarAssessmentDto, ApgarMinute, RecordApgarInput } from '@lrms/shared';
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
import { Badge } from '../../../components/ui/badge.js';
import { AlertCircle, Award, CheckCircle2, Loader2 } from 'lucide-react';

interface ApgarAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newbornId: string;
  babyLabel: string;
  existingAssessments?: ApgarAssessmentDto[];
  onSubmit: (input: RecordApgarInput) => Promise<void>;
}

export const ApgarAssessmentModal: React.FC<ApgarAssessmentModalProps> = ({
  open,
  onOpenChange,
  newbornId,
  babyLabel,
  existingAssessments = [],
  onSubmit,
}) => {
  const [minute, setMinute] = useState<ApgarMinute>(ApgarMinute.ONE_MIN);
  const [appearance, setAppearance] = useState<number>(2);
  const [pulse, setPulse] = useState<number>(2);
  const [grimace, setGrimace] = useState<number>(2);
  const [activity, setActivity] = useState<number>(2);
  const [respiration, setRespiration] = useState<number>(2);
  const [notes, setNotes] = useState('');

  // Correction mode
  const [isCorrection, setIsCorrection] = useState(false);
  const [supersedesId, setSupersedesId] = useState('');
  const [supersedeReason, setSupersedeReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const calculatedTotal = useMemo(() => {
    return appearance + pulse + grimace + activity + respiration;
  }, [appearance, pulse, grimace, activity, respiration]);

  const getScoreClassification = (score: number) => {
    if (score >= 7)
      return {
        label: 'Reassuring (Normal)',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    if (score >= 4)
      return {
        label: 'Moderately Depressed',
        color: 'text-amber-800 bg-amber-50 border-amber-200',
      };
    return {
      label: 'Severely Depressed (Immediate Resuscitation Required)',
      color: 'text-red-700 bg-red-50 border-red-200',
    };
  };

  const classification = getScoreClassification(calculatedTotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);

      if (isCorrection && !supersedesId) {
        setErrorMsg('Please select which previous assessment is being corrected.');
        return;
      }
      if (isCorrection && (!supersedeReason || supersedeReason.trim().length < 5)) {
        setErrorMsg(
          'Correction reason must be at least 5 characters explaining the clinical amendment.',
        );
        return;
      }

      await onSubmit({
        assessmentMinute: minute,
        appearance,
        pulse,
        grimace,
        activity,
        respiration,
        notes: notes || null,
        supersedesId: isCorrection ? supersedesId : undefined,
        supersedeReason: isCorrection ? supersedeReason : undefined,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record Apgar score.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            Standard 5-Component Apgar Score — {babyLabel}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Structured newborn vitality screening with live arithmetic calculation and historical
            correction tracking.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Assessment Timing */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <Label className="text-xs font-semibold block mb-1">Assessment Timing *</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  ApgarMinute.ONE_MIN,
                  ApgarMinute.FIVE_MIN,
                  ApgarMinute.TEN_MIN,
                  ApgarMinute.FIFTEEN_MIN,
                  ApgarMinute.TWENTY_MIN,
                ].map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={minute === m ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMinute(m)}
                    className="h-7 text-xs font-mono"
                  >
                    {m.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Calculated Total</span>
              <div className="text-2xl font-black font-mono text-primary flex items-center justify-end gap-1">
                {calculatedTotal}{' '}
                <span className="text-xs text-muted-foreground font-normal">/ 10</span>
              </div>
            </div>
          </div>

          {/* Classification Banner */}
          <div
            className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${classification.color}`}
          >
            <span>{classification.label}</span>
            <span className="text-[11px] font-mono">Server-side verified</span>
          </div>

          {/* 5 Components */}
          <div className="space-y-3">
            {/* 1. Appearance */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-xs">1. Appearance (Skin Color)</Label>
                <Badge variant="outline" className="font-mono text-xs">
                  {appearance} pts
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { val: 0, text: '0 - Blue or pale all over' },
                  { val: 1, text: '1 - Body pink, extremities blue' },
                  { val: 2, text: '2 - Completely pink' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setAppearance(opt.val)}
                    className={`p-2 text-left rounded-md border text-xs transition-colors ${
                      appearance === opt.val
                        ? 'border-primary bg-primary/10 font-bold text-primary'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Pulse */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-xs">2. Pulse (Heart Rate)</Label>
                <Badge variant="outline" className="font-mono text-xs">
                  {pulse} pts
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { val: 0, text: '0 - Absent' },
                  { val: 1, text: '1 - < 100 beats/min' },
                  { val: 2, text: '2 - ≥ 100 beats/min' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setPulse(opt.val)}
                    className={`p-2 text-left rounded-md border text-xs transition-colors ${
                      pulse === opt.val
                        ? 'border-primary bg-primary/10 font-bold text-primary'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Grimace */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-xs">3. Grimace (Reflex Irritability)</Label>
                <Badge variant="outline" className="font-mono text-xs">
                  {grimace} pts
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { val: 0, text: '0 - No response / flaccid' },
                  { val: 1, text: '1 - Grimace / weak cry' },
                  { val: 2, text: '2 - Vigorous cry / cough / pull away' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setGrimace(opt.val)}
                    className={`p-2 text-left rounded-md border text-xs transition-colors ${
                      grimace === opt.val
                        ? 'border-primary bg-primary/10 font-bold text-primary'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Activity */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-xs">4. Activity (Muscle Tone)</Label>
                <Badge variant="outline" className="font-mono text-xs">
                  {activity} pts
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { val: 0, text: '0 - Limp / floppy' },
                  { val: 1, text: '1 - Some flexion of arms and legs' },
                  { val: 2, text: '2 - Active, vigorous motion' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setActivity(opt.val)}
                    className={`p-2 text-left rounded-md border text-xs transition-colors ${
                      activity === opt.val
                        ? 'border-primary bg-primary/10 font-bold text-primary'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Respiration */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-xs">5. Respiration (Respiratory Effort)</Label>
                <Badge variant="outline" className="font-mono text-xs">
                  {respiration} pts
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { val: 0, text: '0 - Absent / no breathing' },
                  { val: 1, text: '1 - Slow, irregular, gasping' },
                  { val: 2, text: '2 - Good, strong, lusty cry' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setRespiration(opt.val)}
                    className={`p-2 text-left rounded-md border text-xs transition-colors ${
                      respiration === opt.val
                        ? 'border-primary bg-primary/10 font-bold text-primary'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Clinical Observation Notes (Optional)</Label>
            <Input
              type="text"
              placeholder="e.g. Suctioned oral secretions, warmed with radiant heater..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Correction Accordion */}
          {existingAssessments.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="apgar-correction-toggle"
                  checked={isCorrection}
                  onChange={(e) => setIsCorrection(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <label
                  htmlFor="apgar-correction-toggle"
                  className="text-xs font-semibold cursor-pointer"
                >
                  This record is an amendment / correction of a previous Apgar entry
                </label>
              </div>

              {isCorrection && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Select Target Record to Supersede *
                    </Label>
                    <select
                      value={supersedesId}
                      onChange={(e) => setSupersedesId(e.target.value)}
                      className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                      required={isCorrection}
                    >
                      <option value="">-- Choose previous assessment --</option>
                      {existingAssessments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.assessmentMinute.replace(/_/g, ' ')} ({a.totalScore}/10) -{' '}
                          {new Date(a.assessedAt).toLocaleTimeString()} by{' '}
                          {a.assessedByFullName || 'Clinician'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Clinical Correction Justification *
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g. Corrected skin tone score upon second clinical review..."
                      value={supersedeReason}
                      onChange={(e) => setSupersedeReason(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                      required={isCorrection}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
              Save Apgar Assessment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
