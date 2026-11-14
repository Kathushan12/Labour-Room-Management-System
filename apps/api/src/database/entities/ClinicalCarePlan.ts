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
import { CarePlanLifecycleState } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';
import type { ClinicalCarePlanVersion } from './ClinicalCarePlanVersion.js';
import type { ClinicalCarePlanReview } from './ClinicalCarePlanReview.js';

@Entity('clinical_care_plans')
export class ClinicalCarePlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_clinical_care_plans_admission_id')
  admissionId!: string;

  @Column({ name: 'care_plan_reference_id', type: 'varchar', length: 30, unique: true })
  @Index('idx_clinical_care_plans_reference_id')
  carePlanReferenceId!: string;

  @Column({
    name: 'current_state',
    type: 'varchar',
    length: 30,
    default: CarePlanLifecycleState.DRAFT,
  })
  @Index('idx_clinical_care_plans_state')
  currentState!: CarePlanLifecycleState;

  @Column({ name: 'current_version_number', type: 'integer', default: 1 })
  currentVersionNumber!: number;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'responsible_doctor_id', type: 'uuid', nullable: true })
  @Index('idx_clinical_care_plans_doctor_id')
  responsibleDoctorId!: string | null;

  @Column({ name: 'approved_by_user_id', type: 'uuid', nullable: true })
  approvedByUserId!: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ name: 'planned_review_at', type: 'timestamptz', nullable: true })
  plannedReviewAt!: Date | null;

  @Column({ name: 'last_reviewed_at', type: 'timestamptz', nullable: true })
  lastReviewedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsible_doctor_id' })
  responsibleDoctor!: User | null;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedByUser!: User | null;

  @OneToMany('ClinicalCarePlanVersion', 'carePlan', { cascade: true })
  versions!: ClinicalCarePlanVersion[];

  @OneToMany('ClinicalCarePlanReview', 'carePlan')
  reviews!: ClinicalCarePlanReview[];
}
