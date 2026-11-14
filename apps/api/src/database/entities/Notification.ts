import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { NotificationPriority, NotificationType } from '@lrms/shared';
import type { User } from './User.js';
import type { Admission } from './Admission.js';
import type { NotificationOutbox } from './NotificationOutbox.js';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  @Index('idx_notifications_recipient_user_id')
  recipientUserId!: string;

  @Column({ name: 'outbox_event_id', type: 'uuid', nullable: true })
  outboxEventId!: string | null;

  @Column({ name: 'notification_type', type: 'varchar', length: 50 })
  notificationType!: NotificationType;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationPriority.ROUTINE,
  })
  @Index('idx_notifications_priority')
  priority!: NotificationPriority;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'safe_message', type: 'text' })
  safeMessage!: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 50 })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId!: string;

  @Column({ name: 'admission_id', type: 'uuid', nullable: true })
  @Index('idx_notifications_admission_id')
  admissionId!: string | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index('idx_notifications_created_at')
  createdAt!: Date;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser!: User;

  @ManyToOne('Admission', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission | null;

  @ManyToOne('NotificationOutbox', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'outbox_event_id' })
  outboxEvent!: NotificationOutbox | null;
}
