import React, { useState } from 'react';
import { GlucoseUnit, MaternalObservationDto, OBSERVATION_LIMITS as L } from '@lrms/shared';
import { observationsApi } from '../../../services/observations.api.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { FieldError, errorProps } from '../../../components/ui/field-error.js';
import { FormActions } from '../../../components/shared/FormActions.js';
import { colomboInputToIso } from '../../../lib/datetime.js';
import { AlertCircle, HeartPulse, Loader2 } from 'lucide-react';

interface MaternalObservationFormProps {
  admissionId: string;
  onSuccess?: (obs: MaternalObservationDto) => void;
  onCancel?: () => void;
}

type NumberKey =
  | 'systolic'
  | 'diastolic'
  | 'pulse'
  | 'temperature'
  | 'respiratoryRate'
  | 'oxygenSat';
type Key = NumberKey | 'glucose' | 'glucoseUnit' | 'time';

interface NumberField {
  key: NumberKey;
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  whole: boolean;
  placeholder: string;
}

const NUMBER_FIELDS: NumberField[] = [
  {
    key: 'systolic',
    id: 'maternal-systolic-bp',
    label: 'Systolic BP (mmHg)',
    unit: 'mmHg',
    min: L.systolicBp.min,
    max: L.systolicBp.max,
    whole: true,
    placeholder: 'e.g. 120',
  },
  {
    key: 'diastolic',
    id: 'maternal-diastolic-bp',
    label: 'Diastolic BP (mmHg)',
    unit: 'mmHg',
    min: L.diastolicBp.min,
    max: L.diastolicBp.max,
    whole: true,
    placeholder: 'e.g. 80',
  },
  {
    key: 'pulse',
    id: 'maternal-pulse-rate',
    label: 'Pulse Rate (bpm)',
    unit: 'bpm',
    min: L.pulseRateBpm.min,
    max: L.pulseRateBpm.max,
    whole: true,
    placeholder: 'e.g. 76',
  },
  {
    key: 'temperature',
    id: 'maternal-temperature',
    label: 'Temperature (°C)',
    unit: '°C',
    min: 30,
    max: 45,
    whole: false,
    placeholder: 'e.g. 36.8',
  },
  {
    key: 'respiratoryRate',
    id: 'maternal-respiratory-rate',
    label: 'Respiratory Rate (/min)',
    unit: '/min',
    min: 5,
    max: 60,
    whole: true,
    placeholder: 'e.g. 18',
  },
  {
    key: 'oxygenSat',
    id: 'maternal-oxygen-sat',
    label: 'Oxygen Saturation (SpO₂ %)',
    unit: '%',
    min: 50,
    max: 100,
    whole: true,
    placeholder: 'e.g. 98',
  },
];

const SELECT_CLASS =
  'w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-base sm:text-sm bg-white min-h-[44px] sm:min-h-0';

