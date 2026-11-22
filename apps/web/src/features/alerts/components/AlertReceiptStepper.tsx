import React from 'react';
import { CheckCircle2, Circle, PhoneCall, Send, UserCheck } from 'lucide-react';
import { ClinicalEscalationDto, EscalationStatus } from '@lrms/shared';
import { formatColomboTimeWithSeconds } from '../../../lib/datetime.js';
import { cn } from '../../../lib/utils.js';

type StepperAlert = Pick<
  ClinicalEscalationDto,
  | 'status'
  | 'dispatchedAt'
  | 'deliveredAt'
  | 'acknowledgedAt'
  | 'timedOutAt'
  | 'assignedRecipientUserId'
  | 'recipientContactNumber'
  | 'assignedRecipientUser'
>;

export const CallDoctorWarning: React.FC<{
  noDoctor: boolean;
  recipientName?: string | null;
  contactNumber?: string | null;
  className?: string;
}> = ({ noDoctor, recipientName, contactNumber, className }) => (
  <div
    role="alert"
    className={cn(
      'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-800 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800',
      className,
    )}
  >
    <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
    <span className="text-sm font-bold uppercase">
      {noDoctor ? 'No doctor assigned – call doctor' : 'TIMED-OUT – call doctor'}
    </span>
    {!noDoctor && (
      <span className="text-sm">
        {recipientName ?? 'Attending doctor'}
        {contactNumber ? (
          <>
            {' · '}
            <a
              href={`tel:${contactNumber.replace(/\s+/g, '')}`}
              className="inline-flex min-h-[44px] items-center font-bold underline underline-offset-2"
            >
              {contactNumber}
            </a>
          </>
        ) : (
          ' · no phone on file'
        )}
      </span>
    )}
  </div>
);

interface Step {
  label: string;
  at: string | null;
  icon: React.ElementType;
  doneClass: string;
}

// Dispatched -> Delivered -> Acknowledged with server times (REQ-7.1, 7.3, 7.5).
export const AlertReceiptStepper: React.FC<{ alert: StepperAlert; className?: string }> = ({
  alert,
  className,
}) => {
  const steps: Step[] = [
    { label: 'Dispatched', at: alert.dispatchedAt, icon: Send, doneClass: 'text-blue-700 dark:text-blue-300' },
    { label: 'Delivered', at: alert.deliveredAt, icon: CheckCircle2, doneClass: 'text-blue-700 dark:text-blue-300' },
    { label: 'Acknowledged', at: alert.acknowledgedAt, icon: UserCheck, doneClass: 'text-emerald-700 dark:text-emerald-300' },
  ];

  const isOpen = alert.status === EscalationStatus.OPEN && !alert.acknowledgedAt;
  const noDoctor = isOpen && !alert.assignedRecipientUserId;
  const timedOut = isOpen && !!alert.timedOutAt;

  return (
    <div className={cn('space-y-2', className)}>
      <ol className="grid grid-cols-3 gap-1" aria-label="Doctor alert status">
        {steps.map((step, index) => {
          const done = !!step.at;
          const Icon = done ? step.icon : Circle;
          return (
            <li key={step.label} className="relative flex flex-col items-center text-center">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-3 right-1/2 h-0.5 w-full',
                    done ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600',
                  )}
                />
              )}
              <Icon
                aria-hidden="true"
                className={cn(
                  'relative z-10 h-6 w-6 rounded-full bg-card',
                  done ? step.doneClass : 'text-slate-500',
                )}
              />
              <span
                className={cn(
                  'mt-1 text-xs font-semibold',
                  done ? step.doneClass : 'text-slate-600 dark:text-slate-500',
                )}
              >
                {step.label}
              </span>
              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-500">
                {step.at ? formatColomboTimeWithSeconds(step.at) : 'Waiting'}
              </span>
            </li>
          );
        })}
      </ol>

      {(timedOut || noDoctor) && (
        <CallDoctorWarning
          noDoctor={noDoctor}
          recipientName={alert.assignedRecipientUser?.fullName}
          contactNumber={alert.recipientContactNumber}
        />
      )}

      {alert.timedOutAt && alert.acknowledgedAt && (
        <p className="text-[11px] text-muted-foreground">
          Timed out at {formatColomboTimeWithSeconds(alert.timedOutAt)} before acknowledgement.
        </p>
      )}
    </div>
  );
};
