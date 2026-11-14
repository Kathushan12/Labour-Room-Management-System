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
  CaputGrade,
  FetalPosition,
  LiquorAppearance,
  MembraneStatus,
  MouldingGrade,
} from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('labour_assessments')
export class LabourAssessment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_labour_assessments_admission_id')
  admissionId!: string;

  @Column({ name: 'recorded_by_user_id', type: 'uuid' })
  recordedByUserId!: string;

  // Cervical dilation: 0.0 to 10.0 cm
  @Column({
    name: 'cervical_dilation_cm',
    type: 'numeric',
    precision: 4,
    scale: 1,
    nullable: true,
  })
  cervicalDilationCm!: number | null;

  // Cervical effacement: 0 to 100 %
  @Column({ name: 'cervical_effacement_percent', type: 'integer', nullable: true })
  cervicalEffacementPercent!: number | null;

  // Fetal station: e.g. -3 to +3
  @Column({ name: 'fetal_station', type: 'varchar', length: 20, nullable: true })
  fetalStation!: string | null;

  // Fetal descent: 0 to 5 fifths palpable
  @Column({ name: 'fetal_descent_fifths', type: 'integer', nullable: true })
  fetalDescentFifths!: number | null;

  @Column({
    name: 'membrane_status',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  membraneStatus!: MembraneStatus | null;

  @Column({
    name: 'liquor_appearance',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  liquorAppearance!: LiquorAppearance | null;

  @Column({
    name: 'fetal_position',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  fetalPosition!: FetalPosition | null;

  @Column({
    name: 'caput',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  caput!: CaputGrade | null;

  @Column({
    name: 'moulding',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  moulding!: MouldingGrade | null;

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes!: string | null;

  @Column({
    name: 'observation_timestamp',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index('idx_labour_assessments_timestamp')
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

  @ManyToOne('LabourAssessment', { nullable: true })
  @JoinColumn({ name: 'supersedes_id' })
  supersededAssessment!: LabourAssessment | null;
}
