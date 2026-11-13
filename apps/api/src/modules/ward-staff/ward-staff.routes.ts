import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth.middleware.js';
import { Permission } from '@lrms/shared';
import { wardStaffController } from './ward-staff.controller.js';

export const wardStaffRouter = Router({ mergeParams: true });

wardStaffRouter.use(authenticate);

wardStaffRouter.get(
  '/',
  requirePermission(Permission.WARD_STAFF_VIEW),
  wardStaffController.listWardStaff.bind(wardStaffController),
);

wardStaffRouter.post(
  '/',
  requirePermission(Permission.WARD_STAFF_MANAGE),
  wardStaffController.assignStaff.bind(wardStaffController),
);

wardStaffRouter.delete(
  '/:assignmentId',
  requirePermission(Permission.WARD_STAFF_MANAGE),
  wardStaffController.endAssignment.bind(wardStaffController),
);
