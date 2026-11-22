import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { RolePreviewProvider } from './hooks/useRolePreview.js';
import { NotificationProvider } from './features/notifications/NotificationContext.js';
import { EmergencyAlertBanner } from './features/notifications/EmergencyAlertBanner.js';
import { ClinicalEscalationToast } from './features/notifications/ClinicalEscalationToast.js';
import { DoctorAlertOverlay } from './features/alerts/DoctorAlertOverlay.js';
import { AppRoutes } from './app/AppRoutes.js';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RolePreviewProvider>
        <NotificationProvider>
          <BrowserRouter>
            <EmergencyAlertBanner />
            <ClinicalEscalationToast />
            <DoctorAlertOverlay />
            <AppRoutes />
          </BrowserRouter>
        </NotificationProvider>
      </RolePreviewProvider>
    </AuthProvider>
  );
};
