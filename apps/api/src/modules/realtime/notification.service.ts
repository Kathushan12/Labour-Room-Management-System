import { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database.js';
import { Notification, NotificationDeliveryAttempt } from '../../database/entities/index.js';
import {
  NotificationDto,
  NotificationListResponse,
  NotificationPriority,
  NotificationQueryFilters,
  NotificationType,
  NotificationUnreadCountResponse,
} from '@lrms/shared';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { ForbiddenError, NotFoundError } from '../../common/errors/auth.errors.js';
import { logger } from '../../common/logging/logger.js';

export class NotificationService {
  constructor(private dataSource: DataSource = AppDataSource) {}

  /**
   * Persists user notification records and delivery attempt tracking.
   */
  async createNotification(
    data: {
      recipientUserId: string;
      outboxEventId?: string | null;
      notificationType: NotificationType;
      priority: NotificationPriority;
      title: string;
      safeMessage: string;
      resourceType: string;
      resourceId: string;
      admissionId?: string | null;
      expiresAt?: Date | null;
    },
    manager: EntityManager = this.dataSource.manager,
  ): Promise<Notification> {
    const notifRepo = manager.getRepository(Notification);
    const attemptRepo = manager.getRepository(NotificationDeliveryAttempt);

    const notification = notifRepo.create({
      recipientUserId: data.recipientUserId,
      outboxEventId: data.outboxEventId || null,
      notificationType: data.notificationType,
      priority: data.priority,
      title: data.title,
      safeMessage: data.safeMessage,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      admissionId: data.admissionId || null,
      expiresAt: data.expiresAt || null,
      readAt: null,
    });

    const saved = await notifRepo.save(notification);

    // Record initial delivery attempt tracking
    await attemptRepo.save(
      attemptRepo.create({
        notificationId: saved.id,
        recipientUserId: data.recipientUserId,
        deliveryChannel: 'SOCKET_IO',
        status: 'DISPATCHED',
        attemptedAt: new Date(),
      }),
    );

    return saved;
  }

  /**
   * Retrieves paginated, filterable notifications for the authenticated user.
   */
  async getNotifications(
    actor: RequestUser,
    filters: NotificationQueryFilters,
  ): Promise<NotificationListResponse> {
    const notifRepo = this.dataSource.getRepository(Notification);
    const limit = filters.limit ? Math.min(filters.limit, 100) : 20;

    const qb = notifRepo
      .createQueryBuilder('n')
      .where('n.recipientUserId = :userId', { userId: actor.id });

    if (filters.priority) {
      qb.andWhere('n.priority = :priority', { priority: filters.priority });
    }

    if (filters.notificationType) {
      qb.andWhere('n.notificationType = :notificationType', {
        notificationType: filters.notificationType,
      });
    }

    if (filters.unreadOnly) {
      qb.andWhere('n.readAt IS NULL');
    }

    if (filters.since) {
      qb.andWhere('n.createdAt > :since', { since: new Date(filters.since) });
    }

    // Cursor pagination (based on createdAt)
    if (filters.cursor) {
      const cursorNotif = await notifRepo.findOne({
        where: { id: filters.cursor, recipientUserId: actor.id },
      });
      if (cursorNotif) {
        qb.andWhere('n.createdAt < :cursorTime', { cursorTime: cursorNotif.createdAt });
      }
    }

    qb.orderBy('n.createdAt', 'DESC').take(limit + 1);

    const items = await qb.getMany();
    const hasMore = items.length > limit;
    const paginatedItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? paginatedItems[paginatedItems.length - 1]?.id : null;

    // Count total unread
    const unreadCount = await notifRepo.count({
      where: {
        recipientUserId: actor.id,
        readAt: null as any,
      },
    });

    return {
      items: paginatedItems.map(this.toDto),
      total: paginatedItems.length,
      unreadCount,
      nextCursor,
    };
  }

  /**
   * Computes unread count breakdown (total, emergency, urgent).
   */
  async getUnreadCount(actor: RequestUser): Promise<NotificationUnreadCountResponse> {
    const notifRepo = this.dataSource.getRepository(Notification);

    const counts = await notifRepo
      .createQueryBuilder('n')
      .select('n.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('n.recipientUserId = :userId', { userId: actor.id })
      .andWhere('n.readAt IS NULL')
      .groupBy('n.priority')
      .getRawMany();

    let total = 0;
    let emergency = 0;
    let urgent = 0;

    for (const row of counts) {
      const count = parseInt(row.count, 10) || 0;
      total += count;
      if (row.priority === NotificationPriority.EMERGENCY) {
        emergency += count;
      } else if (row.priority === NotificationPriority.URGENT) {
        urgent += count;
      }
    }

    return {
      unreadCount: total,
      emergencyCount: emergency,
      urgentCount: urgent,
    };
  }

  /**
   * Retrieves a single notification, verifying recipient ownership.
   */
  async getNotificationById(actor: RequestUser, id: string): Promise<NotificationDto> {
    const notifRepo = this.dataSource.getRepository(Notification);
    const notif = await notifRepo.findOne({ where: { id } });

    if (!notif) {
      throw new NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    if (notif.recipientUserId !== actor.id) {
      throw new ForbiddenError(
        'You do not have permission to view this notification',
        'NOTIFICATION_ACCESS_DENIED',
      );
    }

    return this.toDto(notif);
  }

  /**
   * Marks a specific notification as read.
   * NOTE: Marking a notification as read NEVER constitutes clinical acknowledgement.
   */
  async markAsRead(actor: RequestUser, id: string): Promise<NotificationDto> {
    const notifRepo = this.dataSource.getRepository(Notification);
    const notif = await notifRepo.findOne({ where: { id } });

    if (!notif) {
      throw new NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    if (notif.recipientUserId !== actor.id) {
      throw new ForbiddenError(
        'You do not have permission to modify this notification',
        'NOTIFICATION_ACCESS_DENIED',
      );
    }

    if (!notif.readAt) {
      notif.readAt = new Date();
      await notifRepo.save(notif);

      logger.debug(
        { service: 'notification', notificationId: notif.id, userId: actor.id },
        'Notification marked as read',
      );
    }

    return this.toDto(notif);
  }

  /**
   * Marks all unread notifications for the authenticated user as read.
   */
  async markAllAsRead(actor: RequestUser): Promise<{ count: number }> {
    const notifRepo = this.dataSource.getRepository(Notification);

    const result = await notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('recipientUserId = :userId', { userId: actor.id })
      .andWhere('readAt IS NULL')
      .execute();

    const count = result.affected ?? 0;

    logger.debug(
      { service: 'notification', userId: actor.id, markedReadCount: count },
      'All notifications marked as read',
    );

    return { count };
  }

  private toDto(n: Notification): NotificationDto {
    return {
      id: n.id,
      recipientUserId: n.recipientUserId,
      outboxEventId: n.outboxEventId,
      notificationType: n.notificationType,
      priority: n.priority,
      title: n.title,
      safeMessage: n.safeMessage,
      resourceType: n.resourceType,
      resourceId: n.resourceId,
      admissionId: n.admissionId,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}

export const notificationService = new NotificationService();
