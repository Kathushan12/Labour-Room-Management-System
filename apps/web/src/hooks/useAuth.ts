import { useContext } from 'react';
import { AuthContext, AuthContextType } from '../context/AuthContext.js';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      role: null,
      permissions: [],
      accessToken: null,
      csrfToken: null,
      isAuthenticated: false,
      mustChangePassword: false,
      isLoading: false,
      error: null,
      login: async () => {},
      logout: async () => {},
      changePassword: async () => {},
      refreshSession: async () => false,
      clearError: () => {},
    };
  }
  return context;
}
