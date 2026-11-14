import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { NotificationProcessingStatus } from '@lrms/shared';

@Entity('notification_outbox')
export class NotificationOutbox {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, unique: true })
  @Index('idx_notification_outbox_idempotency_key')
  idempotencyKey!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  @Index('idx_notification_outbox_event_type')
  eventType!: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 50, nullable: true })
  @Index('idx_notification_outbox_aggregate')
  aggregateType!: string | null;

  @Column({ name: 'aggregate_id', type: 'uuid', nullable: true })
  aggregateId!: string | null;

  @Column({ name: 'admission_id', type: 'uuid', nullable: true })
  @Index('idx_notification_outbox_admission_id')
  admissionId!: string | null;

  // Payloads MUST be free from patient PII and raw clinical narratives per security architecture
  @Column({ name: 'event_payload', type: 'jsonb' })
  eventPayload!: Record<string, unknown>;

  @Column({
    name: 'processing_status',
    type: 'varchar',
    length: 30,
    default: NotificationProcessingStatus.PENDING,
  })
  @Index('idx_notification_outbox_status_next_attempt', ['processingStatus', 'nextAttemptAt'])
  processingStatus!: NotificationProcessingStatus;

  @Column({ name: 'attempt_count', type: 'integer', default: 0 })
  attemptCount!: number;

  @Column({ name: 'next_attempt_at', type: 'timestamptz', nullable: true })
  nextAttemptAt!: Date | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ name: 'last_error_code', type: 'varchar', length: 100, nullable: true })
  lastErrorCode!: string | null;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
