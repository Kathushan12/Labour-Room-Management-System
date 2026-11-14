import React, { useState } from 'react';
import { GlucoseUnit, MaternalObservationDto } from '@lrms/shared';
import { observationsApi } from '../../../services/observations.api.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { AlertCircle, HeartPulse, Loader2 } from 'lucide-react';

interface MaternalObservationFormProps {
  admissionId: string;
  onSuccess?: (obs: MaternalObservationDto) => void;
  onCancel?: () => void;
}

export const MaternalObservationForm: React.FC<MaternalObservationFormProps> = ({
  admissionId,
  onSuccess,
  onCancel,
}) => {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [temperature, setTemperature] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');
  const [glucose, setGlucose] = useState('');
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit | ''>('');
  const [notes, setNotes] = useState('');
  const [observationTime, setObservationTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic client checks
    if (systolic && diastolic && Number(systolic) <= Number(diastolic)) {
      setError('Systolic BP must be strictly greater than diastolic BP');
      return;
    }

    if (glucose && !glucoseUnit) {
      setError('Blood glucose unit is required when entering blood glucose value');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        systolicBp: systolic ? Number(systolic) : null,
        diastolicBp: diastolic ? Number(diastolic) : null,
        pulseRateBpm: pulse ? Number(pulse) : null,
        temperatureCelsius: temperature ? Number(temperature) : null,
        respiratoryRate: respiratoryRate ? Number(respiratoryRate) : null,
        oxygenSaturationPercent: oxygenSat ? Number(oxygenSat) : null,
        bloodGlucoseValue: glucose ? Number(glucose) : null,
        bloodGlucoseUnit: glucose && glucoseUnit ? (glucoseUnit as GlucoseUnit) : null,
        clinicalNotes: notes.trim() || null,
        observationTimestamp: observationTime ? new Date(observationTime).toISOString() : undefined,
      };

      const result = await observationsApi.recordMaternalObservation(admissionId, payload);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record maternal observation';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Blood Pressure & Pulse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="maternal-systolic-bp" className="text-xs font-semibold text-slate-700">
            Systolic BP (mmHg)
          </Label>
          <Input
            id="maternal-systolic-bp"
            type="number"
            min="40"
            max="300"
            placeholder="e.g. 120"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
        <div>
          <Label htmlFor="maternal-diastolic-bp" className="text-xs font-semibold text-slate-700">
            Diastolic BP (mmHg)
          </Label>
          <Input
            id="maternal-diastolic-bp"
            type="number"
            min="20"
            max="200"
            placeholder="e.g. 80"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
        <div>
          <Label htmlFor="maternal-pulse-rate" className="text-xs font-semibold text-slate-700">
            Pulse Rate (bpm)
          </Label>
          <Input
            id="maternal-pulse-rate"
            type="number"
            min="30"
            max="250"
            placeholder="e.g. 76"
            value={pulse}
            onChange={(e) => setPulse(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
      </div>

      {/* Temperature, Resp Rate, SpO2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="maternal-temperature" className="text-xs font-semibold text-slate-700">
            Temperature (°C)
          </Label>
          <Input
            id="maternal-temperature"
            type="number"
            step="0.1"
            min="30.0"
            max="45.0"
            placeholder="e.g. 36.8"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
        <div>
          <Label
            htmlFor="maternal-respiratory-rate"
            className="text-xs font-semibold text-slate-700"
          >
            Respiratory Rate (/min)
          </Label>
          <Input
            id="maternal-respiratory-rate"
            type="number"
            min="5"
            max="60"
            placeholder="e.g. 18"
            value={respiratoryRate}
            onChange={(e) => setRespiratoryRate(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
        <div>
          <Label htmlFor="maternal-oxygen-sat" className="text-xs font-semibold text-slate-700">
            Oxygen Saturation (SpO₂ %)
          </Label>
          <Input
            id="maternal-oxygen-sat"
            type="number"
            min="50"
            max="100"
            placeholder="e.g. 98"
            value={oxygenSat}
            onChange={(e) => setOxygenSat(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
      </div>

      {/* Blood Glucose */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="maternal-blood-glucose" className="text-xs font-semibold text-slate-700">
            Blood Glucose
          </Label>
          <Input
            id="maternal-blood-glucose"
            type="number"
            step="0.1"
            min="0.1"
            max="50"
            placeholder="e.g. 5.4"
            value={glucose}
            onChange={(e) => setGlucose(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
        <div>
          <Label htmlFor="maternal-glucose-unit" className="text-xs font-semibold text-slate-700">
            Glucose Unit
          </Label>
          <select
            id="maternal-glucose-unit"
            value={glucoseUnit}
            onChange={(e) => setGlucoseUnit(e.target.value as GlucoseUnit)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">Select unit</option>
            <option value={GlucoseUnit.MMOL_L}>mmol/L</option>
            <option value={GlucoseUnit.MG_DL}>mg/dL</option>
          </select>
        </div>
      </div>

      {/* Observation Time & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label
            htmlFor="maternal-observation-time"
            className="text-xs font-semibold text-slate-700"
          >
            Observation Timestamp (Optional - defaults to now)
          </Label>
          <Input
            id="maternal-observation-time"
            type="datetime-local"
            value={observationTime}
            onChange={(e) => setObservationTime(e.target.value)}
            className="text-sm mt-1"
          />
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

      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
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
              Recording...
            </>
          ) : (
            <>
              <HeartPulse className="w-3.5 h-3.5 mr-1" />
              Record Maternal Vitals
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
