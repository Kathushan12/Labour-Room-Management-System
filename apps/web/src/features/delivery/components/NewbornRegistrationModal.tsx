import React, { useEffect, useState } from 'react';
import { BirthOutcome, NewbornSex, RegisterNewbornInput } from '@lrms/shared';
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
import { FieldError, errorProps } from '../../../components/ui/field-error.js';
import { AlertCircle, Baby, Loader2 } from 'lucide-react';
import { StaffSelect, StaffOption } from './StaffSelect.js';
import { colomboInputToIso, toColomboInput } from '../../../lib/datetime.js';

interface NewbornRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextBirthOrder: number;
  deliveryReferenceId: string;
  clinicians: StaffOption[];
  defaultDeliveredByUserId: string;
  onSubmit: (input: RegisterNewbornInput) => Promise<void>;
}

export const NewbornRegistrationModal: React.FC<NewbornRegistrationModalProps> = ({
  open,
  onOpenChange,
  nextBirthOrder,
  deliveryReferenceId,
  clinicians,
  defaultDeliveredByUserId,
  onSubmit,
}) => {
  const [birthOrder, setBirthOrder] = useState<number>(nextBirthOrder);
  const [birthTimestamp, setBirthTimestamp] = useState<string>(toColomboInput());
  const [outcome, setOutcome] = useState<BirthOutcome>(BirthOutcome.LIVE_BIRTH);
  const [sex, setSex] = useState<NewbornSex>(NewbornSex.FEMALE);
  const [birthWeightGrams, setBirthWeightGrams] = useState<string>('');
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState<string>('');
  const [gestationalAgeDays, setGestationalAgeDays] = useState<string>('');
  const [deliveredByUserId, setDeliveredByUserId] = useState<string>(defaultDeliveredByUserId);
  const [provisionalName, setProvisionalName] = useState<string>(`Baby #${nextBirthOrder}`);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [deliveredError, setDeliveredError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBirthOrder(nextBirthOrder);
    setProvisionalName(`Baby #${nextBirthOrder}`);
    setDeliveredByUserId(defaultDeliveredByUserId);
    setBirthTimestamp(toColomboInput());
    setBirthWeightGrams('');
    setGestationalAgeWeeks('');
    setGestationalAgeDays('');
    setErrorMsg(null);
    setWeightError(null);
    setDeliveredError(null);
    setTimeError(null);
  }, [open, nextBirthOrder, defaultDeliveredByUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    const weight = parseInt(birthWeightGrams, 10);
    const weightProblem =
      birthWeightGrams.trim() === ''
        ? 'Enter the birth weight in grams.'
        : isNaN(weight) || weight < 300 || weight > 7000
          ? 'Birth weight must be from 300 to 7,000 grams. Check the unit is grams, not kilograms.'
          : null;
    const deliveredProblem = deliveredByUserId ? null : 'Select who delivered the baby.';
    const timeProblem = !birthTimestamp
      ? 'Enter the birth date and time.'
      : new Date(colomboInputToIso(birthTimestamp)) > new Date()
        ? 'The birth time cannot be in the future.'
        : null;
    setWeightError(weightProblem);
    setDeliveredError(deliveredProblem);
    setTimeError(timeProblem);
    if (weightProblem || deliveredProblem || timeProblem) return;

    try {
      setSubmitting(true);

      const weeks = gestationalAgeWeeks ? parseInt(gestationalAgeWeeks, 10) : undefined;
      const days = gestationalAgeDays ? parseInt(gestationalAgeDays, 10) : undefined;

      await onSubmit({
        birthOrder,
        birthTimestamp: colomboInputToIso(birthTimestamp),
        outcome,
        sex,
        birthWeightGrams: weight,
        gestationalAgeWeeks: weeks,
        gestationalAgeDays: days,
        deliveredByUserId,
        provisionalName: provisionalName || null,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register infant.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Baby className="w-4 h-4 text-pink-600" />
            Register Infant — {deliveryReferenceId}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Register individual birth outcome, sex, birth weight, and clinician attribution.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Birth Order (1-10) *</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="10"
                value={birthOrder}
                onChange={(e) => setBirthOrder(parseInt(e.target.value, 10))}
                required
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Provisional Name / Label</Label>
              <Input
                type="text"
                value={provisionalName}
                onChange={(e) => setProvisionalName(e.target.value)}
                placeholder="e.g. Twin A or Baby Girl"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Birth Timestamp *</Label>
              <Input
                id="newborn-birth-time"
                type="datetime-local"
                value={birthTimestamp}
                onChange={(e) => setBirthTimestamp(e.target.value)}
                className="text-xs"
                {...errorProps('newborn-birth-time', timeError)}
              />
              <FieldError id="newborn-birth-time-error" message={timeError} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Birth Outcome *</Label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as BirthOutcome)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={BirthOutcome.LIVE_BIRTH}>Live Birth</option>
                <option value={BirthOutcome.STILLBIRTH_FRESH}>Stillbirth (Fresh)</option>
                <option value={BirthOutcome.STILLBIRTH_MACERATED}>Stillbirth (Macerated)</option>
                <option value={BirthOutcome.NEONATAL_DEATH}>Neonatal Death</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Infant Sex *</Label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as NewbornSex)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={NewbornSex.FEMALE}>Female</option>
                <option value={NewbornSex.MALE}>Male</option>
                <option value={NewbornSex.INDETERMINATE}>Indeterminate</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Birth Weight (Grams) *</Label>
              <Input
                id="newborn-weight"
                type="number"
                inputMode="numeric"
                min="300"
                max="7000"
                value={birthWeightGrams}
                onChange={(e) => setBirthWeightGrams(e.target.value)}
                placeholder="e.g. 3100"
                className="text-xs font-mono"
                {...errorProps('newborn-weight', weightError)}
              />
              <FieldError id="newborn-weight-error" message={weightError} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Gestational Weeks (20-44)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="20"
                max="44"
                value={gestationalAgeWeeks}
                onChange={(e) => setGestationalAgeWeeks(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Gestational Days (0-6)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                max="6"
                value={gestationalAgeDays}
                onChange={(e) => setGestationalAgeDays(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Delivered By *</Label>
            <StaffSelect
              value={deliveredByUserId}
              onChange={setDeliveredByUserId}
              options={clinicians}
              placeholder="Select doctor or midwife"
            />
            <FieldError id="newborn-delivered-error" message={deliveredError} />
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
              Register Infant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
