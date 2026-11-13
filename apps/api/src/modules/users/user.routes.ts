import express, { Router } from 'express';
import { UserRole, Permission } from '@lrms/shared';
import {
  authenticate,
  requireRole,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import {
  listUsersHandler,
  getUserByIdHandler,
  createUserHandler,
  updateUserProfileHandler,
  updateUserStatusHandler,
  updateUserRoleHandler,
  reissueCredentialHandler,
} from './user.controller.js';

export const userRouter: Router = express.Router();

// Every route under /api/v1/users requires authenticated ADMIN with password change completed
userRouter.use(authenticate, requireRole([UserRole.ADMIN]));

userRouter.get('/', requirePermission(Permission.USERS_VIEW), listUsersHandler);
userRouter.get('/:id', requirePermission(Permission.USERS_VIEW), getUserByIdHandler);
userRouter.post('/', requirePermission(Permission.USERS_CREATE), createUserHandler);
userRouter.patch('/:id', requirePermission(Permission.USERS_UPDATE), updateUserProfileHandler);
userRouter.patch(
  '/:id/status',
  (req, res, next) => {
    const requiredPerm =
      req.body && req.body.isActive === true
        ? Permission.USERS_ACTIVATE
        : Permission.USERS_DEACTIVATE;
    return requirePermission(requiredPerm)(req, res, next);
  },
  updateUserStatusHandler,
);
userRouter.patch(
  '/:id/role',
  requirePermission(Permission.USERS_MANAGE_ROLES),
  updateUserRoleHandler,
);
userRouter.post(
  '/:id/reissue-credential',
  requirePermission(Permission.USERS_RESET_CREDENTIAL),
  reissueCredentialHandler,
);
