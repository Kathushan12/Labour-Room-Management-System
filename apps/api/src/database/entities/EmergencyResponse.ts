import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmergencyResponseCategory, EmergencyResponseStatus } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('emergency_responses')
export class EmergencyResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_emergency_responses_admission_id')
  admissionId!: string;

  @Column({ name: 'response_reference_id', type: 'varchar', length: 30, unique: true })
  @Index('idx_emergency_responses_reference_id')
  responseReferenceId!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: EmergencyResponseCategory;

  @Column({
    type: 'varchar',
    length: 30,
    default: EmergencyResponseStatus.INITIATED,
  })
  @Index('idx_emergency_responses_status')
  status!: EmergencyResponseStatus;

  @Column({ name: 'clinical_reason', type: 'text' })
  clinicalReason!: string;

  @Column({ name: 'initiated_by_user_id', type: 'uuid' })
  @Index('idx_emergency_responses_initiator')
  initiatedByUserId!: string;

  @Column({ name: 'assigned_team', type: 'varchar', length: 100, nullable: true })
  assignedTeam!: string | null;

  @Column({ name: 'assigned_responder_user_id', type: 'uuid', nullable: true })
  @Index('idx_emergency_responses_responder')
  assignedResponderUserId!: string | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ name: 'acknowledged_by_user_id', type: 'uuid', nullable: true })
  acknowledgedByUserId!: string | null;

  @Column({ name: 'action_notes', type: 'text', nullable: true })
  actionNotes!: string | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'initiated_by_user_id' })
  initiatedByUser!: User;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_responder_user_id' })
  assignedResponderUser!: User | null;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'acknowledged_by_user_id' })
  acknowledgedByUser!: User | null;
}
