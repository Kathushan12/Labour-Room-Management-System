import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LochiaAmount, LochiaType, MaternalReviewStatus, UterineTone } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('postpartum_maternal_assessments')
export class PostpartumMaternalAssessment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_postpartum_maternal_admission_id')
  admissionId!: string;

  @Column({ name: 'recorded_by_user_id', type: 'uuid' })
  recordedByUserId!: string;

  @Column({ name: 'assessment_timestamp', type: 'timestamptz' })
  @Index('idx_postpartum_maternal_timestamp')
  assessmentTimestamp!: Date;

  @Column({ name: 'systolic_bp', type: 'integer', nullable: true })
  systolicBp!: number | null;

  @Column({ name: 'diastolic_bp', type: 'integer', nullable: true })
  diastolicBp!: number | null;

  @Column({ name: 'pulse_rate', type: 'integer', nullable: true })
  pulseRate!: number | null;

  @Column({ name: 'respiratory_rate', type: 'integer', nullable: true })
  respiratoryRate!: number | null;

  @Column({ name: 'temperature_celsius', type: 'numeric', precision: 4, scale: 1, nullable: true })
  temperatureCelsius!: number | null;

  @Column({ name: 'fundal_height_cm', type: 'integer', nullable: true })
  fundalHeightCm!: number | null;

  @Column({ name: 'uterine_tone', type: 'varchar', length: 30, nullable: true })
  uterineTone!: UterineTone | null;

  @Column({ name: 'lochia_amount', type: 'varchar', length: 30, nullable: true })
  lochiaAmount!: LochiaAmount | null;

  @Column({ name: 'lochia_type', type: 'varchar', length: 30, nullable: true })
  lochiaType!: LochiaType | null;

  @Column({ name: 'perineal_wound_status', type: 'varchar', length: 50, nullable: true })
  perinealWoundStatus!: string | null;

  @Column({ name: 'pain_score', type: 'integer', nullable: true })
  painScore!: number | null;

  @Column({ name: 'bladder_status', type: 'varchar', length: 30, nullable: true })
  bladderStatus!: string | null;

  @Column({
    name: 'clinical_review_status',
    type: 'varchar',
    length: 30,
    default: MaternalReviewStatus.ROUTINE,
  })
  clinicalReviewStatus!: MaternalReviewStatus;

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedByUser!: User;
}
