import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApgarMinute } from '@lrms/shared';
import type { Newborn } from './Newborn.js';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('apgar_assessments')
export class ApgarAssessment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'newborn_id', type: 'uuid' })
  @Index('idx_apgar_newborn_id')
  newbornId!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_apgar_admission_id')
  admissionId!: string;

  @Column({ name: 'assessment_minute', type: 'varchar', length: 20 })
  assessmentMinute!: ApgarMinute;

  @Column({ name: 'assessed_at', type: 'timestamptz' })
  @Index('idx_apgar_assessed_at')
  assessedAt!: Date;

  @Column({ name: 'appearance', type: 'integer' })
  appearance!: number;

  @Column({ name: 'pulse', type: 'integer' })
  pulse!: number;

  @Column({ name: 'grimace', type: 'integer' })
  grimace!: number;

  @Column({ name: 'activity', type: 'integer' })
  activity!: number;

  @Column({ name: 'respiration', type: 'integer' })
  respiration!: number;

  @Column({ name: 'total_score', type: 'integer' })
  totalScore!: number;

  @Column({ name: 'assessed_by_user_id', type: 'uuid' })
  assessedByUserId!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'supersedes_id', type: 'uuid', nullable: true })
  supersedesId!: string | null;

  @Column({ name: 'supersede_reason', type: 'text', nullable: true })
  supersedeReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Newborn', 'apgarAssessments', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'newborn_id' })
  newborn!: Newborn;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assessed_by_user_id' })
  assessedByUser!: User;

  @ManyToOne('ApgarAssessment', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supersedes_id' })
  supersededAssessment!: ApgarAssessment | null;
}
