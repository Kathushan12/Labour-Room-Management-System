import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import type { ClinicalCarePlan } from './ClinicalCarePlan.js';
import type { User } from './User.js';

@Entity('clinical_care_plan_versions')
@Unique('idx_unique_care_plan_version', ['carePlanId', 'versionNumber'])
export class ClinicalCarePlanVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'care_plan_id', type: 'uuid' })
  @Index('idx_care_plan_versions_plan_id')
  carePlanId!: string;

  @Column({ name: 'version_number', type: 'integer' })
  versionNumber!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'assessment_summary', type: 'text' })
  assessmentSummary!: string;

  @Column({ name: 'clinical_concerns', type: 'text', nullable: true })
  clinicalConcerns!: string | null;

  @Column({ type: 'text' })
  objectives!: string;

  @Column({ name: 'planned_actions', type: 'text' })
  plannedActions!: string;

  @Column({ name: 'assigned_staff_roles', type: 'jsonb', nullable: true })
  assignedStaffRoles!: Record<string, string> | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('ClinicalCarePlan', 'versions', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'care_plan_id' })
  carePlan!: ClinicalCarePlan;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;
}