export const MaternalObservationForm: React.FC<MaternalObservationFormProps> = ({
  admissionId,
  onSuccess,
  onCancel,
}) => {
  const [values, setValues] = useState<Partial<Record<NumberKey, string>>>({});
  const [glucose, setGlucose] = useState('');
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit | ''>('');
  const [notes, setNotes] = useState('');
  const [observationTime, setObservationTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});

  const text = (k: NumberKey) => (values[k] ?? '').trim();

  const validate = (): Partial<Record<Key, string>> => {
    const out: Partial<Record<Key, string>> = {};

    for (const f of NUMBER_FIELDS) {
      const raw = text(f.key);
      if (!raw) continue;
      const n = Number(raw);
      if (isNaN(n) || (f.whole && !Number.isInteger(n)) || n < f.min || n > f.max) {
        out[f.key] =
          `Enter ${f.whole ? 'a whole number' : 'a number'} from ${f.min} to ${f.max} ${f.unit}.`;
      }
    }

    const sys = text('systolic');
    const dia = text('diastolic');
    if (sys && !dia && !out.diastolic) {
      out.diastolic = 'Enter the diastolic value too. BP needs both numbers.';
    }
    if (dia && !sys && !out.systolic) {
      out.systolic = 'Enter the systolic value too. BP needs both numbers.';
    }
    if (sys && dia && !out.systolic && !out.diastolic && Number(sys) <= Number(dia)) {
      out.systolic =
        'Systolic must be higher than diastolic. Check the two numbers are not swapped.';
    }

    if (glucose.trim()) {
      const g = Number(glucose);
      const range = glucoseUnit === GlucoseUnit.MG_DL ? L.bloodGlucoseMgDl : L.bloodGlucoseMmolL;
      if (!glucoseUnit) {
        out.glucoseUnit = 'Choose the unit for the glucose value.';
      } else if (isNaN(g) || g < range.min || g > range.max) {
        out.glucose = `Enter a value from ${range.min} to ${range.max} ${
          glucoseUnit === GlucoseUnit.MG_DL ? 'mg/dL' : 'mmol/L'
        }.`;
      }
    } else if (glucoseUnit) {
      out.glucose = 'Enter the glucose value, or set the unit back to "Select unit".';
    }

    if (observationTime && new Date(colomboInputToIso(observationTime)) > new Date()) {
      out.time = 'The observation time cannot be in the future. Clear it to use the current time.';
    }

    const anyValue = NUMBER_FIELDS.some((f) => text(f.key) !== '') || glucose.trim() !== '';
    if (!anyValue && Object.keys(out).length === 0) {
      out.systolic = 'Enter at least one value, for example blood pressure or pulse.';
    }
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const found = validate();
    setErrors(found);
    const firstKey = Object.keys(found)[0] as Key | undefined;
    if (firstKey) {
      const idByKey: Record<string, string> = {
        glucose: 'maternal-blood-glucose',
        glucoseUnit: 'maternal-glucose-unit',
        time: 'maternal-observation-time',
        ...Object.fromEntries(NUMBER_FIELDS.map((f) => [f.key, f.id])),
      };
      document.getElementById(idByKey[firstKey])?.focus();
      return;
    }

    const num = (k: NumberKey) => (text(k) ? Number(text(k)) : null);

    setLoading(true);
    try {
      const payload = {
        systolicBp: num('systolic'),
        diastolicBp: num('diastolic'),
        pulseRateBpm: num('pulse'),
        temperatureCelsius: num('temperature'),
        respiratoryRate: num('respiratoryRate'),
        oxygenSaturationPercent: num('oxygenSat'),
        bloodGlucoseValue: glucose.trim() ? Number(glucose) : null,
        bloodGlucoseUnit: glucose.trim() && glucoseUnit ? (glucoseUnit as GlucoseUnit) : null,
        clinicalNotes: notes.trim() || null,
        observationTimestamp: observationTime ? colomboInputToIso(observationTime) : undefined,
      };

      const result = await observationsApi.recordMaternalObservation(admissionId, payload);
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

  const renderField = (key: NumberKey) => {
    const f = NUMBER_FIELDS.find((x) => x.key === key)!;
    return (
      <div>
        <Label htmlFor={f.id} className="text-xs font-semibold text-slate-700">
          {f.label}
        </Label>
        <Input
          id={f.id}
          type="number"
          inputMode={f.whole ? 'numeric' : 'decimal'}
          step={f.whole ? undefined : '0.1'}
          min={f.min}
          max={f.max}
          placeholder={f.placeholder}
          value={values[f.key] ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
          className="text-sm mt-1"
          {...errorProps(f.id, errors[f.key])}
        />
        <FieldError id={`${f.id}-error`} message={errors[f.key]} />
      </div>
    );
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

      <p className="text-xs text-slate-600">Enter at least one value. Empty fields are skipped.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {renderField('systolic')}
        {renderField('diastolic')}
        {renderField('pulse')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {renderField('temperature')}
        {renderField('respiratoryRate')}
        {renderField('oxygenSat')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="maternal-blood-glucose" className="text-xs font-semibold text-slate-700">
            Blood Glucose
          </Label>
          <Input
            id="maternal-blood-glucose"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="e.g. 5.4"
            value={glucose}
            onChange={(e) => setGlucose(e.target.value)}
            className="text-sm mt-1"
            {...errorProps('maternal-blood-glucose', errors.glucose)}
          />
          <FieldError id="maternal-blood-glucose-error" message={errors.glucose} />
        </div>
        <div>
          <Label htmlFor="maternal-glucose-unit" className="text-xs font-semibold text-slate-700">
            Glucose Unit
          </Label>
          <select
            id="maternal-glucose-unit"
            value={glucoseUnit}
            onChange={(e) => setGlucoseUnit(e.target.value as GlucoseUnit)}
            className={SELECT_CLASS}
            {...errorProps('maternal-glucose-unit', errors.glucoseUnit)}
          >
            <option value="">Select unit</option>
            <option value={GlucoseUnit.MMOL_L}>mmol/L</option>
            <option value={GlucoseUnit.MG_DL}>mg/dL</option>
          </select>
          <FieldError id="maternal-glucose-unit-error" message={errors.glucoseUnit} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label
            htmlFor="maternal-observation-time"
            className="text-xs font-semibold text-slate-700"
          >
            Observation time (Colombo, 24 h). Leave empty for now.
          </Label>
          <Input
            id="maternal-observation-time"
            type="datetime-local"
            value={observationTime}
            onChange={(e) => setObservationTime(e.target.value)}
            className="text-sm mt-1"
            {...errorProps('maternal-observation-time', errors.time)}
          />
          <FieldError id="maternal-observation-time-error" message={errors.time} />
        </div>
        <div>
          <Label htmlFor="maternal-clinical-notes" className="text-xs font-semibold text-slate-700">
            Clinical Notes
          </Label>
          <Input
            id="maternal-clinical-notes"
            type="text"
            placeholder="e.g. Patient resting in left lateral position"
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
          className="bg-teal-700 hover:bg-teal-800 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <HeartPulse className="w-3.5 h-3.5 mr-1" />
              Record Maternal Vitals
            </>
          )}
        </Button>
      </FormActions>
    </form>
  );
};
