import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { WardDto } from '@lrms/shared';
import { SectionCard } from '../../../components/shared/HeadersAndCards.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { updateWard } from '../../../services/wards.api.js';

const MIN_SECONDS = 30;
const MAX_SECONDS = 600;

// Ward-level doctor alert timeout (REQ-7.8). The server enforces the same 30–600 s range.
export const AlertTimeoutCard: React.FC<{ ward: WardDto }> = ({ ward }) => {
  const [saved, setSaved] = useState(ward.alertTimeoutSeconds);
  const [value, setValue] = useState(String(ward.alertTimeoutSeconds));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setSaved(ward.alertTimeoutSeconds);
    setValue(String(ward.alertTimeoutSeconds));
  }, [ward.id, ward.alertTimeoutSeconds]);

  const seconds = Number(value);
  const valid = Number.isInteger(seconds) && seconds >= MIN_SECONDS && seconds <= MAX_SECONDS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateWard(ward.id, { alertTimeoutSeconds: seconds });
      if (res.success && res.data) {
        setSaved(res.data.alertTimeoutSeconds);
        setMessage({ kind: 'ok', text: `Saved. Alerts now time out after ${seconds} s.` });
      } else {
        setMessage({ kind: 'error', text: res.error?.message || 'Could not save the timeout.' });
      }
    } catch {
      setMessage({ kind: 'error', text: 'Could not reach the server. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Doctor Alert Timeout"
      description={`${ward.name}: unacknowledged alerts show TIMED-OUT after this time`}
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <Label htmlFor="alert-timeout-seconds" className="text-xs font-semibold text-slate-700">
            Timeout in seconds ({MIN_SECONDS}–{MAX_SECONDS})
          </Label>
          <div className="mt-1 flex items-center gap-2">
            <Timer className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
            <Input
              id="alert-timeout-seconds"
              type="number"
              inputMode="numeric"
              min={MIN_SECONDS}
              max={MAX_SECONDS}
              step={1}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setMessage(null);
              }}
              aria-invalid={!valid}
              aria-describedby="alert-timeout-help"
              className="h-11 max-w-[8rem] text-sm"
            />
            <Button
              type="submit"
              className="h-11 text-xs"
              disabled={saving || !valid || seconds === saved}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <p id="alert-timeout-help" className="mt-1 text-[11px] text-slate-600">
            Current: {saved} s. Default is 120 s.
            {!valid && ` Enter a whole number from ${MIN_SECONDS} to ${MAX_SECONDS}.`}
          </p>
        </div>
        {message && (
          <p
            role="status"
            className={
              message.kind === 'ok' ? 'text-[11px] text-emerald-700' : 'text-[11px] text-red-700'
            }
          >
            {message.text}
          </p>
        )}
      </form>
    </SectionCard>
  );
};
