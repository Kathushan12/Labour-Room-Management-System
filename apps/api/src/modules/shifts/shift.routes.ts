import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth.middleware.js';
import { Permission } from '@lrms/shared';
import { shiftController } from './shift.controller.js';

export const shiftRouter = Router({ mergeParams: true });

shiftRouter.use(authenticate);

// On-Duty Roster
shiftRouter.get(
  '/on-duty',
  requirePermission(Permission.SHIFTS_VIEW),
  shiftController.getOnDutyRoster.bind(shiftController),
);

// Shifts CRUD
shiftRouter.get(
  '/',
  requirePermission(Permission.SHIFTS_VIEW),
  shiftController.listShifts.bind(shiftController),
);

shiftRouter.get(
  '/:shiftId',
  requirePermission(Permission.SHIFTS_VIEW),
  shiftController.getShift.bind(shiftController),
);

shiftRouter.post(
  '/',
  requirePermission(Permission.SHIFTS_MANAGE),
  shiftController.createShift.bind(shiftController),
);

shiftRouter.patch(
  '/:shiftId',
  requirePermission(Permission.SHIFTS_MANAGE),
  shiftController.updateShift.bind(shiftController),
);

// Shift Staff Assignments
shiftRouter.post(
  '/:shiftId/staff',
  requirePermission(Permission.SHIFT_ASSIGNMENTS_MANAGE),
  shiftController.assignStaff.bind(shiftController),
);

shiftRouter.delete(
  '/:shiftId/staff/:assignmentId',
  requirePermission(Permission.SHIFT_ASSIGNMENTS_MANAGE),
  shiftController.cancelStaff.bind(shiftController),
);

// Shift Handovers
shiftRouter.get(
  '/:shiftId/handovers',
  requirePermission(Permission.SHIFTS_VIEW),
  shiftController.listHandovers.bind(shiftController),
);

shiftRouter.post(
  '/:shiftId/handovers',
  requirePermission(Permission.HANDOVERS_CREATE),
  shiftController.createHandover.bind(shiftController),
);

shiftRouter.patch(
  '/:shiftId/handovers/:handoverId/acknowledge',
  requirePermission(Permission.HANDOVERS_ACKNOWLEDGE),
  shiftController.acknowledgeHandover.bind(shiftController),
);
