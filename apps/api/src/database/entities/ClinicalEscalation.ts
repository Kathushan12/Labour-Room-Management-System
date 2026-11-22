import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  ClinicalObservationType,
  EscalationCategory,
  EscalationPriority,
  EscalationStatus,
} from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';
import type { ClinicalEscalationHistory } from './ClinicalEscalationHistory.js';

@Entity('clinical_escalations')
export class ClinicalEscalation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_clinical_escalations_admission_id')
  admissionId!: string;

  @Column({ name: 'escalation_reference_id', type: 'varchar', length: 30, unique: true })
  @Index('idx_clinical_escalations_reference_id')
  escalationReferenceId!: string;

  @Column({ type: 'varchar', length: 50 })
  category!: EscalationCategory;

  @Column({ type: 'varchar', length: 30 })
  @Index('idx_clinical_escalations_priority')
  priority!: EscalationPriority;

  @Column({
    type: 'varchar',
    length: 30,
    default: EscalationStatus.OPEN,
  })
  @Index('idx_clinical_escalations_status')
  status!: EscalationStatus;

  @Column({ name: 'clinical_reason', type: 'text' })
  clinicalReason!: string;

  @Column({ name: 'source_observation_type', type: 'varchar', length: 50, nullable: true })
  sourceObservationType!: ClinicalObservationType | null;

  @Column({ name: 'source_observation_id', type: 'uuid', nullable: true })
  sourceObservationId!: string | null;

  @Column({ name: 'initiated_by_user_id', type: 'uuid' })
  @Index('idx_clinical_escalations_initiator')
  initiatedByUserId!: string;

  @Column({ name: 'assigned_recipient_user_id', type: 'uuid', nullable: true })
  @Index('idx_clinical_escalations_assigned_to')
  assignedRecipientUserId!: string | null;

  @Column({ name: 'dispatched_at', type: 'timestamptz', default: () => 'now()' })
  dispatchedAt!: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'timed_out_at', type: 'timestamptz', nullable: true })
  timedOutAt!: Date | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ name: 'acknowledged_by_user_id', type: 'uuid', nullable: true })
  acknowledgedByUserId!: string | null;

  @Column({ name: 'assessment_at', type: 'timestamptz', nullable: true })
  assessmentAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId!: string | null;

  @Column({ name: 'clinical_response_notes', type: 'text', nullable: true })
  clinicalResponseNotes!: string | null;

  @Column({ name: 'closure_reason', type: 'text', nullable: true })
  closureReason!: string | null;

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
  @JoinColumn({ name: 'assigned_recipient_user_id' })
  assignedRecipientUser!: User | null;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'acknowledged_by_user_id' })
  acknowledgedByUser!: User | null;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'resolved_by_user_id' })
  resolvedByUser!: User | null;

  @OneToMany('ClinicalEscalationHistory', 'escalation', { cascade: true })
  history!: ClinicalEscalationHistory[];
}
