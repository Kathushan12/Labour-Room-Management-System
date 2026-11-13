import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { EmergencyAlert } from './EmergencyAlert.js';
import type { AlertRecipient } from './AlertRecipient.js';
import type { User } from './User.js';

@Entity('alert_delivery_attempts')
export class AlertDeliveryAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'alert_id', type: 'uuid' })
  @Index('idx_alert_delivery_attempts_alert_id')
  alertId!: string;

  @Column({ name: 'recipient_id', type: 'uuid', nullable: true })
  recipientId!: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_alert_delivery_attempts_user_id')
  userId!: string;

  @Column({ name: 'attempt_number', type: 'integer' })
  attemptNumber!: number;

  @Column({ name: 'delivery_channel', type: 'varchar', length: 30, default: 'WEBSOCKET' })
  deliveryChannel!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'attempted_at', type: 'timestamptz' })
  attemptedAt!: Date;

  @ManyToOne('EmergencyAlert', 'deliveryAttempts', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert!: EmergencyAlert;

  @ManyToOne('AlertRecipient', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: AlertRecipient | null;

  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
