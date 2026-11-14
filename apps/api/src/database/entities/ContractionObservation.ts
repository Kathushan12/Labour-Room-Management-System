import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ContractionIntensity } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('contraction_observations')
export class ContractionObservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_contraction_observations_admission_id')
  admissionId!: string;

  @Column({ name: 'recorded_by_user_id', type: 'uuid' })
  recordedByUserId!: string;

  // Number of contractions within the observation window
  @Column({ name: 'contractions_count', type: 'integer' })
  contractionsCount!: number;

  // Observation window in minutes (default: 10 minutes)
  @Column({ name: 'observation_window_minutes', type: 'integer', default: 10 })
  observationWindowMinutes!: number;

  // Average or representative duration in seconds
  @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
  durationSeconds!: number | null;

  @Column({
    name: 'intensity',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  intensity!: ContractionIntensity | null;

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes!: string | null;

  @Column({
    name: 'observation_timestamp',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index('idx_contraction_observations_timestamp')
  observationTimestamp!: Date;

  @Column({ name: 'supersedes_id', type: 'uuid', nullable: true })
  supersedesId!: string | null;

  @Column({ name: 'supersede_reason', type: 'text', nullable: true })
  supersedeReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User')
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedByUser!: User;

  @ManyToOne('ContractionObservation', { nullable: true })
  @JoinColumn({ name: 'supersedes_id' })
  supersededObservation!: ContractionObservation | null;
}
