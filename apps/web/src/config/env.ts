const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

// The API runs on the same machine as the web server, so when the page is opened from another
// device (phone on the ward Wi-Fi) a localhost URL must follow the host the page was loaded from.
function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const pageHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const url = new URL(configured || `${window.location.protocol}//localhost:4000/api/v1`);
  if (LOOPBACK.has(url.hostname) && !LOOPBACK.has(pageHost)) url.hostname = pageHost;
  return url.toString().replace(/\/$/, '');
}

export const env = {
  API_BASE_URL: resolveApiBaseUrl(),
  IS_DEV: import.meta.env.DEV,
} as const;
