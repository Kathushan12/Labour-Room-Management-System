import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Notification } from './Notification.js';
import type { User } from './User.js';

@Entity('notification_delivery_attempts')
export class NotificationDeliveryAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'notification_id', type: 'uuid' })
  @Index('idx_notif_delivery_attempts_notif_id')
  notificationId!: string;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  @Index('idx_notif_delivery_attempts_user_id')
  recipientUserId!: string;

  @Column({ name: 'delivery_channel', type: 'varchar', length: 30, default: 'SOCKET_IO' })
  deliveryChannel!: string;

  @Column({ type: 'varchar', length: 30, default: 'DELIVERED' })
  status!: string;

  @CreateDateColumn({ name: 'attempted_at', type: 'timestamptz' })
  attemptedAt!: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'error_code', type: 'varchar', length: 50, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @ManyToOne('Notification', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification!: Notification;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser!: User;
}
