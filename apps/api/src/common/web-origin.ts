import { env } from '../config/env.js';

const PRIVATE_IPV4 =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

// Outside production the app is also opened from phones on the same Wi-Fi, so the web port is
// accepted on any private-network address. Production only accepts WEB_ORIGIN.
export function isAllowedWebOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === env.WEB_ORIGIN) return true;
  if (env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    const configured = new URL(env.WEB_ORIGIN);
    if (url.protocol !== configured.protocol || url.port !== configured.port) return false;
    return url.hostname === configured.hostname || PRIVATE_IPV4.test(url.hostname);
  } catch {
    return false;
  }
}

export function webOriginCors(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  callback(null, isAllowedWebOrigin(origin));
}
