import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ClinicalObservationType } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('clinical_observation_amendments')
export class ClinicalObservationAmendment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_amendments_admission_id')
  admissionId!: string;

  @Column({
    name: 'observation_type',
    type: 'varchar',
    length: 50,
  })
  @Index('idx_amendments_type')
  observationType!: ClinicalObservationType;

  @Column({ name: 'original_observation_id', type: 'uuid' })
  @Index('idx_amendments_original_id')
  originalObservationId!: string;

  @Column({ name: 'amended_observation_id', type: 'uuid' })
  @Index('idx_amendments_amended_id')
  amendedObservationId!: string;

  @Column({ name: 'amended_by_user_id', type: 'uuid' })
  amendedByUserId!: string;

  @Column({ name: 'amendment_reason', type: 'text' })
  amendmentReason!: string;

  @Column({ name: 'previous_values', type: 'jsonb' })
  previousValues!: Record<string, unknown>;

  @Column({ name: 'amended_values', type: 'jsonb' })
  amendedValues!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User')
  @JoinColumn({ name: 'amended_by_user_id' })
  amendedByUser!: User;
}
