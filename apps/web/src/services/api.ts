import { env } from '../config/env.js';
import { ApiResponse, HealthLiveResponse, HealthReadyResponse } from '@lrms/shared';
import { getAccessToken, getCsrfToken, refreshSession } from './auth-session.js';

interface RequestOptions extends RequestInit {
  _retry?: boolean;
}

/**
 * Centralized authenticated API fetch wrapper. On HTTP 401 it refreshes once (shared with
 * other tabs) and retries; the session only ends if the server rejects the refresh.
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${env.API_BASE_URL}${endpoint}`;
  const token = getAccessToken();
  const csrfToken = getCsrfToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const method = (options.method || 'GET').toUpperCase();
  // SAF-3: no clinical changes are sent while offline (dialogs sit outside the disabled form).
  if (method !== 'GET' && typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      error: {
        code: 'OFFLINE',
        message: 'You are offline. Changes are disabled until the connection returns.',
      },
      timestamp: new Date().toISOString(),
    };
  }
  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    csrfToken &&
    !headers.has('X-CSRF-Token')
  ) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    !options._retry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh')
  ) {
    const outcome = await refreshSession(token);

    if (outcome.status === 'ok') {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${outcome.accessToken}`);
      const refreshedCsrf = getCsrfToken();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && refreshedCsrf) {
        retryHeaders.set('X-CSRF-Token', refreshedCsrf);
      }
      return apiFetch<T>(endpoint, {
        ...options,
        headers: retryHeaders,
        _retry: true,
      });
    }
  }

  const data = (await response.json().catch(() => ({
    success: false,
    error: {
      code: 'INVALID_RESPONSE',
      message: `Unexpected response from server (HTTP ${response.status})`,
    },
    timestamp: new Date().toISOString(),
  }))) as ApiResponse<T>;
  return data;
}

export async function fetchHealthLive(): Promise<ApiResponse<HealthLiveResponse>> {
  try {
    const res = await fetch(`${env.API_BASE_URL}/health/live`);
    const data = (await res.json()) as ApiResponse<HealthLiveResponse>;
    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reach API server',
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export async function fetchHealthReady(): Promise<ApiResponse<HealthReadyResponse>> {
  try {
    const res = await fetch(`${env.API_BASE_URL}/health/ready`);
    const data = (await res.json()) as ApiResponse<HealthReadyResponse>;
    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reach API server',
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Convenient REST client facade matching standard method signatures for services.
 */
export const api = {
  get: async <T>(
    url: string,
    config?: { params?: Record<string, unknown>; headers?: Record<string, string> },
  ): Promise<{ data: T }> => {
    let fullUrl = url;
    if (config?.params) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(config.params)) {
        if (v !== undefined && v !== null) {
          sp.append(k, String(v));
        }
      }
      const qs = sp.toString();
      if (qs) {
        fullUrl += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    const res = await apiFetch<unknown>(fullUrl, { method: 'GET', headers: config?.headers });
    if (!res.success) {
      const err = new Error(res.error?.message || 'API request failed');
      (err as unknown as { response: { data: unknown; status: number } }).response = {
        data: res,
        status: (res as unknown as { statusCode?: number }).statusCode || 400,
      };
      throw err;
    }
    return { data: res as unknown as T };
  },

  post: async <T>(
    url: string,
    data?: unknown,
    config?: { headers?: Record<string, string> },
  ): Promise<{ data: T }> => {
    const res = await apiFetch<unknown>(url, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      headers: config?.headers,
    });
    if (!res.success) {
      const err = new Error(res.error?.message || 'API request failed');
      (err as unknown as { response: { data: unknown; status: number } }).response = {
        data: res,
        status: (res as unknown as { statusCode?: number }).statusCode || 400,
      };
      throw err;
    }
    return { data: res as unknown as T };
  },

  patch: async <T>(
    url: string,
    data?: unknown,
    config?: { headers?: Record<string, string> },
  ): Promise<{ data: T }> => {
    const res = await apiFetch<unknown>(url, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      headers: config?.headers,
    });
    if (!res.success) {
      const err = new Error(res.error?.message || 'API request failed');
      (err as unknown as { response: { data: unknown; status: number } }).response = {
        data: res,
        status: (res as unknown as { statusCode?: number }).statusCode || 400,
      };
      throw err;
    }
    return { data: res as unknown as T };
  },

  delete: async <T>(
    url: string,
    config?: { data?: unknown; headers?: Record<string, string> },
  ): Promise<{ data: T }> => {
    const res = await apiFetch<unknown>(url, {
      method: 'DELETE',
      body: config?.data !== undefined ? JSON.stringify(config.data) : undefined,
      headers: config?.headers,
    });
    if (!res.success) {
      const err = new Error(res.error?.message || 'API request failed');
      (err as unknown as { response: { data: unknown; status: number } }).response = {
        data: res,
        status: (res as unknown as { statusCode?: number }).statusCode || 400,
      };
      throw err;
    }
    return { data: res as unknown as T };
  },
};
