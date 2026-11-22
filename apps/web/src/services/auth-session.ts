import { ApiResponse, AuthUser, LoginResponse, RefreshResponse } from '@lrms/shared';
import { env } from '../config/env.js';

/**
 * Client-side session state shared by every module that calls the API.
 * Tokens live in memory only; tabs exchange them over BroadcastChannel and take turns
 * refreshing through a Web Lock so a rotated refresh token is never sent twice.
 */

export type SignOutReason = 'manual' | 'idle' | 'absolute' | 'ended';

export interface SessionSnapshot {
  user: AuthUser | null;
  accessToken: string | null;
}

export type RefreshOutcome =
  | { status: 'ok'; accessToken: string }
  | { status: 'signed-out'; code?: string }
  | { status: 'unavailable' };

type Listener = (snapshot: SessionSnapshot, notice: string | null) => void;

type ChannelMessage =
  | { type: 'session'; data: RefreshResponse; issuedAt: number }
  | { type: 'signed-out'; reason: SignOutReason };

// REQ-1.5: 60 min idle; SEC-6 access tokens are refreshed shortly before they expire.
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const REFRESH_LEAD_MS = 60 * 1000;
const RETRY_DELAY_MS = 10 * 1000;
const ACTIVITY_WRITE_INTERVAL_MS = 15 * 1000;
const ACTIVITY_KEY = 'lrms_last_activity';
const LOCK_NAME = 'lrms-auth-refresh';

