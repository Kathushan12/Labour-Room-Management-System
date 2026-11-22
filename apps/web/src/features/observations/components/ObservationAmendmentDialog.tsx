import React, { useState } from 'react';
import { ClinicalObservationType } from '@lrms/shared';
import { observationsApi } from '../../../services/observations.api.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { AlertCircle, History, Loader2 } from 'lucide-react';
import { humanizeEnum } from '../../../lib/labels.js';

interface ObservationAmendmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  admissionId?: string;
  observationId?: string;
  observationType: ClinicalObservationType;
  currentValues?: Record<string, any>;
  observation?: any;
  onSuccess: () => void;
}

export const ObservationAmendmentDialog: React.FC<ObservationAmendmentDialogProps> = ({
  isOpen,
  onClose,
  admissionId,
  observationId,
  observationType,
  currentValues,
  observation,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const initialData = currentValues || observation || {};
  const [formValues, setFormValues] = useState<Record<string, any>>({ ...initialData });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalAdmissionId = admissionId || observation?.admissionId || '';
  const finalObsId = observationId || observation?.id || '';

  const getTitle = () => {
    switch (observationType) {
      case ClinicalObservationType.MATERNAL:
        return 'Amend Maternal Observation';
      case ClinicalObservationType.FETAL:
        return 'Amend Fetal Heart Rate Observation';
      case ClinicalObservationType.LABOUR_ASSESSMENT:
        return 'Amend Labour Assessment';
      case ClinicalObservationType.CONTRACTION:
        return 'Amend Contraction Observation';
      default:
        return 'Amend Clinical Observation';
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleAmend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason || reason.trim().length < 10) {
      setError('Please provide at least 10 characters clinical rationale for this amendment');
      return;
    }

    setLoading(true);
    try {
      await observationsApi.amendObservation(finalAdmissionId, finalObsId, observationType, {
        amendmentReason: reason.trim(),
        ...formValues,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to amend clinical observation';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white rounded-xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center space-x-2 text-amber-700">
            <History className="w-5 h-5" />
            <DialogTitle className="text-base font-bold text-slate-900">{getTitle()}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-600">
            Clinical records cannot be silently overwritten or deleted. This amendment creates an
            append-only replacement record that references the original observation and records your
            rationale in the audit log.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAmend} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Type-specific editable fields */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
              Correct Observation Values ({humanizeEnum(observationType)})
            </div>

            {observationType === ClinicalObservationType.MATERNAL && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="amend-systolic-bp"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Systolic BP (mmHg)
                  </Label>
                  <Input
                    id="amend-systolic-bp"
                    type="number"
                    inputMode="numeric"
                    value={formValues.systolicBp ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'systolicBp',
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="text-sm mt-1"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="amend-diastolic-bp"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Diastolic BP (mmHg)
                  </Label>
                  <Input
                    id="amend-diastolic-bp"
                    type="number"
                    inputMode="numeric"
                    value={formValues.diastolicBp ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'diastolicBp',
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="text-sm mt-1"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="amend-pulse-rate"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Pulse Rate (bpm)
                  </Label>
                  <Input
                    id="amend-pulse-rate"
                    type="number"
                    inputMode="numeric"
                    value={formValues.pulseRateBpm ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'pulseRateBpm',
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="text-sm mt-1"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="amend-temperature"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Temperature (°C)
                  </Label>
                  <Input
                    id="amend-temperature"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={formValues.temperatureCelsius ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'temperatureCelsius',
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="text-sm mt-1"
                  />
                </div>
              </div>
            )}

            {observationType === ClinicalObservationType.FETAL && (
              <div>
                <Label htmlFor="amend-fhr" className="text-xs font-semibold text-slate-700">
                  Fetal Heart Rate (bpm)
                </Label>
                <Input
                  id="amend-fhr"
                  type="number"
                  inputMode="numeric"
                  value={formValues.fetalHeartRateBpm ?? ''}
                  onChange={(e) =>
                    handleFieldChange(
                      'fetalHeartRateBpm',
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="text-sm mt-1"
                />
              </div>
            )}

            {observationType === ClinicalObservationType.LABOUR_ASSESSMENT && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="amend-cervical-dilation"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Cervical Dilation (cm, 0.0–10.0)
                  </Label>
                  <Input
                    id="amend-cervical-dilation"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={formValues.cervicalDilationCm ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'cervicalDilationCm',
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="text-sm mt-1"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="amend-effacement"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Effacement (%)
                  </Label>
                  <Input
                    id="amend-effacement"
                    type="number"
                    inputMode="numeric"
                    value={formValues.cervicalEffacementPercent ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'cervicalEffacementPercent',
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="text-sm mt-1"
                  />
                </div>
              </div>
            )}

            {observationType === ClinicalObservationType.CONTRACTION && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="amend-contractions-count"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Contractions Count (/ 10 min)
                  </Label>
                  <Input
                    id="amend-contractions-count"
                    type="number"
                    inputMode="numeric"
                    value={formValues.contractionsCount ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'contractionsCount',
                        e.target.value ? Number(e.target.value) : '',
                      )
                    }
                    className="text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="amend-duration" className="text-xs font-semibold text-slate-700">
                    Duration (seconds)
                  </Label>
                  <Input
                    id="amend-duration"
                    type="number"
                    inputMode="numeric"
                    value={formValues.durationSeconds ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'durationSeconds',
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="text-sm mt-1"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="amend-notes" className="text-xs font-semibold text-slate-700">
                Clinical Remarks / Notes
              </Label>
              <Input
                id="amend-notes"
                type="text"
                value={formValues.clinicalNotes ?? ''}
                onChange={(e) => handleFieldChange('clinicalNotes', e.target.value)}
                placeholder="Optional correction remarks"
                className="text-sm mt-1"
              />
            </div>
          </div>

          {/* Mandatory Clinical Justification */}
          <div>
            <Label
              htmlFor="amendment-rationale"
              className="text-xs font-bold text-slate-800 flex items-center space-x-1"
            >
              <span>Clinical Rationale & Justification *</span>
            </Label>
            <textarea
              id="amendment-rationale"
              required
              rows={3}
              placeholder="State the clinical reason for correcting this measurement (e.g. Transcription error from bedside paper chart; re-verified with manual sphygmomanometer)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-0.5">
              Minimum 10 characters required. This rationale is indelibly recorded in the clinical
              audit log.
            </p>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Recording Amendment...
                </>
              ) : (
                <>
                  <History className="w-3.5 h-3.5 mr-1" />
                  Save Correction
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
