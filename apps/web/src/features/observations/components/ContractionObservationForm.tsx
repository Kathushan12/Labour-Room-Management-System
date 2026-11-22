import React, { useState } from 'react';
import { ContractionIntensity, ContractionObservationDto } from '@lrms/shared';
import { observationsApi } from '../../../services/observations.api.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { FieldError, errorProps } from '../../../components/ui/field-error.js';
import { FormActions } from '../../../components/shared/FormActions.js';
import { AlertCircle, Loader2, Waves } from 'lucide-react';
import { colomboInputToIso } from '../../../lib/datetime.js';

interface ContractionObservationFormProps {
  admissionId: string;
  onSuccess?: (obs: ContractionObservationDto) => void;
  onCancel?: () => void;
}

export const ContractionObservationForm: React.FC<ContractionObservationFormProps> = ({
  admissionId,
  onSuccess,
  onCancel,
}) => {
  const [frequency, setFrequency] = useState('');
  const windowMinutes = '10';
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<ContractionIntensity>(ContractionIntensity.MODERATE);
  const [notes, setNotes] = useState('');
  const [observationTime, setObservationTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const count = Number(frequency);
    const countProblem =
      frequency.trim() === ''
        ? 'Enter how many contractions in 10 minutes. Enter 0 if there were none.'
        : isNaN(count) || !Number.isInteger(count) || count < 0 || count > 10
          ? 'Enter a whole number from 0 to 10 contractions per 10 minutes.'
          : null;
    const seconds = Number(duration);
    const durationProblem =
      duration.trim() !== '' &&
      (isNaN(seconds) || !Number.isInteger(seconds) || seconds < 0 || seconds > 300)
        ? 'Enter the average duration as whole seconds from 0 to 300.'
        : null;
    setCountError(countProblem);
    setDurationError(durationProblem);
    if (countProblem || durationProblem) return;

    setLoading(true);
    try {
      const payload = {
        contractionsCount: count,
        observationWindowMinutes: windowMinutes ? Number(windowMinutes) : 10,
        durationSeconds: duration ? Number(duration) : null,
        intensity: intensity || null,
        clinicalNotes: notes.trim() || null,
        observationTimestamp: observationTime ? colomboInputToIso(observationTime) : undefined,
      };

      const result = await observationsApi.recordContractionObservation(admissionId, payload);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record contraction observation';
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

      {/* Contractions Count & Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="contraction-frequency" className="text-xs font-semibold text-slate-700">
            Contractions Count (/ 10 min) *
          </Label>
          <Input
            id="contraction-frequency"
            type="number"
            inputMode="numeric"
            min="0"
            max="10"
            placeholder="e.g. 3"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="text-sm mt-1"
            {...errorProps('contraction-frequency', countError)}
          />
          <FieldError id="contraction-frequency-error" message={countError} />
          <p className="text-[11px] text-slate-500 mt-1">Normal active labour: 3–5 / 10 min</p>
        </div>

        <div>
          <Label htmlFor="contraction-duration" className="text-xs font-semibold text-slate-700">
            Average Duration (seconds)
          </Label>
          <Input
            id="contraction-duration"
            type="number"
            inputMode="numeric"
            min="5"
            max="180"
            placeholder="e.g. 40"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="text-sm mt-1"
            {...errorProps('contraction-duration', durationError)}
          />
          <FieldError id="contraction-duration-error" message={durationError} />
          <p className="text-[11px] text-slate-500 mt-1">
            &lt;20s: Mild, 20-40s: Moderate, &gt;40s: Strong
          </p>
        </div>

        <div>
          <Label htmlFor="contraction-intensity" className="text-xs font-semibold text-slate-700">
            Intensity Grade
          </Label>
          <select
            id="contraction-intensity"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as ContractionIntensity)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-base sm:text-sm bg-white min-h-[44px] sm:min-h-0"
          >
            <option value={ContractionIntensity.MILD}>
              Mild (&lt; 20 seconds, dotted shading)
            </option>
            <option value={ContractionIntensity.MODERATE}>
              Moderate (20–40 seconds, diagonal shading)
            </option>
            <option value={ContractionIntensity.STRONG}>
              Strong (&gt; 40 seconds, solid shading)
            </option>
          </select>
        </div>
      </div>

      {/* Observation Time & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label
            htmlFor="contraction-observation-time"
            className="text-xs font-semibold text-slate-700"
          >
            Observation time (Colombo, 24 h). Leave empty for now.
          </Label>
          <Input
            id="contraction-observation-time"
            type="datetime-local"
            value={observationTime}
            onChange={(e) => setObservationTime(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
        <div>
          <Label
            htmlFor="contraction-clinical-notes"
            className="text-xs font-semibold text-slate-700"
          >
            Clinical Notes
          </Label>
          <Input
            id="contraction-clinical-notes"
            type="text"
            placeholder="e.g. Palpated over 10 minutes at maternal fundus"
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
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Waves className="w-3.5 h-3.5 mr-1" />
              Record Contractions
            </>
          )}
        </Button>
      </FormActions>
    </form>
  );
};