let accessToken: string | null = null;
let memoryCsrfToken: string | null = null;
let currentUser: AuthUser | null = null;
let accessExpiresAt = 0;
let lastActivity = Date.now();
// Bumped by login, logout and changes from other tabs so stale refresh results are dropped.
let epoch = 0;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<RefreshOutcome> | null = null;
const listeners = new Set<Listener>();

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('lrms-auth') : null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getCsrfToken(): string | null {
  // The cookie is shared by all tabs and always holds the value the server expects.
  const match = document.cookie.match(/(?:^|;\s*)lrms_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : memoryCsrfToken;
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(notice: string | null = null): void {
  const snapshot = { user: currentUser, accessToken };
  for (const listener of listeners) listener(snapshot, notice);
}

function signOutNotice(reason: SignOutReason): string | null {
  switch (reason) {
    case 'idle':
      return 'You were signed out after 60 minutes of inactivity. Please sign in again.';
    case 'absolute':
      return 'Your 12-hour session has ended. Please sign in again.';
    case 'ended':
      return 'Your session has ended. Please sign in again.';
    default:
      return null;
  }
}

function reasonFromCode(code?: string): SignOutReason {
  if (code === 'SESSION_IDLE_TIMEOUT') return 'idle';
  if (code === 'SESSION_ABSOLUTE_TIMEOUT') return 'absolute';
  return 'ended';
}

function setSession(data: RefreshResponse, issuedAt = Date.now()): void {
  accessToken = data.accessToken;
  memoryCsrfToken = data.csrfToken;
  currentUser = data.user;
  accessExpiresAt = issuedAt + data.expiresIn * 1000;
  scheduleRefresh();
  notify();
}

function clearSession(reason: SignOutReason): void {
  const hadSession = currentUser !== null;
  accessToken = null;
  memoryCsrfToken = null;
  currentUser = null;
  accessExpiresAt = 0;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  notify(hadSession ? signOutNotice(reason) : null);
}

function broadcast(message: ChannelMessage): void {
  try {
    channel?.postMessage(message);
  } catch {
    // Another tab simply refreshes on its own if the message is lost.
  }
}

/** Login and password change: a brand-new session for this browser. */
export function establishSession(data: LoginResponse): void {
  epoch++;
  const issuedAt = Date.now();
  markActivity(true);
  setSession(data, issuedAt);
  broadcast({ type: 'session', data, issuedAt });
}

function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? (locks.request(LOCK_NAME, fn) as Promise<T>) : fn();
}

async function requestRefresh(): Promise<
  | { kind: 'ok'; data: RefreshResponse }
  | { kind: 'signed-out'; code?: string }
  | { kind: 'unavailable' }
> {
  const csrf = getCsrfToken();
  // The CSRF cookie is issued with the refresh cookie, so without it there is no session.
  if (!csrf) return { kind: 'signed-out', code: 'NO_SESSION' };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrf,
  };

  let res: Response;
  try {
    res = await fetch(`${env.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
  } catch {
    return { kind: 'unavailable' };
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<RefreshResponse> | null;
  if (res.ok && body?.success && body.data) return { kind: 'ok', data: body.data };
  // Only an explicit auth rejection ends the session; restarts, 5xx and 429 are transient.
  if (res.status === 401 || res.status === 403) {
    return { kind: 'signed-out', code: body?.error?.code };
  }
  return { kind: 'unavailable' };
}

/**
 * Obtains a valid access token. `staleToken` is the token the caller found wanting; if another
 * tab already replaced it while this tab waited for the lock, the new one is reused.
 */
export function refreshSession(staleToken: string | null = accessToken): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;

  const startEpoch = epoch;
  inFlight = withRefreshLock(async (): Promise<RefreshOutcome> => {
    if (accessToken && accessToken !== staleToken && Date.now() < accessExpiresAt - 5000) {
      return { status: 'ok', accessToken };
    }

    const result = await requestRefresh();

    if (epoch !== startEpoch) {
      return accessToken ? { status: 'ok', accessToken } : { status: 'signed-out' };
    }

    if (result.kind === 'ok') {
      const issuedAt = Date.now();
      setSession(result.data, issuedAt);
      broadcast({ type: 'session', data: result.data, issuedAt });
      return { status: 'ok', accessToken: result.data.accessToken };
    }

    if (result.kind === 'signed-out') {
      const reason = reasonFromCode(result.code);
      clearSession(reason);
      broadcast({ type: 'signed-out', reason });
      return { status: 'signed-out', code: result.code };
    }

    return { status: 'unavailable' };
  }).finally(() => {
    inFlight = null;
  });

  return inFlight;
}

function scheduleRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!accessToken) return;

  const lifetime = accessExpiresAt - Date.now();
  const delay = Math.max(lifetime - REFRESH_LEAD_MS, lifetime / 2, 1000);
  refreshTimer = setTimeout(() => void onRefreshDue(), delay);
}

async function onRefreshDue(): Promise<void> {
  if (!accessToken) return;
  if (isIdle()) {
    await signOut('idle');
    return;
  }
  const outcome = await refreshSession(accessToken);
  if (outcome.status === 'unavailable' && accessToken) {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void onRefreshDue(), RETRY_DELAY_MS);
  }
}

/** Ends the session on the server (best effort) and in every tab. */
export async function signOut(reason: SignOutReason = 'manual'): Promise<void> {
  epoch++;
  const headers: Record<string, string> = {};
  const csrf = getCsrfToken();
  if (csrf) headers['X-CSRF-Token'] = csrf;
  try {
    await fetch(`${env.API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
  } catch {
    // The local session is still cleared; the server session then times out on its own.
  }
  clearSession(reason);
  broadcast({ type: 'signed-out', reason });
}

function readSharedActivity(): number {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

function markActivity(force = false): void {
  const now = Date.now();
  if (!force && now - lastActivity < ACTIVITY_WRITE_INTERVAL_MS) return;
  lastActivity = now;
  try {
    localStorage.setItem(ACTIVITY_KEY, String(now));
  } catch {
    // Without storage each tab tracks its own activity.
  }
}

function isIdle(): boolean {
  return Date.now() - Math.max(lastActivity, readSharedActivity()) > IDLE_TIMEOUT_MS;
}

function describeLoginFailure(status: number, body: ApiResponse<unknown> | null): string {
  const code = body?.error?.code ?? '';
  const message = body?.error?.message;
  const details = body?.error?.details as { retryAfterSeconds?: number } | undefined;
  const minutes = details?.retryAfterSeconds
    ? Math.max(1, Math.ceil(details.retryAfterSeconds / 60))
    : null;
  const inMinutes = minutes ? ` Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` : '';

  if (status === 423) {
    return message ?? `Account locked after 5 failed sign-in attempts.${inMinutes}`;
  }
  if (status === 429) {
    return message ?? `Too many sign-in attempts from this device.${inMinutes}`;
  }
  if (code.startsWith('CSRF') || code === 'INVALID_CSRF_TOKEN') {
    return 'Your security token is out of date. Reload the page and try again.';
  }
  if (status >= 500) {
    return `Sign-in could not be completed (error ${status}). Try again in a moment.`;
  }
  if (message) return message;
  return `Sign-in failed (HTTP ${status}). Please try again.`;
}

/** Signs in and returns the new session; throws an Error whose message is ready to display. */
export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${env.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error(
      'Cannot connect to the system. Check that this device is online, then try again.',
    );
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<LoginResponse> | null;
  if (res.ok && body?.success && body.data) {
    establishSession(body.data);
    return body.data;
  }
  throw new Error(describeLoginFailure(res.status, body));
}

if (typeof window !== 'undefined') {
  markActivity(true);
  for (const event of ['pointerdown', 'keydown', 'touchstart', 'wheel', 'mousemove']) {
    window.addEventListener(event, () => markActivity(), { passive: true });
  }

  channel?.addEventListener('message', (event: MessageEvent<ChannelMessage>) => {
    const message = event.data;
    epoch++;
    if (message.type === 'session') {
      setSession(message.data, message.issuedAt);
    } else if (message.type === 'signed-out') {
      clearSession(message.reason);
    }
  });

  // Background tabs throttle timers, so catch up as soon as the tab is visible again.
  const catchUp = () => {
    if (accessToken && Date.now() > accessExpiresAt - REFRESH_LEAD_MS) void onRefreshDue();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') catchUp();
  });
  window.addEventListener('online', catchUp);

  setInterval(() => {
    if (accessToken && isIdle()) void signOut('idle');
  }, 30 * 1000);
}
