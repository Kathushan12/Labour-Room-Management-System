import { env } from '../config/env.js';
import {
  ApiResponse,
  HealthLiveResponse,
  HealthReadyResponse,
  RefreshResponse,
} from '@lrms/shared';
import {
  getMemoryAccessToken,
  getMemoryCsrfToken,
  syncMemoryTokensFromInterceptor,
} from '../context/AuthContext.js';

interface RequestOptions extends RequestInit {
  _retry?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function executeTokenRefresh(): Promise<string | null> {
  try {
    const csrfToken = getMemoryCsrfToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const res = await fetch(`${env.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      syncMemoryTokensFromInterceptor(null);
      return null;
    }

    const body: ApiResponse<RefreshResponse> = await res.json();
    if (body.success && body.data) {
      syncMemoryTokensFromInterceptor(body.data);
      return body.data.accessToken;
    }

    syncMemoryTokensFromInterceptor(null);
    return null;
  } catch {
    syncMemoryTokensFromInterceptor(null);
    return null;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Centralized authenticated API fetch wrapper with single-flight token refresh on HTTP 401.
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${env.API_BASE_URL}${endpoint}`;
  const token = getMemoryAccessToken();
  const csrfToken = getMemoryCsrfToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const method = (options.method || 'GET').toUpperCase();
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

  // Handle HTTP 401 Unauthorized with single-flight refresh
  if (
    response.status === 401 &&
    !options._retry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh')
  ) {
    if (!refreshPromise) {
      refreshPromise = executeTokenRefresh();
    }

    const newAccessToken = await refreshPromise;

    if (newAccessToken) {
      // Retry original request with newly refreshed token
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);
      const refreshedCsrf = getMemoryCsrfToken();
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

  const data = (await response.json()) as ApiResponse<T>;
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
