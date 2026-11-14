import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CarePlanReviewOutcome } from '@lrms/shared';
import type { ClinicalCarePlan } from './ClinicalCarePlan.js';
import type { User } from './User.js';

@Entity('clinical_care_plan_reviews')
export class ClinicalCarePlanReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'care_plan_id', type: 'uuid' })
  @Index('idx_care_plan_reviews_plan_id')
  carePlanId!: string;

  @Column({ name: 'reviewed_by_user_id', type: 'uuid' })
  @Index('idx_care_plan_reviews_user_id')
  reviewedByUserId!: string;

  @Column({ name: 'review_outcome', type: 'varchar', length: 50 })
  reviewOutcome!: CarePlanReviewOutcome;

  @Column({ name: 'review_notes', type: 'text' })
  reviewNotes!: string;

  @Column({ name: 'next_review_at', type: 'timestamptz', nullable: true })
  nextReviewAt!: Date | null;

  @Column({ name: 'reviewed_version_number', type: 'integer' })
  reviewedVersionNumber!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('ClinicalCarePlan', 'reviews', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'care_plan_id' })
  carePlan!: ClinicalCarePlan;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedByUser!: User;
}
