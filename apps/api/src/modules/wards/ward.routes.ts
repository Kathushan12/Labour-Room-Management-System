import { Router } from 'express';
import { Permission } from '@lrms/shared';
import { authenticate, requirePermission } from '../../common/middleware/auth.middleware.js';
import {
  listWardsHandler,
  getWardByIdHandler,
  createWardHandler,
  updateWardHandler,
  getWardBedBoardHandler,
} from './ward.controller.js';
import { wardStaffRouter } from '../ward-staff/ward-staff.routes.js';
import { shiftRouter } from '../shifts/shift.routes.js';
import { shiftController } from '../shifts/shift.controller.js';

export const wardRouter = Router();

wardRouter.get('/', authenticate, requirePermission(Permission.WARDS_VIEW), listWardsHandler);

wardRouter.post('/', authenticate, requirePermission(Permission.WARDS_MANAGE), createWardHandler);

wardRouter.get('/:id', authenticate, requirePermission(Permission.WARDS_VIEW), getWardByIdHandler);

wardRouter.patch(
  '/:id',
  authenticate,
  requirePermission(Permission.WARDS_MANAGE),
  updateWardHandler,
);

wardRouter.get(
  '/:id/bed-board',
  authenticate,
  requirePermission(Permission.BEDS_VIEW),
  getWardBedBoardHandler,
);

// On-Duty Roster shortcut
wardRouter.get(
  '/:wardId/on-duty',
  authenticate,
  requirePermission(Permission.SHIFTS_VIEW),
  shiftController.getOnDutyRoster.bind(shiftController),
);

// Ward Staff and Shifts sub-routers
wardRouter.use('/:wardId/staff', wardStaffRouter);
wardRouter.use('/:wardId/shifts', shiftRouter);
