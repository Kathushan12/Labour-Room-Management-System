// Same-origin by default: the dev/preview server proxies /api and /socket.io to the API, so a phone
// on the ward Wi-Fi only ever talks to the web port. VITE_API_BASE_URL overrides this.
function resolveApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return (configured || '/api/v1').replace(/\/$/, '');
}

export const env = {
  API_BASE_URL: resolveApiBaseUrl(),
  IS_DEV: import.meta.env.DEV,
} as const;
