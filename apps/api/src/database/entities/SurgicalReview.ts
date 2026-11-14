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
import {
  AnaesthesiaReviewStatus,
  CaesareanDecision,
  SurgicalReviewStatus,
  TheatreReadinessStatus,
} from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('surgical_reviews')
export class SurgicalReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_surgical_reviews_admission_id')
  admissionId!: string;

  @Column({ name: 'review_reference_id', type: 'varchar', length: 30, unique: true })
  @Index('idx_surgical_reviews_reference_id')
  reviewReferenceId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: SurgicalReviewStatus.REVIEW_REQUESTED,
  })
  @Index('idx_surgical_reviews_status')
  status!: SurgicalReviewStatus;

  @Column({
    name: 'caesarean_decision',
    type: 'varchar',
    length: 50,
    default: CaesareanDecision.CONSIDERED,
  })
  caesareanDecision!: CaesareanDecision;

  @Column({ name: 'clinical_indication', type: 'text' })
  clinicalIndication!: string;

  @Column({ name: 'decision_rationale', type: 'text', nullable: true })
  decisionRationale!: string | null;

  @Column({ name: 'requested_by_user_id', type: 'uuid' })
  @Index('idx_surgical_reviews_requested_by')
  requestedByUserId!: string;

  @Column({ name: 'consultant_user_id', type: 'uuid', nullable: true })
  @Index('idx_surgical_reviews_consultant')
  consultantUserId!: string | null;

  @Column({ name: 'consultant_assessed_at', type: 'timestamptz', nullable: true })
  consultantAssessedAt!: Date | null;

  @Column({ name: 'decision_recorded_at', type: 'timestamptz', nullable: true })
  decisionRecordedAt!: Date | null;

  @Column({
    name: 'anaesthesia_review_status',
    type: 'varchar',
    length: 50,
    default: AnaesthesiaReviewStatus.PENDING,
  })
  anaesthesiaReviewStatus!: AnaesthesiaReviewStatus;

  @Column({ name: 'anaesthesia_notes', type: 'text', nullable: true })
  anaesthesiaNotes!: string | null;

  @Column({
    name: 'theatre_readiness_status',
    type: 'varchar',
    length: 50,
    default: TheatreReadinessStatus.NOT_INITIATED,
  })
  theatreReadinessStatus!: TheatreReadinessStatus;

  @Column({ name: 'theatre_ready_at', type: 'timestamptz', nullable: true })
  theatreReadyAt!: Date | null;

  @Column({ name: 'handed_over_at', type: 'timestamptz', nullable: true })
  handedOverAt!: Date | null;

  @Column({ name: 'handover_notes', type: 'text', nullable: true })
  handoverNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedByUser!: User;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'consultant_user_id' })
  consultantUser!: User | null;
}
