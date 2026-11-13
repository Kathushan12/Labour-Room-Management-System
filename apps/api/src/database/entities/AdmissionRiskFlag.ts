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
import type { RiskFlagDefinition } from './RiskFlagDefinition.js';
import type { User } from './User.js';

@Entity('admission_risk_flags')
export class AdmissionRiskFlag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_admission_risk_flags_admission_id')
  admissionId!: string;

  @Column({ name: 'risk_flag_definition_id', type: 'uuid' })
  @Index('idx_admission_risk_flags_def_id')
  riskFlagDefinitionId!: string;

  @Column({ name: 'flagged_by_user_id', type: 'uuid' })
  flaggedByUserId!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index('idx_admission_risk_flags_is_active')
  isActive!: boolean;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt!: Date | null;

  @Column({ name: 'deactivated_by_user_id', type: 'uuid', nullable: true })
  deactivatedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', 'riskFlags', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('RiskFlagDefinition', 'admissionFlags')
  @JoinColumn({ name: 'risk_flag_definition_id' })
  definition!: RiskFlagDefinition;

  @ManyToOne('User')
  @JoinColumn({ name: 'flagged_by_user_id' })
  flaggedByUser!: User;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'deactivated_by_user_id' })
  deactivatedByUser!: User | null;
}
