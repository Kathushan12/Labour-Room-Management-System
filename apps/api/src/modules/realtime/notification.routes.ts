import { Router } from 'express';
import {
  createAuthenticateMiddleware,
  requirePermission,
} from '../../common/middleware/auth.middleware.js';
import { Permission } from '@lrms/shared';
import { notificationController } from './notification.controller.js';

const router = Router();
const authenticate = createAuthenticateMiddleware();

router.use(authenticate);

router.get(
  '/',
  requirePermission(Permission.NOTIFICATIONS_VIEW),
  notificationController.getNotifications.bind(notificationController),
);

router.get(
  '/unread-count',
  requirePermission(Permission.NOTIFICATIONS_VIEW),
  notificationController.getUnreadCount.bind(notificationController),
);

router.get(
  '/:id',
  requirePermission(Permission.NOTIFICATIONS_VIEW),
  notificationController.getNotificationById.bind(notificationController),
);

router.patch(
  '/:id/read',
  requirePermission(Permission.NOTIFICATIONS_MARK_READ),
  notificationController.markAsRead.bind(notificationController),
);

router.post(
  '/:id/read',
  requirePermission(Permission.NOTIFICATIONS_MARK_READ),
  notificationController.markAsRead.bind(notificationController),
);

router.post(
  '/read-all',
  requirePermission(Permission.NOTIFICATIONS_MARK_READ),
  notificationController.markAllAsRead.bind(notificationController),
);

export const notificationRoutes = router;
