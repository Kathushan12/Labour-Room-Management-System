import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service.js';
import { notificationQuerySchema, markNotificationReadParamsSchema } from './realtime.schemas.js';

export class NotificationController {
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = notificationQuerySchema.parse(req.query);
      const result = await notificationService.getNotifications(req.user!, filters);
      res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.getUnreadCount(req.user!);
      res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }

  async getNotificationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = markNotificationReadParamsSchema.parse(req.params);
      const result = await notificationService.getNotificationById(req.user!, id);
      res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = markNotificationReadParamsSchema.parse(req.params);
      const result = await notificationService.markAsRead(req.user!, id);
      res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAllAsRead(req.user!);
      res.status(200).json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
