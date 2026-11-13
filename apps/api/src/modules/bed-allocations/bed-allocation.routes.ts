import { Router } from 'express';
import { Permission } from '@lrms/shared';
import { authenticate, requirePermission } from '../../common/middleware/auth.middleware.js';
import {
  allocateBedHandler,
  transferBedHandler,
  releaseBedHandler,
  getAdmissionBedHistoryHandler,
} from './bed-allocation.controller.js';

export const bedAllocationRouter = Router();

bedAllocationRouter.post(
  '/',
  authenticate,
  requirePermission(Permission.BEDS_ALLOCATE),
  allocateBedHandler,
);

bedAllocationRouter.post(
  '/:id/transfer',
  authenticate,
  requirePermission(Permission.BEDS_TRANSFER),
  transferBedHandler,
);

bedAllocationRouter.post(
  '/:id/release',
  authenticate,
  requirePermission(Permission.BEDS_RELEASE),
  releaseBedHandler,
);

bedAllocationRouter.get(
  '/admission/:id',
  authenticate,
  requirePermission(Permission.BEDS_VIEW),
  getAdmissionBedHistoryHandler,
);
