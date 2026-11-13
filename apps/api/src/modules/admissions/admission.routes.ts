import { Router } from 'express';
import { Permission } from '@lrms/shared';
import {
  authenticate,
  requireAnyPermission,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import {
  createTriageHandler,
  getAdmissionByIdHandler,
  listAdmissionsHandler,
  listRiskFlagsHandler,
  updateAdmissionRiskFlagsHandler,
} from './admission.controller.js';
import {
  admissionAllocateBedHandler,
  getAdmissionBedHistoryHandler,
} from '../bed-allocations/bed-allocation.controller.js';
import { patientAssignmentController } from '../patient-assignments/patient-assignment.controller.js';

export const admissionRouter = Router();

admissionRouter.use(authenticate);

// Unassigned admissions triage queue (defined before :id parameter matching)
admissionRouter.get(
  '/unassigned',
  requirePermission(Permission.PATIENT_STAFF_VIEW),
  patientAssignmentController.listUnassignedAdmissions.bind(patientAssignmentController),
);

// Risk flag reference catalog (defined before :id parameter matching)
admissionRouter.get(
  '/risk-flags',
  requireAnyPermission([
    Permission.ADMISSIONS_VIEW,
    Permission.ADMISSIONS_CREATE,
    Permission.REPORTS_VIEW_DEIDENTIFIED,
  ]),
  listRiskFlagsHandler,
);

// Atomic Rapid Triage intake endpoint (NURSE_STAFF)
admissionRouter.post(
  '/triage',
  requirePermission(Permission.ADMISSIONS_CREATE),
  createTriageHandler,
);

// Paginated Admission Register (de-identified summaries, row-scoped by clinician assignment)
admissionRouter.get(
  '/',
  requireAnyPermission([Permission.ADMISSIONS_VIEW, Permission.REPORTS_VIEW_DEIDENTIFIED]),
  listAdmissionsHandler,
);

// Individual Admission Detail (patient-level authorization enforced)
admissionRouter.get('/:id', requirePermission(Permission.ADMISSIONS_VIEW), getAdmissionByIdHandler);

// Risk flag updates on active admission
admissionRouter.patch(
  '/:id/risk-flags',
  requirePermission(Permission.ADMISSIONS_TOGGLE_RISK_FLAGS),
  updateAdmissionRiskFlagsHandler,
);

// Bed Allocation & History
admissionRouter.post(
  '/:id/bed-allocation',
  requirePermission(Permission.BEDS_ALLOCATE),
  admissionAllocateBedHandler,
);

admissionRouter.get(
  '/:id/bed-history',
  requirePermission(Permission.BEDS_VIEW),
  getAdmissionBedHistoryHandler,
);

// Patient Staff Responsibility
admissionRouter.get(
  '/:admissionId/staff',
  requirePermission(Permission.PATIENT_STAFF_VIEW),
  patientAssignmentController.getStaffResponsibility.bind(patientAssignmentController),
);

admissionRouter.post(
  '/:admissionId/staff',
  requirePermission(Permission.ASSIGNMENTS_CREATE),
  patientAssignmentController.assignStaff.bind(patientAssignmentController),
);

admissionRouter.post(
  '/:admissionId/staff/transfer',
  requirePermission(Permission.ASSIGNMENTS_REASSIGN),
  patientAssignmentController.transferStaff.bind(patientAssignmentController),
);

admissionRouter.delete(
  '/:admissionId/staff/:assignmentId',
  requirePermission(Permission.ASSIGNMENTS_REASSIGN),
  patientAssignmentController.endAssignment.bind(patientAssignmentController),
);
