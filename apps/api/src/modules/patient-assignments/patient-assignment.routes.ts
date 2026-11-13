import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth.middleware.js';
import { Permission } from '@lrms/shared';
import { patientAssignmentController } from './patient-assignment.controller.js';

export const patientAssignmentRouter = Router({ mergeParams: true });

patientAssignmentRouter.use(authenticate);

// List unassigned admissions queue
patientAssignmentRouter.get(
  '/unassigned',
  requirePermission(Permission.PATIENT_STAFF_VIEW),
  patientAssignmentController.listUnassignedAdmissions.bind(patientAssignmentController),
);

// Admission responsibility details
patientAssignmentRouter.get(
  '/:admissionId/staff',
  requirePermission(Permission.PATIENT_STAFF_VIEW),
  patientAssignmentController.getStaffResponsibility.bind(patientAssignmentController),
);

// Assign staff to admission
patientAssignmentRouter.post(
  '/:admissionId/staff',
  requirePermission(Permission.ASSIGNMENTS_CREATE),
  patientAssignmentController.assignStaff.bind(patientAssignmentController),
);

// Responsibility transfer
patientAssignmentRouter.post(
  '/:admissionId/staff/transfer',
  requirePermission(Permission.ASSIGNMENTS_REASSIGN),
  patientAssignmentController.transferStaff.bind(patientAssignmentController),
);

// End assignment
patientAssignmentRouter.delete(
  '/:admissionId/staff/:assignmentId',
  requirePermission(Permission.ASSIGNMENTS_REASSIGN),
  patientAssignmentController.endAssignment.bind(patientAssignmentController),
);
