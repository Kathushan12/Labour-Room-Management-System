import { DataSource } from 'typeorm';
import { AppDataSource } from '../../config/database.js';
import { NotificationOutbox } from '../../database/entities/NotificationOutbox.js';
import {
  NotificationPriority,
  NotificationProcessingStatus,
  NotificationType,
  SocketEvent,
} from '@lrms/shared';
import { notificationRecipientService } from './notification-recipient.service.js';
import { notificationService } from './notification.service.js';
import { emitToUser, emitToAdmission } from './realtime.server.js';
import { logger } from '../../common/logging/logger.js';

export class NotificationDispatcherService {
  private timer: NodeJS.Timeout | null = null;
  private inFlightPromise: Promise<number> | null = null;

  constructor(private dataSource: DataSource = AppDataSource) {}

  /**
   * Starts background outbox polling loop.
   */
  start(intervalMs = 1000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.dispatchNow().catch((err) => {
        logger.error({ service: 'outbox-dispatcher', err }, 'Error in outbox dispatcher poll');
      });
    }, intervalMs);
    logger.info({ service: 'outbox-dispatcher', intervalMs }, 'Outbox dispatcher started');
  }

  /**
   * Stops background outbox polling loop.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info({ service: 'outbox-dispatcher' }, 'Outbox dispatcher stopped');
    }
  }

  /**
   * Triggers an immediate dispatch pass.
   * If a dispatch pass is currently in flight, waits for it before executing.
   */
  async dispatchNow(batchSize = 20): Promise<number> {
    if (!this.dataSource.isInitialized) {
      return 0;
    }

    while (this.inFlightPromise) {
      try {
        await this.inFlightPromise;
      } catch {
        // ignore errors from in-flight pass
      }
    }

    const currentPromise = this.processBatch(batchSize);
    this.inFlightPromise = currentPromise;
    try {
      return await currentPromise;
    } finally {
      if (this.inFlightPromise === currentPromise) {
        this.inFlightPromise = null;
      }
    }
  }

  /**
   * Claims and dispatches pending events using SELECT ... FOR UPDATE SKIP LOCKED.
   */
  private async processBatch(batchSize: number): Promise<number> {
    if (!this.dataSource.isInitialized) {
      return 0;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let processedCount = 0;

    try {
      await queryRunner.startTransaction();

      // Claim pending outbox records safely avoiding lock contention
      const pendingEvents = await queryRunner.manager
        .createQueryBuilder(NotificationOutbox, 'outbox')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('outbox.processing_status = :pendingStatus', {
          pendingStatus: NotificationProcessingStatus.PENDING,
        })
        .andWhere('(outbox.next_attempt_at IS NULL OR outbox.next_attempt_at <= :now)', {
          now: new Date(),
        })
        .orderBy('outbox.created_at', 'ASC')
        .take(batchSize)
        .getMany();

      if (pendingEvents.length === 0) {
        await queryRunner.commitTransaction();
        return 0;
      }

      for (const event of pendingEvents) {
        try {
          const payload = event.eventPayload as Record<string, any>;
          const priority: NotificationPriority = payload.priority || NotificationPriority.ROUTINE;
          const notificationType: NotificationType = event.eventType as NotificationType;

          // 1. Resolve authorized recipients
          const recipientIds = await notificationRecipientService.resolveRecipients({
            eventType: notificationType,
            priority,
            admissionId: event.admissionId,
            wardId: payload.wardId,
            explicitRecipientUserId: payload.assignedRecipientUserId || payload.recipientUserId,
            initiatorUserId: payload.initiatedByUserId,
          });

          const title = payload.title || this.deriveTitle(notificationType, payload);
          const safeMessage =
            payload.safeMessage ||
            payload.clinicalIndication ||
            payload.reason ||
            payload.summary ||
            'Clinical alert event';

          // 2. Persist user notification for each recipient and dispatch real-time socket
          for (const recipientId of recipientIds) {
            const notif = await notificationService.createNotification(
              {
                recipientUserId: recipientId,
                outboxEventId: event.id,
                notificationType,
                priority,
                title,
                safeMessage,
                resourceType: event.aggregateType || 'Admission',
                resourceId: event.aggregateId || event.admissionId || event.id,
                admissionId: event.admissionId,
                expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
              },
              queryRunner.manager,
            );

            // Emit to private user room
            emitToUser(recipientId, SocketEvent.NOTIFICATION_NEW, {
              id: notif.id,
              notificationType: notif.notificationType,
              priority: notif.priority,
              title: notif.title,
              safeMessage: notif.safeMessage,
              resourceType: notif.resourceType,
              resourceId: notif.resourceId,
              admissionId: notif.admissionId,
              createdAt: notif.createdAt.toISOString(),
            });

            // Special high-priority alerts
            if (priority === NotificationPriority.EMERGENCY) {
              emitToUser(recipientId, SocketEvent.ALERT_EMERGENCY, {
                notificationId: notif.id,
                eventType: notificationType,
                priority,
                title: notif.title,
                safeMessage: notif.safeMessage,
                resourceType: notif.resourceType,
                resourceId: notif.resourceId,
                admissionId: notif.admissionId,
                timestamp: notif.createdAt.toISOString(),
              });
            } else if (priority === NotificationPriority.URGENT) {
              emitToUser(recipientId, SocketEvent.ALERT_ESCALATION, {
                notificationId: notif.id,
                eventType: notificationType,
                priority,
                title: notif.title,
                safeMessage: notif.safeMessage,
                resourceType: notif.resourceType,
                resourceId: notif.resourceId,
                admissionId: notif.admissionId,
                timestamp: notif.createdAt.toISOString(),
              });
            }
          }

          // Also emit to admission room if admissionId is present
          if (event.admissionId) {
            emitToAdmission(event.admissionId, SocketEvent.NOTIFICATION_NEW, {
              id: event.id,
              notificationType,
              priority,
              title,
              safeMessage,
              resourceType: event.aggregateType || 'Admission',
              resourceId: event.aggregateId || event.admissionId,
              admissionId: event.admissionId,
              createdAt: event.createdAt.toISOString(),
            });
          }

          // Mark outbox event as PROCESSED
          event.processingStatus = NotificationProcessingStatus.PROCESSED;
          event.processedAt = new Date();
          await queryRunner.manager.save(NotificationOutbox, event);
          processedCount++;
        } catch (eventErr) {
          logger.error(
            { service: 'outbox-dispatcher', eventId: event.id, err: eventErr },
            'Failed processing outbox event',
          );
          event.attemptCount += 1;
          if (event.attemptCount >= 5) {
            event.processingStatus = NotificationProcessingStatus.DEAD_LETTER;
          } else {
            // Exponential backoff
            const delayMs = Math.pow(2, event.attemptCount) * 1000;
            event.nextAttemptAt = new Date(Date.now() + delayMs);
          }
          event.lastErrorMessage = (eventErr as Error).message || String(eventErr);
          await queryRunner.manager.save(NotificationOutbox, event);
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      logger.error({ service: 'outbox-dispatcher', err }, 'Failed batch outbox processing');
    } finally {
      await queryRunner.release();
    }

    return processedCount;
  }

  private deriveTitle(type: NotificationType, payload: Record<string, any>): string {
    switch (type) {
      case NotificationType.EMERGENCY_RESPONSE_INITIATED:
        return `EMERGENCY: ${payload.category || 'Acute Obstetric Emergency'}`;
      case NotificationType.EMERGENCY_RESPONSE_ACKNOWLEDGED:
        return `Emergency Response Acknowledged (${payload.referenceId || ''})`;
      case NotificationType.EMERGENCY_RESPONSE_RESOLVED:
        return `Emergency Resolved (${payload.referenceId || ''})`;
      case NotificationType.CLINICAL_ESCALATION_CREATED:
        return `Clinical Escalation: ${payload.category || ''} (${payload.priority || ''})`;
      case NotificationType.CLINICAL_ESCALATION_ACKNOWLEDGED:
        return `Escalation Acknowledged (${payload.referenceId || ''})`;
      case NotificationType.CLINICAL_ESCALATION_ESCALATED:
        return `Escalation Advanced to Senior Tier (${payload.referenceId || ''})`;
      case NotificationType.CLINICAL_ESCALATION_RESOLVED:
        return `Escalation Resolved (${payload.referenceId || ''})`;
      case NotificationType.SURGICAL_REVIEW_REQUESTED:
        return `Surgical Review Requested (${payload.referenceId || ''})`;
      case NotificationType.SURGICAL_DECISION_RECORDED:
        return `Surgical Decision: ${payload.decision || ''}`;
      case NotificationType.THEATRE_READINESS_UPDATED:
        return `Theatre Readiness Updated (${payload.referenceId || ''})`;
      case NotificationType.CARE_PLAN_APPROVAL_REQUIRED:
        return `Care Plan Requires Medical Approval (${payload.referenceId || ''})`;
      case NotificationType.CARE_PLAN_APPROVED:
        return `Care Plan Approved (${payload.referenceId || ''})`;
      case NotificationType.CARE_PLAN_REVIEW_DUE:
        return `Care Plan Review Due (${payload.referenceId || ''})`;
      case NotificationType.CARE_PLAN_REVIEW_OVERDUE:
        return `OVERDUE: Care Plan Review (${payload.referenceId || ''})`;
      case NotificationType.PATIENT_RESPONSIBILITY_ASSIGNED:
        return `Patient Clinical Responsibility Assigned`;
      case NotificationType.DELIVERY_RECORDED:
        return `Delivery Event Recorded (${payload.deliveryReferenceId || ''})`;
      case NotificationType.DELIVERY_FINALIZED:
        return `Delivery Finalized (${payload.deliveryReferenceId || ''})`;
      case NotificationType.NEWBORN_REGISTERED:
        return `Newborn Registered (${payload.newbornReferenceId || ''})`;
      case NotificationType.BIRTH_REGISTERED:
        return `Birth Registered (${payload.newbornReferenceId || ''})`;
      case NotificationType.APGAR_RECORDED:
        return `Apgar Recorded: Score ${payload.totalScore ?? ''} at ${payload.assessmentMinute ?? ''}`;
      case NotificationType.POSTPARTUM_REVIEW_COMPLETED:
        return `Postpartum Review Completed (${payload.clinicalReviewStatus || ''})`;
      case NotificationType.MATERNAL_DISCHARGE_AUTHORIZED:
        return `Maternal Discharge Authorized (${payload.admissionId || ''})`;
      case NotificationType.NEWBORN_DISCHARGE_AUTHORIZED:
        return `Newborn Discharge Authorized (${payload.newbornReferenceId || ''})`;
      default:
        return `Clinical Notification`;
    }
  }
}

export const notificationDispatcherService = new NotificationDispatcherService();
