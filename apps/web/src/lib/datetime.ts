const COLOMBO = 'Asia/Colombo';

export function formatColomboTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: COLOMBO,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatColomboTimeWithSeconds(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: COLOMBO,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatColomboDateTime(iso: string | Date): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: COLOMBO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatColomboDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: COLOMBO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Value for a datetime-local input showing the given moment (default: now) as Asia/Colombo wall-clock time. */
export function toColomboInput(value: string | Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Reads a datetime-local value as Asia/Colombo time (UTC+05:30, no daylight saving) and returns UTC ISO. */
export function colomboInputToIso(value: string): string {
  return new Date(`${value}:00+05:30`).toISOString();
}
