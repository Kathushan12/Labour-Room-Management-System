import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  NewbornCordCondition,
  NewbornFeedingStatus,
  NewbornGeneralCondition,
  NewbornJaundiceStatus,
} from '@lrms/shared';
import type { Newborn } from './Newborn.js';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('postpartum_newborn_assessments')
export class PostpartumNewbornAssessment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'newborn_id', type: 'uuid' })
  @Index('idx_postpartum_newborn_newborn_id')
  newbornId!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_postpartum_newborn_admission_id')
  admissionId!: string;

  @Column({ name: 'recorded_by_user_id', type: 'uuid' })
  recordedByUserId!: string;

  @Column({ name: 'assessment_timestamp', type: 'timestamptz' })
  @Index('idx_postpartum_newborn_timestamp')
  assessmentTimestamp!: Date;

  @Column({ name: 'general_condition', type: 'varchar', length: 30 })
  generalCondition!: NewbornGeneralCondition;

  @Column({ name: 'respiratory_rate', type: 'integer', nullable: true })
  respiratoryRate!: number | null;

  @Column({ name: 'heart_rate', type: 'integer', nullable: true })
  heartRate!: number | null;

  @Column({ name: 'temperature_celsius', type: 'numeric', precision: 4, scale: 1, nullable: true })
  temperatureCelsius!: number | null;

  @Column({ name: 'feeding_status', type: 'varchar', length: 30 })
  feedingStatus!: NewbornFeedingStatus;

  @Column({ name: 'cord_condition', type: 'varchar', length: 30 })
  cordCondition!: NewbornCordCondition;

  @Column({ name: 'urine_passed', type: 'boolean', default: false })
  urinePassed!: boolean;

  @Column({ name: 'meconium_passed', type: 'boolean', default: false })
  meconiumPassed!: boolean;

  @Column({
    name: 'jaundice_status',
    type: 'varchar',
    length: 30,
    default: NewbornJaundiceStatus.NONE,
  })
  jaundiceStatus!: NewbornJaundiceStatus;

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Newborn', 'postpartumAssessments', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'newborn_id' })
  newborn!: Newborn;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedByUser!: User;
}
