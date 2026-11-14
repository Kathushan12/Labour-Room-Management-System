import { z } from 'zod';
import { NotificationPriority, NotificationType } from '@lrms/shared';

export const notificationQuerySchema = z.object({
  priority: z.nativeEnum(NotificationPriority).optional(),
  notificationType: z.nativeEnum(NotificationType).optional(),
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  cursor: z.string().uuid().optional(),
  since: z.string().datetime().optional(),
});

export const markNotificationReadParamsSchema = z.object({
  id: z.string().uuid('Invalid notification ID format'),
});

export const roomSubscriptionSchema = z.object({
  room: z.string().min(3).max(100),
});
