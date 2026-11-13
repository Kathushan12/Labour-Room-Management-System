import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { AlertReceiptState } from '@lrms/shared';
import type { EmergencyAlert } from './EmergencyAlert.js';
import type { User } from './User.js';

@Entity('alert_recipients')
@Unique(['alertId', 'recipientUserId'])
export class AlertRecipient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'alert_id', type: 'uuid' })
  @Index('idx_alert_recipients_alert_id')
  alertId!: string;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  @Index('idx_alert_recipients_user_id')
  recipientUserId!: string;

  @Column({
    name: 'receipt_state',
    type: 'varchar',
    length: 30,
    default: AlertReceiptState.DISPATCHED,
  })
  @Index('idx_alert_recipients_receipt_state')
  receiptState!: AlertReceiptState;

  @Column({ name: 'dispatched_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  dispatchedAt!: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ name: 'acknowledged_by_user_id', type: 'uuid', nullable: true })
  acknowledgedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('EmergencyAlert', 'recipients', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert!: EmergencyAlert;

  @ManyToOne('User')
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser!: User;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'acknowledged_by_user_id' })
  acknowledgedByUser!: User | null;
}
