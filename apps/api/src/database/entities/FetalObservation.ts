import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('fetal_observations')
export class FetalObservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_fetal_observations_admission_id')
  admissionId!: string;

  @Column({ name: 'recorded_by_user_id', type: 'uuid' })
  recordedByUserId!: string;

  // Fetal heart rate with explicit unit
  @Column({ name: 'fetal_heart_rate_bpm', type: 'integer', nullable: true })
  fetalHeartRateBpm!: number | null;

  @Column({ name: 'fetal_heart_rate_unit', type: 'varchar', length: 20, default: 'BPM' })
  fetalHeartRateUnit!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  variability!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  decelerations!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  accelerations!: string | null;

  @Column({ name: 'liquor_status', type: 'varchar', length: 50, nullable: true })
  liquorStatus!: string | null;

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes!: string | null;

  @Column({
    name: 'observation_timestamp',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index('idx_fetal_observations_timestamp')
  observationTimestamp!: Date;

  // Append-only audit: corrections reference the superseded observation record
  @Column({ name: 'supersedes_id', type: 'uuid', nullable: true })
  supersedesId!: string | null;

  @Column({ name: 'supersede_reason', type: 'text', nullable: true })
  supersedeReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', 'fetalObservations', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User')
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedByUser!: User;

  @ManyToOne('FetalObservation', { nullable: true })
  @JoinColumn({ name: 'supersedes_id' })
  supersededObservation!: FetalObservation | null;
}
