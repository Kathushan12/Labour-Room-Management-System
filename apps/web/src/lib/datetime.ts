const COLOMBO = 'Asia/Colombo';

export function formatColomboTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: COLOMBO,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatColomboTimeWithSeconds(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: COLOMBO,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatColomboDateTime(iso: string): string {
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
