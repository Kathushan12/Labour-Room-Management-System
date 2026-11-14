import { EntityManager } from 'typeorm';
import { NotificationOutbox } from '../../database/entities/NotificationOutbox.js';
import { NotificationProcessingStatus, NotificationType } from '@lrms/shared';
import { logger } from '../../common/logging/logger.js';

export interface RecordOutboxEventOptions {
  eventType: NotificationType;
  aggregateType: string;
  aggregateId: string;
  admissionId?: string | null;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export class OutboxService {
  /**
   * Persists an event into `notification_outbox` inside the caller's active database transaction.
   * This guarantees atomic persistence with the clinical mutation.
   */
  async recordEvent(
    manager: EntityManager,
    options: RecordOutboxEventOptions,
  ): Promise<NotificationOutbox> {
    const idempotencyKey =
      options.idempotencyKey ||
      `${options.eventType}:${options.aggregateId}:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;

    const outboxRepo = manager.getRepository(NotificationOutbox);

    const outboxRecord = outboxRepo.create({
      idempotencyKey,
      eventType: options.eventType,
      aggregateType: options.aggregateType,
      aggregateId: options.aggregateId,
      admissionId: options.admissionId || null,
      eventPayload: options.payload,
      processingStatus: NotificationProcessingStatus.PENDING,
      attemptCount: 0,
      nextAttemptAt: new Date(),
    });

    const saved = await outboxRepo.save(outboxRecord);

    logger.debug(
      {
        service: 'outbox',
        outboxId: saved.id,
        eventType: options.eventType,
        aggregateType: options.aggregateType,
        aggregateId: options.aggregateId,
      },
      'Transactional outbox event recorded',
    );

    return saved;
  }
}

export const outboxService = new OutboxService();
