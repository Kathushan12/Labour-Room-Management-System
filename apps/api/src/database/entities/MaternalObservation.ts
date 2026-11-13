import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GlucoseUnit } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('maternal_observations')
export class MaternalObservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_maternal_observations_admission_id')
  admissionId!: string;

  @Column({ name: 'recorded_by_user_id', type: 'uuid' })
  recordedByUserId!: string;

  // Structured Blood Pressure: explicit systolic and diastolic integers
  @Column({ name: 'systolic_bp', type: 'integer', nullable: true })
  systolicBp!: number | null;

  @Column({ name: 'diastolic_bp', type: 'integer', nullable: true })
  diastolicBp!: number | null;

  // Blood Glucose with mandatory explicit unit when value is recorded (no silent unit assumptions)
  @Column({ name: 'blood_glucose_value', type: 'numeric', precision: 6, scale: 2, nullable: true })
  bloodGlucoseValue!: number | null;

  @Column({
    name: 'blood_glucose_unit',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  bloodGlucoseUnit!: GlucoseUnit | null;

  @Column({ name: 'temperature_celsius', type: 'numeric', precision: 4, scale: 2, nullable: true })
  temperatureCelsius!: number | null;

  @Column({ name: 'pulse_rate_bpm', type: 'integer', nullable: true })
  pulseRateBpm!: number | null;

  @Column({ name: 'respiratory_rate', type: 'integer', nullable: true })
  respiratoryRate!: number | null;

  @Column({ name: 'oxygen_saturation_percent', type: 'integer', nullable: true })
  oxygenSaturationPercent!: number | null;

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes!: string | null;

  @Column({
    name: 'observation_timestamp',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index('idx_maternal_observations_timestamp')
  observationTimestamp!: Date;

  // Append-only audit: corrections reference the superseded observation record
  @Column({ name: 'supersedes_id', type: 'uuid', nullable: true })
  supersedesId!: string | null;

  @Column({ name: 'supersede_reason', type: 'text', nullable: true })
  supersedeReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', 'maternalObservations', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User')
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedByUser!: User;

  @ManyToOne('MaternalObservation', { nullable: true })
  @JoinColumn({ name: 'supersedes_id' })
  supersededObservation!: MaternalObservation | null;
}
