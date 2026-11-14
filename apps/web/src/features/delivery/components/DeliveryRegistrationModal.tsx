import React, { useState, useEffect } from 'react';
import { CreateDeliveryInput, DeliveryDto, DeliveryMode, UpdateDeliveryInput } from '@lrms/shared';
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
import { AlertCircle, Loader2 } from 'lucide-react';

interface DeliveryRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingDelivery?: DeliveryDto | null;
  onSubmit: (input: CreateDeliveryInput | UpdateDeliveryInput) => Promise<void>;
  attendingStaffList?: Array<{ id: string; fullName: string; role: string }>;
}

export const DeliveryRegistrationModal: React.FC<DeliveryRegistrationModalProps> = ({
  open,
  onOpenChange,
  existingDelivery,
  onSubmit,
  attendingStaffList = [],
}) => {
  const isEditing = Boolean(existingDelivery);

  const [deliveryTimestamp, setDeliveryTimestamp] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(DeliveryMode.SPONTANEOUS_VAGINAL);
  const [deliveryLocation, setDeliveryLocation] = useState('Ward 18 - Labour Room');
  const [attendingDoctorId, setAttendingDoctorId] = useState('');
  const [responsibleMidwifeId, setResponsibleMidwifeId] = useState('');
  const [estimatedBloodLossMl, setEstimatedBloodLossMl] = useState<string>('250');
  const [perinealTraumaStatus, setPerinealTraumaStatus] = useState('Intact');
  const [placentaStatus, setPlacentaStatus] = useState('Complete');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingDelivery) {
      setDeliveryTimestamp(
        existingDelivery.deliveryTimestamp
          ? new Date(existingDelivery.deliveryTimestamp).toISOString().slice(0, 16)
          : '',
      );
      setDeliveryMode(existingDelivery.deliveryMode);
      setDeliveryLocation(existingDelivery.deliveryLocation);
      setAttendingDoctorId(existingDelivery.attendingDoctorId);
      setResponsibleMidwifeId(existingDelivery.responsibleMidwifeId || '');
      setEstimatedBloodLossMl(
        existingDelivery.estimatedBloodLossMl !== null
          ? String(existingDelivery.estimatedBloodLossMl)
          : '',
      );
      setPerinealTraumaStatus(existingDelivery.perinealTraumaStatus || 'Intact');
      setPlacentaStatus(existingDelivery.placentaStatus || 'Complete');
      setClinicalNotes(existingDelivery.clinicalNotes || '');
      setAmendmentReason('');
    } else {
      setDeliveryTimestamp(new Date().toISOString().slice(0, 16));
      setDeliveryMode(DeliveryMode.SPONTANEOUS_VAGINAL);
      setDeliveryLocation('Ward 18 - Labour Room');
      setAttendingDoctorId(attendingStaffList[0]?.id || '');
      setResponsibleMidwifeId('');
      setEstimatedBloodLossMl('250');
      setPerinealTraumaStatus('Intact');
      setPlacentaStatus('Complete');
      setClinicalNotes('');
      setAmendmentReason('');
    }
    setErrorMsg(null);
  }, [existingDelivery, open, attendingStaffList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!deliveryTimestamp) {
      setErrorMsg('Delivery timestamp is required.');
      return;
    }
    if (!attendingDoctorId) {
      setErrorMsg('Attending Doctor identifier is required.');
      return;
    }

    const bloodLoss = estimatedBloodLossMl ? parseInt(estimatedBloodLossMl, 10) : undefined;
    if (bloodLoss !== undefined && (isNaN(bloodLoss) || bloodLoss < 0 || bloodLoss > 10000)) {
      setErrorMsg('Estimated blood loss must be between 0 and 10,000 mL.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await onSubmit({
          deliveryTimestamp: new Date(deliveryTimestamp).toISOString(),
          deliveryMode,
          deliveryLocation,
          attendingDoctorId,
          responsibleMidwifeId: responsibleMidwifeId || null,
          estimatedBloodLossMl: bloodLoss,
          perinealTraumaStatus,
          placentaStatus,
          clinicalNotes: clinicalNotes || null,
          amendmentReason: amendmentReason || undefined,
        });
      } else {
        await onSubmit({
          deliveryTimestamp: new Date(deliveryTimestamp).toISOString(),
          deliveryMode,
          deliveryLocation,
          attendingDoctorId,
          responsibleMidwifeId: responsibleMidwifeId || null,
          estimatedBloodLossMl: bloodLoss,
          perinealTraumaStatus,
          placentaStatus,
          clinicalNotes: clinicalNotes || null,
        });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save delivery event record.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? 'Amend Delivery Record' : 'Record Delivery Event'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Labour Room Ward 18 delivery event details, obstetric team attribution, and blood loss.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Delivery Timestamp *</Label>
              <Input
                type="datetime-local"
                value={deliveryTimestamp}
                onChange={(e) => setDeliveryTimestamp(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Delivery Mode *</Label>
              <select
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value as DeliveryMode)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
              >
                <option value={DeliveryMode.SPONTANEOUS_VAGINAL}>
                  Spontaneous Vaginal Delivery (SVD)
                </option>
                <option value={DeliveryMode.ASSISTED_VACUUM}>Assisted - Vacuum Extraction</option>
                <option value={DeliveryMode.ASSISTED_FORCEPS}>Assisted - Forceps Delivery</option>
                <option value={DeliveryMode.EMERGENCY_CESAREAN}>
                  Emergency Cesarean Section (Cat 1/2)
                </option>
                <option value={DeliveryMode.ELECTIVE_CESAREAN}>Elective Cesarean Section</option>
                <option value={DeliveryMode.BREECH_VAGINAL}>Assisted Vaginal Breech</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Attending Doctor ID *</Label>
              <Input
                type="text"
                placeholder="Doctor User UUID"
                value={attendingDoctorId}
                onChange={(e) => setAttendingDoctorId(e.target.value)}
                required
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Responsible Midwife ID (Optional)</Label>
              <Input
                type="text"
                placeholder="Midwife User UUID"
                value={responsibleMidwifeId}
                onChange={(e) => setResponsibleMidwifeId(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Blood Loss (mL)</Label>
              <Input
                type="number"
                min="0"
                max="10000"
                value={estimatedBloodLossMl}
                onChange={(e) => setEstimatedBloodLossMl(e.target.value)}
                placeholder="250"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Perineal Trauma</Label>
              <Input
                type="text"
                value={perinealTraumaStatus}
                onChange={(e) => setPerinealTraumaStatus(e.target.value)}
                placeholder="Intact / Episiotomy / 1st-4th degree"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Placenta Status</Label>
              <Input
                type="text"
                value={placentaStatus}
                onChange={(e) => setPlacentaStatus(e.target.value)}
                placeholder="Complete / Manual removal"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Delivery Location</Label>
            <Input
              type="text"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Clinical Notes</Label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Notable clinical observations during second and third stage of labour..."
              className="w-full p-2 rounded-md border border-input bg-background text-xs"
            />
          </div>

          {isEditing && (
            <div className="space-y-1.5 p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <Label className="text-xs text-amber-900 dark:text-amber-300 font-semibold">
                Amendment Justification (Required if record was finalized)
              </Label>
              <Input
                type="text"
                value={amendmentReason}
                onChange={(e) => setAmendmentReason(e.target.value)}
                placeholder="Reason for modifying delivery clinical details..."
                className="h-8 text-xs bg-white dark:bg-slate-900"
              />
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
              {isEditing ? 'Save Changes' : 'Record Delivery'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
