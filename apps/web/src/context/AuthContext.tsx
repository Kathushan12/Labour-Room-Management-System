import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  AuthUser,
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  LoginResponse,
  RefreshResponse,
  ApiResponse,
} from '@lrms/shared';
import { env } from '../config/env.js';

export interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  permissions: Permission[];
  accessToken: string | null;
  csrfToken: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In-memory token storage (NEVER in localStorage or sessionStorage)
let memoryAccessToken: string | null = null;
let memoryCsrfToken: string | null = null;
let sessionSyncListener: ((data: RefreshResponse | null) => void) | null = null;

export function getMemoryAccessToken(): string | null {
  return memoryAccessToken;
}

export function getMemoryCsrfToken(): string | null {
  return memoryCsrfToken;
}

export function syncMemoryTokensFromInterceptor(data: RefreshResponse | null): void {
  if (data) {
    memoryAccessToken = data.accessToken;
    memoryCsrfToken = data.csrfToken;
  } else {
    memoryAccessToken = null;
    memoryCsrfToken = null;
  }
  if (sessionSyncListener) {
    sessionSyncListener(data);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const updateTokens = useCallback((newAccessToken: string | null, newCsrfToken: string | null) => {
    memoryAccessToken = newAccessToken;
    memoryCsrfToken = newCsrfToken;
    setAccessToken(newAccessToken);
    setCsrfToken(newCsrfToken);
  }, []);

  useEffect(() => {
    sessionSyncListener = (data) => {
      if (data) {
        setUser(data.user);
        setAccessToken(data.accessToken);
        setCsrfToken(data.csrfToken);
      } else {
        setUser(null);
        setAccessToken(null);
        setCsrfToken(null);
      }
    };
    return () => {
      sessionSyncListener = null;
    };
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (memoryCsrfToken) {
        headers['X-CSRF-Token'] = memoryCsrfToken;
      }

      const res = await fetch(`${env.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include', // Sends HttpOnly refreshToken cookie
      });

      if (!res.ok) {
        updateTokens(null, null);
        setUser(null);
        return false;
      }

      const body: ApiResponse<RefreshResponse> = await res.json();
      if (body.success && body.data) {
        setUser(body.data.user);
        updateTokens(body.data.accessToken, body.data.csrfToken);
        return true;
      }

      updateTokens(null, null);
      setUser(null);
      return false;
    } catch {
      updateTokens(null, null);
      setUser(null);
      return false;
    }
  }, [updateTokens]);

  // Initial session restoration on application startup
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        await refreshSession();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  const login = async (username: string, password: string): Promise<void> => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${env.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const body: ApiResponse<LoginResponse> = await res.json();

      if (!res.ok || !body.success || !body.data) {
        const errorMsg = body.error?.message || 'Login failed. Please verify your credentials.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      setUser(body.data.user);
      updateTokens(body.data.accessToken, body.data.csrfToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    setError(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (memoryAccessToken) {
      headers['Authorization'] = `Bearer ${memoryAccessToken}`;
    }
    if (memoryCsrfToken) {
      headers['X-CSRF-Token'] = memoryCsrfToken;
    }

    const res = await fetch(`${env.API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const body: ApiResponse<LoginResponse> = await res.json();

    if (!res.ok || !body.success || !body.data) {
      const errorMsg = body.error?.message || 'Unable to update password. Please verify inputs.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setUser(body.data.user);
    updateTokens(body.data.accessToken, body.data.csrfToken);
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (memoryCsrfToken) {
        headers['X-CSRF-Token'] = memoryCsrfToken;
      }

      await fetch(`${env.API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout to allow clean client-side exit
    } finally {
      updateTokens(null, null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const role = user ? user.role : null;
  const mustChangePassword = Boolean(user?.mustChangePassword);
  const permissions = !user
    ? []
    : mustChangePassword
      ? [Permission.USERS_CHANGE_PASSWORD]
      : ROLE_PERMISSIONS[user.role] || [];
  const isAuthenticated = Boolean(user && accessToken);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions,
        accessToken,
        csrfToken,
        isAuthenticated,
        mustChangePassword,
        isLoading,
        error,
        login,
        logout,
        changePassword,
        refreshSession,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
