import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { RolePreviewProvider } from './hooks/useRolePreview.js';
import { AppRoutes } from './app/AppRoutes.js';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RolePreviewProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RolePreviewProvider>
    </AuthProvider>
  );
};
