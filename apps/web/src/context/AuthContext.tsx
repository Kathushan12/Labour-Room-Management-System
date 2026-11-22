import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  AuthUser,
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  LoginResponse,
  ApiResponse,
} from '@lrms/shared';
import { env } from '../config/env.js';
import {
  establishSession,
  getAccessToken,
  getCsrfToken,
  loginRequest,
  refreshSession as refreshSharedSession,
  signOut,
  subscribeSession,
} from '../services/auth-session.js';

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

const RESTORE_RETRY_WINDOW_MS = 30 * 1000;
const RESTORE_RETRY_DELAY_MS = 2000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(
    () =>
      subscribeSession((snapshot, notice) => {
        setUser(snapshot.user);
        setAccessToken(snapshot.accessToken);
        if (notice) setError(notice);
      }),
    [],
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const outcome = await refreshSharedSession();
    return outcome.status === 'ok';
  }, []);

  // Restore the session on startup; while the API is restarting, keep retrying briefly
  // instead of treating the user as signed out.
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const deadline = Date.now() + RESTORE_RETRY_WINDOW_MS;
      try {
        for (;;) {
          const outcome = await refreshSharedSession(null);
          if (outcome.status !== 'unavailable' || !mounted) return;
          if (Date.now() > deadline) {
            setError(
              'Cannot reach the LRMS server. Check that it is running and that this device is online.',
            );
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, RESTORE_RETRY_DELAY_MS));
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    setError(null);
    try {
      await loginRequest(username, password);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
      setError(message);
      throw err;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    setError(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const csrf = getCsrfToken();
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }

    const res = await fetch(`${env.API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const body = (await res.json().catch(() => null)) as ApiResponse<LoginResponse> | null;

    if (!res.ok || !body?.success || !body.data) {
      const errorMsg = body?.error?.message || 'Unable to update password. Please verify inputs.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    establishSession(body.data);
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await signOut('manual');
    } finally {
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
        csrfToken: accessToken ? getCsrfToken() : null,
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
