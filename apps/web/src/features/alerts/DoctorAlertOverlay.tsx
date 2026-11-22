import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  AlertNewPayload,
  AlertReceiptResponse,
  AlertStateChange,
  AlertStatePayload,
  SocketEvent,
  UserRole,
} from '@lrms/shared';
import { useAuth } from '../../hooks/useAuth.js';
import { useSocketEvent } from '../../hooks/useRealtimeNotifications.js';
import { realtimeClient } from '../../services/realtime.js';
import { clinicalCareApi } from '../../services/clinical-care.api.js';
import { formatColomboTimeWithSeconds } from '../../lib/datetime.js';
import { playAlertTone, unlockAlertAudio, vibrateAlert } from '../../lib/alert-sound.js';

const REPEAT_TONE_MS = 5000;

function humanise(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function errorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { error?: { message?: string } } } }).response?.data;
  return data?.error?.message || 'Could not acknowledge. Check your connection and try again.';
}

// Full-screen alert on the doctor's device (REQ-7.3, 7.4, 7.5). Receipt is sent automatically
// as soon as the alert arrives; acknowledgement is one tap.
export const DoctorAlertOverlay: React.FC = () => {
  const { role } = useAuth();
  const isDoctor = role === UserRole.DOCTOR;
  const [queue, setQueue] = useState<AlertNewPayload[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ackButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isDoctor) return;
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    const unlock = () => {
      unlockAlertAudio();
      events.forEach((e) => window.removeEventListener(e, unlock));
    };
    events.forEach((e) => window.addEventListener(e, unlock));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
  }, [isDoctor]);

  useSocketEvent<AlertNewPayload>(SocketEvent.ALERT_NEW, (alert) => {
    if (!isDoctor) return;
    void realtimeClient.emitWithAck<AlertReceiptResponse>(SocketEvent.ALERT_RECEIPT, {
      escalationId: alert.escalationId,
    });
    setQueue((prev) =>
      prev.some((a) => a.escalationId === alert.escalationId) ? prev : [...prev, alert],
    );
  });

  useSocketEvent<AlertStatePayload>(SocketEvent.ALERT_STATE, (payload) => {
    if (payload.state === AlertStateChange.ACKNOWLEDGED) {
      setQueue((prev) => prev.filter((a) => a.escalationId !== payload.escalationId));
    }
  });

  const current = queue[0] ?? null;
  const currentId = current?.escalationId ?? null;

  useEffect(() => {
    if (!currentId) return;
    setError(null);
    ackButtonRef.current?.focus();
    playAlertTone(true);
    vibrateAlert();
    const timer = setInterval(() => {
      playAlertTone(true);
      vibrateAlert();
    }, REPEAT_TONE_MS);
    return () => clearInterval(timer);
  }, [currentId]);

  if (!isDoctor || !current) return null;

  const acknowledge = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await clinicalCareApi.acknowledgeEscalation(current.admissionId, current.escalationId, {
        notes: 'Acknowledged from alert screen',
      });
      setQueue((prev) => prev.filter((a) => a.escalationId !== current.escalationId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="doctor-alert-title"
      aria-describedby="doctor-alert-reason"
      className="fixed inset-0 z-[9999] flex flex-col overflow-y-auto bg-red-700 pt-safe pl-safe pr-safe text-white"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-6 sm:pt-10">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-10 h-10 shrink-0 animate-pulse" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-red-100">
              {humanise(current.priority)} escalation
            </p>
            <h1 id="doctor-alert-title" className="text-2xl sm:text-3xl font-black leading-tight">
              Doctor needed now
            </h1>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-red-800/70 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-red-100">Ref ID</dt>
            <dd className="text-xl sm:text-2xl font-black font-mono break-all">
              {current.admissionReferenceId}
            </dd>
          </div>
          <div className="rounded-xl bg-red-800/70 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-red-100">Bed</dt>
            <dd className="text-xl sm:text-2xl font-black">
              {current.bedNumber ?? 'Not allocated'}
            </dd>
          </div>
        </dl>

        <div className="rounded-xl bg-red-800/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-100">
            Reason · {humanise(current.category)}
          </p>
          <p id="doctor-alert-reason" className="mt-1 text-lg font-semibold whitespace-pre-wrap">
            {current.clinicalReason}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-100 mb-2">
            Risk flags
          </p>
          {current.riskFlags.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {current.riskFlags.map((flag) => (
                <li
                  key={flag}
                  className="rounded-full bg-white text-red-800 px-3 py-1 text-sm font-bold"
                >
                  {flag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-red-100">None recorded</p>
          )}
        </div>

        <p className="text-sm text-red-100">
          Sent {formatColomboTimeWithSeconds(current.dispatchedAt)} ·{' '}
          {current.escalationReferenceId}
          {queue.length > 1 && ` · ${queue.length - 1} more alert(s) waiting`}
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-white text-red-800 px-4 py-3 text-sm font-semibold"
          >
            {error}
          </p>
        )}

        <button
          ref={ackButtonRef}
          type="button"
          onClick={acknowledge}
          disabled={submitting}
          className="sticky bottom-0 mt-auto mb-4 w-full min-h-[72px] rounded-2xl bg-white text-red-800 text-2xl font-black shadow-lg flex items-center justify-center gap-3 hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70 disabled:opacity-80"
        >
          {submitting ? (
            <Loader2 className="w-7 h-7 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          )}
          Acknowledge
        </button>
        <div className="pb-safe" />
      </div>
    </div>
  );
};
