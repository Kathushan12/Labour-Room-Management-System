import React, { useState } from 'react';
import { FetalObservationDto } from '@lrms/shared';
import { observationsApi } from '../../../services/observations.api.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';

interface FetalObservationFormProps {
  admissionId: string;
  onSuccess?: (obs: FetalObservationDto) => void;
  onCancel?: () => void;
}

export const FetalObservationForm: React.FC<FetalObservationFormProps> = ({
  admissionId,
  onSuccess,
  onCancel,
}) => {
  const [fhrBpm, setFhrBpm] = useState('');
  const [variability, setVariability] = useState<string>('NORMAL');
  const [decelerations, setDecelerations] = useState<string>('NONE');
  const [accelerations, setAccelerations] = useState<string>('PRESENT');
  const [liquorStatus, setLiquorStatus] = useState<string>('CLEAR');
  const [notes, setNotes] = useState('');
  const [observationTime, setObservationTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fhr = Number(fhrBpm);
    if (!fhrBpm || isNaN(fhr) || fhr < 40 || fhr > 260) {
      setError('FHR must be between 40 and 260 bpm');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fetalHeartRateBpm: fhr,
        fetalHeartRateUnit: 'BPM',
        variability: variability || null,
        decelerations: decelerations || null,
        accelerations: accelerations || null,
        liquorStatus: liquorStatus || null,
        clinicalNotes: notes.trim() || null,
        observationTimestamp: observationTime ? new Date(observationTime).toISOString() : undefined,
      };

      const result = await observationsApi.recordFetalObservation(admissionId, payload);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record fetal observation';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* FHR & Liquor Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="fetal-heart-rate" className="text-xs font-semibold text-slate-700">
            Fetal Heart Rate (bpm) *
          </Label>
          <Input
            id="fetal-heart-rate"
            type="number"
            min="40"
            max="260"
            placeholder="e.g. 140 (Normal: 110–160)"
            value={fhrBpm}
            onChange={(e) => setFhrBpm(e.target.value)}
            required
            className="text-sm mt-1"
          />
          <p className="text-[11px] text-slate-500 mt-1">Normal baseline: 110–160 bpm</p>
        </div>

        <div>
          <Label htmlFor="fetal-liquor-status" className="text-xs font-semibold text-slate-700">
            Liquor Status
          </Label>
          <select
            id="fetal-liquor-status"
            value={liquorStatus}
            onChange={(e) => setLiquorStatus(e.target.value)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="INTACT">Intact Membranes (I)</option>
            <option value="CLEAR">Clear Liquor (C)</option>
            <option value="MECONIUM_STAINED">Meconium-Stained (M)</option>
            <option value="BLOOD_STAINED">Blood-Stained (B)</option>
            <option value="ABSENT">Absent Liquor (A)</option>
          </select>
        </div>
      </div>

      {/* CTG / Auscultation details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="fetal-variability" className="text-xs font-semibold text-slate-700">
            Variability
          </Label>
          <select
            id="fetal-variability"
            value={variability}
            onChange={(e) => setVariability(e.target.value)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
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
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
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
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
      </div>

      {/* Observation Time & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="fetal-observation-time" className="text-xs font-semibold text-slate-700">
            Observation Timestamp (Optional - defaults to now)
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
          className="bg-indigo-700 hover:bg-indigo-800 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5 mr-1" />
              Record Fetal Observation
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
