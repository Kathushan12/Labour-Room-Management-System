import { Router } from 'express';
import { Permission } from '@lrms/shared';
import { authenticate, requirePermission } from '../../common/middleware/auth.middleware.js';
import {
  listBedsHandler,
  getBedHandler,
  createBedHandler,
  updateBedMaintenanceHandler,
  startBedCleaningHandler,
  completeBedCleaningHandler,
  getBedCleaningHistoryHandler,
} from './bed.controller.js';

export const bedRouter = Router();

bedRouter.get(
  '/ward/:wardId',
  authenticate,
  requirePermission(Permission.BEDS_VIEW),
  listBedsHandler,
);

bedRouter.post(
  '/ward/:wardId',
  authenticate,
  requirePermission(Permission.BEDS_CONFIGURE),
  createBedHandler,
);

bedRouter.get('/:id', authenticate, requirePermission(Permission.BEDS_VIEW), getBedHandler);

bedRouter.patch(
  '/:id/maintenance',
  authenticate,
  requirePermission(Permission.BEDS_MARK_OUT_OF_SERVICE),
  updateBedMaintenanceHandler,
);

bedRouter.post(
  '/:id/cleaning/start',
  authenticate,
  requirePermission(Permission.BEDS_CLEANING_START),
  startBedCleaningHandler,
);

bedRouter.post(
  '/:id/cleaning/complete',
  authenticate,
  requirePermission(Permission.BEDS_CLEANING_COMPLETE),
  completeBedCleaningHandler,
);

bedRouter.get(
  '/:id/cleaning-history',
  authenticate,
  requirePermission(Permission.BEDS_VIEW),
  getBedCleaningHistoryHandler,
);
