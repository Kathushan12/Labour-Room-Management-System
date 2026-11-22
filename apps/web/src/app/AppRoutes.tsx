import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, Permission } from '@lrms/shared';
import { AppLayout } from '../components/layout/AppLayout.js';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage.js';
import { UnauthorizedPage } from '../features/auth/UnauthorizedPage.js';
import { PrivacyNoticePage } from '../features/auth/PrivacyNoticePage.js';
import { DashboardRouter } from '../features/dashboard/DashboardRouter.js';
import { AdmissionsPage } from '../features/admissions/AdmissionsPage.js';
import { AdmissionDetailPage } from '../features/admissions/AdmissionDetailPage.js';
import { BedBoardPage } from '../features/beds/BedBoardPage.js';
import { PatientDetailPage } from '../features/patients/PatientDetailPage.js';
import { MaternalObservationsPage } from '../features/observations/MaternalObservationsPage.js';
import { FetalObservationsPage } from '../features/observations/FetalObservationsPage.js';
import { EmergencyAlertsPage } from '../features/alerts/EmergencyAlertsPage.js';
import { AuditLogsPage } from '../features/audit/AuditLogsPage.js';
import { StaffManagementPage } from '../features/staff/StaffManagementPage.js';
import { StaffDetailPage } from '../features/staff/StaffDetailPage.js';
import { ShiftManagementPage } from '../features/shifts/ShiftManagementPage.js';

// Phase 13: Operational Analytics & Management Dashboards
import {
  OperationalDashboardPage,
  AdmissionAnalyticsPage,
  DeliveryAnalyticsPage,
  BedAnalyticsPage,
  AlosAnalyticsPage,
  StaffingAnalyticsPage,
  ClinicalAlertAnalyticsPage,
  ReportsAnalyticsPage,
} from '../features/analytics/index.js';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/privacy" element={<PrivacyNoticePage />} />

      {/* Password Rotation / First-Login Password Change Gate */}
      <Route element={<ProtectedRoute allowPendingPasswordChange />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      {/* Protected Staff Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Dynamic Role-Based Dashboard */}
          <Route path="/" element={<DashboardRouter />} />

          {/* Patient Admission & Triage */}
          <Route path="/admissions" element={<AdmissionsPage />} />
          <Route element={<ProtectedRoute requiredPermission={Permission.ADMISSIONS_VIEW} />}>
            <Route path="/admissions/:id" element={<AdmissionDetailPage />} />
          </Route>

          {/* Ward Bed Board & Turnover */}
          <Route path="/beds" element={<BedBoardPage />} />

          {/* Ward Shift Scheduling & Duty Roster */}
          <Route path="/shifts" element={<ShiftManagementPage />} />

          {/* Patient Master File */}
          <Route element={<ProtectedRoute requiredPermission={Permission.PATIENTS_VIEW} />}>
            <Route path="/patients/:id" element={<PatientDetailPage />} />
          </Route>

          {/* Clinical Observations */}
          <Route path="/observations/maternal" element={<MaternalObservationsPage />} />
          <Route path="/observations/fetal" element={<FetalObservationsPage />} />

          {/* Emergency Escalations & Notifications */}
          <Route path="/alerts" element={<EmergencyAlertsPage />} />

          {/* Operational Analytics & Hospital Performance Dashboards (Phase 13) */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute requiredPermission={Permission.ANALYTICS_VIEW}>
                <OperationalDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/admissions"
            element={
              <ProtectedRoute requiredPermission={Permission.ANALYTICS_ADMISSIONS_VIEW}>
                <AdmissionAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/deliveries"
            element={
              <ProtectedRoute requiredPermission={Permission.ANALYTICS_DELIVERIES_VIEW}>
                <DeliveryAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/beds"
            element={
              <ProtectedRoute requiredPermission={Permission.ANALYTICS_BEDS_VIEW}>
                <BedAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/alos"
            element={
              <ProtectedRoute requiredPermission={Permission.ANALYTICS_ALOS_VIEW}>
                <AlosAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/staffing"
            element={
              <ProtectedRoute requiredPermission={Permission.ANALYTICS_STAFFING_VIEW}>
                <StaffingAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/alerts"
            element={
              <ProtectedRoute requiredPermission={Permission.ANALYTICS_ALERTS_VIEW}>
                <ClinicalAlertAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/reports"
            element={
              <ProtectedRoute requiredPermission={Permission.ANALYTICS_EXPORT}>
                <ReportsAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Backward compatibility route for /reports */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredPermission={Permission.ANALYTICS_EXPORT}>
                <ReportsAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Audit logs (Admin only, REQ-9.6) */}
          <Route
            path="/audit"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.ADMIN]}
                requiredPermission={Permission.REPORTS_VIEW_AUDIT_LOGS}
              >
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* Staff Directory & Authorizations (Admin only) */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.ADMIN]}
                requiredPermission={Permission.USERS_VIEW}
              >
                <StaffManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/:id"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.ADMIN]}
                requiredPermission={Permission.USERS_VIEW}
              >
                <StaffDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
