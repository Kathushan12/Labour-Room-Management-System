import React, { useState } from 'react';
import { AmnioticFluid, FetalObservationDto, OBSERVATION_LIMITS as L } from '@lrms/shared';
import { observationsApi } from '../../../services/observations.api.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { FieldError, errorProps } from '../../../components/ui/field-error.js';
import { FormActions } from '../../../components/shared/FormActions.js';
import { colomboInputToIso } from '../../../lib/datetime.js';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';

interface FetalObservationFormProps {
  admissionId: string;
  onSuccess?: (obs: FetalObservationDto) => void;
  onCancel?: () => void;
}

const SELECT_CLASS =
  'w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-base sm:text-sm bg-white min-h-[44px] sm:min-h-0';

export const FetalObservationForm: React.FC<FetalObservationFormProps> = ({
  admissionId,
  onSuccess,
  onCancel,
}) => {
  const [fhrBpm, setFhrBpm] = useState('');
  const [variability, setVariability] = useState<string>('NORMAL');
  const [decelerations, setDecelerations] = useState<string>('NONE');
  const [accelerations, setAccelerations] = useState<string>('PRESENT');
  const [liquorStatus, setLiquorStatus] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [observationTime, setObservationTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fhrError, setFhrError] = useState<string | null>(null);

  const hasFhr = fhrBpm.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const fhr = Number(fhrBpm);
    let problem: string | null = null;
    if (hasFhr && (isNaN(fhr) || !Number.isInteger(fhr) || fhr < L.fetalHeartRateBpm.min || fhr > L.fetalHeartRateBpm.max)) {
      problem = `Fetal heart rate must be a whole number from ${L.fetalHeartRateBpm.min} to ${L.fetalHeartRateBpm.max} bpm.`;
    } else if (!hasFhr && !liquorStatus) {
      problem =
        'Enter a fetal heart rate or choose an amniotic fluid status. One value is enough.';
    }
    setFhrError(problem);
    if (problem) return;

    setLoading(true);
    try {
      const payload = {
        fetalHeartRateBpm: hasFhr ? fhr : null,
        fetalHeartRateUnit: 'BPM',
        variability: hasFhr ? variability || null : null,
        decelerations: hasFhr ? decelerations || null : null,
        accelerations: hasFhr ? accelerations || null : null,
        liquorStatus: liquorStatus || null,
        clinicalNotes: notes.trim() || null,
        observationTimestamp: observationTime ? colomboInputToIso(observationTime) : undefined,
      };

      const result = await observationsApi.recordFetalObservation(admissionId, payload);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not save. Check the connection and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-center space-x-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-slate-600">
        Enter at least one value: fetal heart rate or amniotic fluid.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="fetal-heart-rate" className="text-xs font-semibold text-slate-700">
            Fetal Heart Rate (bpm)
          </Label>
          <Input
            id="fetal-heart-rate"
            type="number"
            inputMode="numeric"
            min={L.fetalHeartRateBpm.min}
            max={L.fetalHeartRateBpm.max}
            placeholder="e.g. 140"
            value={fhrBpm}
            onChange={(e) => setFhrBpm(e.target.value)}
            className="text-sm mt-1"
            {...errorProps('fetal-heart-rate', fhrError)}
          />
          <FieldError id="fetal-heart-rate-error" message={fhrError} />
          <p className="text-[11px] text-slate-600 mt-1">Normal baseline: 110–160 bpm</p>
        </div>

        <div>
          <Label htmlFor="fetal-liquor-status" className="text-xs font-semibold text-slate-700">
            Amniotic Fluid
          </Label>
          <select
            id="fetal-liquor-status"
            value={liquorStatus}
            onChange={(e) => setLiquorStatus(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Not recorded</option>
            <option value={AmnioticFluid.INTACT}>Intact Membranes (I)</option>
            <option value={AmnioticFluid.CLEAR}>Clear Liquor (C)</option>
            <option value={AmnioticFluid.MECONIUM}>Meconium (M)</option>
            <option value={AmnioticFluid.BLOOD}>Blood-Stained (B)</option>
          </select>
        </div>
      </div>

      {hasFhr && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="fetal-variability" className="text-xs font-semibold text-slate-700">
              Variability
            </Label>
            <select
              id="fetal-variability"
              value={variability}
              onChange={(e) => setVariability(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="NORMAL">Normal (5–25 bpm)</option>
              <option value="REDUCED">Reduced (&lt; 5 bpm)</option>
              <option value="INCREASED">Increased (&gt; 25 bpm)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="fetal-decelerations" className="text-xs font-semibold text-slate-700">
              Decelerations
            </Label>
            <select
              id="fetal-decelerations"
              value={decelerations}
              onChange={(e) => setDecelerations(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="NONE">None</option>
              <option value="EARLY">Early (Benign)</option>
              <option value="VARIABLE">Variable</option>
              <option value="LATE">Late (Pathological)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="fetal-accelerations" className="text-xs font-semibold text-slate-700">
              Accelerations
            </Label>
            <select
              id="fetal-accelerations"
              value={accelerations}
              onChange={(e) => setAccelerations(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="fetal-observation-time" className="text-xs font-semibold text-slate-700">
            Observation time (Colombo, 24 h). Leave empty for now.
          </Label>
          <Input
            id="fetal-observation-time"
            type="datetime-local"
            value={observationTime}
            onChange={(e) => setObservationTime(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
        <div>
          <Label htmlFor="fetal-clinical-notes" className="text-xs font-semibold text-slate-700">
            Clinical Notes
          </Label>
          <Input
            id="fetal-clinical-notes"
            type="text"
            placeholder="e.g. Pinard stethoscope / Handheld Doppler"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
      </div>

      <FormActions>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={loading}
          className="bg-indigo-700 hover:bg-indigo-800 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 mr-1" />
              Record Fetal Observation
            </>
          )}
        </Button>
      </FormActions>
    </form>
  );
};
