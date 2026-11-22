import React from 'react';
import { DeliveryDto, DeliveryMode, DeliveryStatus } from '@lrms/shared';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { Calendar, Clock, Edit2, CheckCircle2, Lock, AlertTriangle, UserCheck } from 'lucide-react';
import { formatColomboDate, formatColomboDateTime } from '../../../lib/datetime.js';

interface DeliveryOutcomeCardProps {
  delivery: DeliveryDto | null;
  canManage: boolean;
  canFinalize: boolean;
  onOpenCreate: () => void;
  onOpenEdit: () => void;
  onOpenFinalize: () => void;
}

export const DeliveryOutcomeCard: React.FC<DeliveryOutcomeCardProps> = ({
  delivery,
  canManage,
  canFinalize,
  onOpenCreate,
  onOpenEdit,
  onOpenFinalize,
}) => {
  if (!delivery) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
        <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
          No Delivery Record Logged
        </h4>
        <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
          Record labour outcome, attending obstetric team, delivery mode, blood loss, and perineal
          trauma.
        </p>
        {canManage && (
          <Button onClick={onOpenCreate} size="sm" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Record Delivery Event
          </Button>
        )}
      </div>
    );
  }

  const isFinalized = delivery.status === DeliveryStatus.FINALIZED;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold">
            DL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Delivery Event: {delivery.deliveryReferenceId}
              </h3>
              <Badge
                variant={isFinalized ? 'default' : 'secondary'}
                className={
                  isFinalized
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }
              >
                {delivery.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Recorded on {formatColomboDate(delivery.createdAt)} by{' '}
              {delivery.recordedByFullName || 'Clinical Staff'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage && !isFinalized && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenEdit}
              className="gap-1.5 text-xs h-8"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Record
            </Button>
          )}
          {canFinalize && !isFinalized && (
            <Button
              size="sm"
              onClick={onOpenFinalize}
              className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Lock className="w-3.5 h-3.5" />
              Finalize Delivery
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
        <div>
          <span className="text-muted-foreground block mb-1">Delivery Time & Mode</span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            {formatColomboDateTime(delivery.deliveryTimestamp)}
          </div>
          <Badge variant="outline" className="mt-1 font-mono uppercase text-[10px]">
            {delivery.deliveryMode.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div>
          <span className="text-muted-foreground block mb-1">Attending Obstetric Team</span>
          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            {delivery.attendingDoctorFullName || 'Attending Doctor'}
          </div>
          {delivery.responsibleMidwifeFullName && (
            <div className="text-muted-foreground mt-0.5">
              Midwife: {delivery.responsibleMidwifeFullName}
            </div>
          )}
        </div>

        <div>
          <span className="text-muted-foreground block mb-1">Blood Loss & Trauma</span>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {delivery.estimatedBloodLossMl !== null
              ? `${delivery.estimatedBloodLossMl} mL`
              : 'Not recorded'}
          </div>
          <div className="text-muted-foreground mt-0.5">
            Perineum: {delivery.perinealTraumaStatus || 'Intact / None'}
          </div>
        </div>

        <div>
          <span className="text-muted-foreground block mb-1">Placenta & Location</span>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {delivery.placentaStatus || 'Delivered Complete'}
          </div>
          <div className="text-muted-foreground mt-0.5">Location: {delivery.deliveryLocation}</div>
        </div>
      </div>

      {delivery.clinicalNotes && (
        <div className="px-6 pb-4 pt-1 border-t border-slate-50 dark:border-slate-800 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 mr-2">
            Clinical Notes:
          </span>
          <span className="text-muted-foreground">{delivery.clinicalNotes}</span>
        </div>
      )}

      {delivery.amendmentReason && (
        <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Amendment History:</strong> {delivery.amendmentReason}
          </span>
        </div>
      )}
    </div>
  );
};
