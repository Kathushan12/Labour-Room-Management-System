import React, { useState } from 'react';
import {
  CaputGrade,
  FetalPosition,
  LabourAssessmentDto,
  LiquorAppearance,
  MembraneStatus,
  MouldingGrade,
} from '@lrms/shared';
import { observationsApi } from '../../../services/observations.api.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { FieldError, errorProps } from '../../../components/ui/field-error.js';
import { FormActions } from '../../../components/shared/FormActions.js';
import { AlertCircle, GitCommit, Loader2 } from 'lucide-react';
import { colomboInputToIso } from '../../../lib/datetime.js';

interface LabourAssessmentFormProps {
  admissionId: string;
  onSuccess?: (obs: LabourAssessmentDto) => void;
  onCancel?: () => void;
}

export const LabourAssessmentForm: React.FC<LabourAssessmentFormProps> = ({
  admissionId,
  onSuccess,
  onCancel,
}) => {
  const [dilation, setDilation] = useState('');
  const [effacement, setEffacement] = useState('');
  const [descent, setDescent] = useState('');
  const [station, setStation] = useState('');
  const [membraneStatus, setMembraneStatus] = useState<MembraneStatus>(MembraneStatus.INTACT);
  const [liquorAppearance, setLiquorAppearance] = useState<LiquorAppearance>(
    LiquorAppearance.INTACT,
  );
  const [position, setPosition] = useState<FetalPosition>(FetalPosition.LOA);
  const [caput, setCaput] = useState<CaputGrade>(CaputGrade.NONE);
  const [moulding, setMoulding] = useState<MouldingGrade>(MouldingGrade.ZERO);
  const [notes, setNotes] = useState('');
  const [observationTime, setObservationTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dilationError, setDilationError] = useState<string | null>(null);
  const [effacementError, setEffacementError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const dilationProblem =
      dilation.trim() !== '' &&
      (isNaN(Number(dilation)) || Number(dilation) < 0 || Number(dilation) > 10)
        ? 'Enter cervical dilation from 0 to 10 cm (10 is fully dilated).'
        : null;
    const effacementProblem =
      effacement.trim() !== '' &&
      (isNaN(Number(effacement)) ||
        !Number.isInteger(Number(effacement)) ||
        Number(effacement) < 0 ||
        Number(effacement) > 100)
        ? 'Enter effacement as a whole number from 0 to 100 %.'
        : null;
    setDilationError(dilationProblem);
    setEffacementError(effacementProblem);
    if (dilationProblem || effacementProblem) return;

    setLoading(true);
    try {
      const payload = {
        cervicalDilationCm: dilation ? Number(dilation) : null,
        cervicalEffacementPercent: effacement ? Number(effacement) : null,
        fetalDescentFifths: descent ? Number(descent) : null,
        fetalStation: station || null,
        membraneStatus,
        liquorAppearance,
        fetalPosition: position,
        caput,
        moulding,
        clinicalNotes: notes.trim() || null,
        observationTimestamp: observationTime ? colomboInputToIso(observationTime) : undefined,
      };

      const result = await observationsApi.recordLabourAssessment(admissionId, payload);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record labour assessment';
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

      {/* Dilation & Effacement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label
            htmlFor="labour-cervical-dilation"
            className="text-xs font-semibold text-slate-700"
          >
            Cervical Dilation (cm, 0.0–10.0)
          </Label>
          <Input
            id="labour-cervical-dilation"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0.0"
            max="10.0"
            placeholder="e.g. 4.0"
            value={dilation}
            onChange={(e) => setDilation(e.target.value)}
            className="text-sm mt-1"
            {...errorProps('labour-cervical-dilation', dilationError)}
          />
          <FieldError id="labour-cervical-dilation-error" message={dilationError} />
        </div>

        <div>
          <Label
            htmlFor="labour-cervical-effacement"
            className="text-xs font-semibold text-slate-700"
          >
            Cervical Effacement (% 0–100)
          </Label>
          <Input
            id="labour-cervical-effacement"
            type="number"
            inputMode="numeric"
            min="0"
            max="100"
            placeholder="e.g. 75"
            value={effacement}
            onChange={(e) => setEffacement(e.target.value)}
            className="text-sm mt-1"
            {...errorProps('labour-cervical-effacement', effacementError)}
          />
          <FieldError id="labour-cervical-effacement-error" message={effacementError} />
        </div>
      </div>

      {/* Descent & Station */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="labour-fetal-descent" className="text-xs font-semibold text-slate-700">
            Fetal Descent (Fifths palpable above brim 5–0)
          </Label>
          <select
            id="labour-fetal-descent"
            value={descent}
            onChange={(e) => setDescent(e.target.value)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">Select descent</option>
            <option value="5">5/5 (Completely above brim)</option>
            <option value="4">4/5 (High)</option>
            <option value="3">3/5 (Engaging)</option>
            <option value="2">2/5 (Engaged)</option>
            <option value="1">1/5 (Deep in pelvis)</option>
            <option value="0">0/5 (At pelvic floor)</option>
          </select>
        </div>

        <div>
          <Label htmlFor="labour-fetal-station" className="text-xs font-semibold text-slate-700">
            Fetal Station (Ischial Spines -3 to +3)
          </Label>
          <select
            id="labour-fetal-station"
            value={station}
            onChange={(e) => setStation(e.target.value)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">Select station</option>
            <option value="-3">-3 (Floating)</option>
            <option value="-2">-2</option>
            <option value="-1">-1</option>
            <option value="0">0 (At Ischial Spines)</option>
            <option value="+1">+1</option>
            <option value="+2">+2</option>
            <option value="+3">+3 (Crowning)</option>
          </select>
        </div>
      </div>

      {/* Membranes & Liquor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="labour-membrane-status" className="text-xs font-semibold text-slate-700">
            Membrane Status
          </Label>
          <select
            id="labour-membrane-status"
            value={membraneStatus}
            onChange={(e) => setMembraneStatus(e.target.value as MembraneStatus)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value={MembraneStatus.INTACT}>Intact</option>
            <option value={MembraneStatus.RUPTURED}>Ruptured</option>
          </select>
        </div>

        <div>
          <Label
            htmlFor="labour-liquor-appearance"
            className="text-xs font-semibold text-slate-700"
          >
            Liquor Appearance
          </Label>
          <select
            id="labour-liquor-appearance"
            value={liquorAppearance}
            onChange={(e) => setLiquorAppearance(e.target.value as LiquorAppearance)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value={LiquorAppearance.INTACT}>Intact Membranes</option>
            <option value={LiquorAppearance.CLEAR}>Clear</option>
            <option value={LiquorAppearance.MECONIUM_STAINED}>Meconium-Stained</option>
            <option value={LiquorAppearance.BLOOD_STAINED}>Blood-Stained</option>
            <option value={LiquorAppearance.ABSENT}>Absent</option>
          </select>
        </div>
      </div>

      {/* Position, Caput, Moulding */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="labour-fetal-position" className="text-xs font-semibold text-slate-700">
            Fetal Position
          </Label>
          <select
            id="labour-fetal-position"
            value={position}
            onChange={(e) => setPosition(e.target.value as FetalPosition)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value={FetalPosition.LOA}>LOA (Left Occiput Anterior)</option>
            <option value={FetalPosition.ROA}>ROA (Right Occiput Anterior)</option>
            <option value={FetalPosition.OA}>OA (Direct Occiput Anterior)</option>
            <option value={FetalPosition.LOP}>LOP (Left Occiput Posterior)</option>
            <option value={FetalPosition.ROP}>ROP (Right Occiput Posterior)</option>
            <option value={FetalPosition.OP}>OP (Direct Occiput Posterior)</option>
            <option value={FetalPosition.LOT}>LOT (Left Occiput Transverse)</option>
            <option value={FetalPosition.ROT}>ROT (Right Occiput Transverse)</option>
            <option value={FetalPosition.OTHER}>Other / Indeterminate / Breech</option>
          </select>
        </div>

        <div>
          <Label htmlFor="labour-caput" className="text-xs font-semibold text-slate-700">
            Caput Succedaneum
          </Label>
          <select
            id="labour-caput"
            value={caput}
            onChange={(e) => setCaput(e.target.value as CaputGrade)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value={CaputGrade.NONE}>0 (None)</option>
            <option value={CaputGrade.MILD}>+ (Mild)</option>
            <option value={CaputGrade.MODERATE}>++ (Moderate)</option>
            <option value={CaputGrade.SEVERE}>+++ (Severe)</option>
          </select>
        </div>

        <div>
          <Label htmlFor="labour-moulding" className="text-xs font-semibold text-slate-700">
            Moulding
          </Label>
          <select
            id="labour-moulding"
            value={moulding}
            onChange={(e) => setMoulding(e.target.value as MouldingGrade)}
            className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value={MouldingGrade.ZERO}>0 (Bones separated)</option>
            <option value={MouldingGrade.PLUS_ONE}>+ (Bones touching)</option>
            <option value={MouldingGrade.PLUS_TWO}>++ (Bones overlapping, reducible)</option>
            <option value={MouldingGrade.PLUS_THREE}>+++ (Bones overlapping, irreducible)</option>
          </select>
        </div>
      </div>

      {/* Observation Time & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="labour-observation-time" className="text-xs font-semibold text-slate-700">
            Observation time (Colombo, 24 h). Leave empty for now.
          </Label>
          <Input
            id="labour-observation-time"
            type="datetime-local"
            value={observationTime}
            onChange={(e) => setObservationTime(e.target.value)}
            className="text-sm mt-1"
          />
        </div>
        <div>
          <Label htmlFor="labour-clinical-notes" className="text-xs font-semibold text-slate-700">
            Clinical Notes
          </Label>
          <Input
            id="labour-clinical-notes"
            type="text"
            placeholder="e.g. Well-flexed vertex presentation"
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
          className="bg-purple-700 hover:bg-purple-800 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <GitCommit className="w-3.5 h-3.5 mr-1" />
              Record Labour Assessment
            </>
          )}
        </Button>
      </FormActions>
    </form>
  );
};
