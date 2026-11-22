import React from 'react';
import { AlertReceiptState, BedActiveAlertDto } from '@lrms/shared';
import { AlertReceiptBadge } from '../../../components/status/Badges.js';
import { formatColomboTime } from '../../../lib/datetime.js';
import { CallDoctorWarning } from './AlertReceiptStepper.js';

// Doctor alert summary on a ward board bed card (REQ-7.7, 7.9).
export const BedAlertStatus: React.FC<{ alert: BedActiveAlertDto }> = ({ alert }) => {
  const acknowledged = alert.alertState === AlertReceiptState.ACKNOWLEDGED;
  const timedOut = !!alert.timedOutAt && !acknowledged;
  const noDoctor = !acknowledged && !alert.recipientName;

  return (
    <div className="space-y-1 pt-1">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="font-semibold text-slate-700">Doctor alert</span>
        <AlertReceiptBadge state={alert.alertState} />
        <span className="text-slate-600">sent {formatColomboTime(alert.dispatchedAt)}</span>
      </div>
      {(timedOut || noDoctor) && (
        <CallDoctorWarning
          noDoctor={noDoctor}
          recipientName={alert.recipientName}
          contactNumber={alert.recipientContactNumber}
          className="px-2 py-1"
        />
      )}
    </div>
  );
};
