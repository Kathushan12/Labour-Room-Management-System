import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EscalationStatus } from '@lrms/shared';
import type { ClinicalEscalation } from './ClinicalEscalation.js';
import type { User } from './User.js';

@Entity('clinical_escalation_history')
export class ClinicalEscalationHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'escalation_id', type: 'uuid' })
  @Index('idx_escalation_history_escalation_id')
  escalationId!: string;

  @Column({ name: 'from_status', type: 'varchar', length: 50, nullable: true })
  fromStatus!: EscalationStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 30 })
  toStatus!: EscalationStatus;

  @Column({ name: 'changed_by_user_id', type: 'uuid' })
  changedByUserId!: string;

  @Column({ name: 'previous_assigned_user_id', type: 'uuid', nullable: true })
  previousAssignedUserId!: string | null;

  @Column({ name: 'new_assigned_user_id', type: 'uuid', nullable: true })
  newAssignedUserId!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('ClinicalEscalation', 'history', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'escalation_id' })
  escalation!: ClinicalEscalation;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser!: User;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'previous_assigned_user_id' })
  previousAssignedUser!: User | null;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'new_assigned_user_id' })
  newAssignedUser!: User | null;
}
