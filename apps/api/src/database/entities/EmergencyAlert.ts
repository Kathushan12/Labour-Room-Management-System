import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AlertSeverity } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { CarePlanTransition } from './CarePlanTransition.js';
import type { User } from './User.js';
import type { AlertRecipient } from './AlertRecipient.js';
import type { AlertDeliveryAttempt } from './AlertDeliveryAttempt.js';

@Entity('emergency_alerts')
export class EmergencyAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_emergency_alerts_admission_id')
  admissionId!: string;

  @Column({ name: 'care_plan_transition_id', type: 'uuid', nullable: true })
  carePlanTransitionId!: string | null;

  @Column({ name: 'initiated_by_user_id', type: 'uuid' })
  initiatedByUserId!: string;

  @Column({ name: 'alert_type', type: 'varchar', length: 50 })
  alertType!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: AlertSeverity.EMERGENCY,
  })
  severity!: AlertSeverity;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, unique: true })
  @Index('idx_emergency_alerts_idempotency_key')
  idempotencyKey!: string;

  @Column({ name: 'alert_message', type: 'text' })
  alertMessage!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', 'emergencyAlerts', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('CarePlanTransition', 'emergencyAlerts', { nullable: true })
  @JoinColumn({ name: 'care_plan_transition_id' })
  carePlanTransition!: CarePlanTransition | null;

  @ManyToOne('User')
  @JoinColumn({ name: 'initiated_by_user_id' })
  initiatedByUser!: User;

  @OneToMany('AlertRecipient', 'alert', { cascade: true })
  recipients!: AlertRecipient[];

  @OneToMany('AlertDeliveryAttempt', 'alert')
  deliveryAttempts!: AlertDeliveryAttempt[];
}
