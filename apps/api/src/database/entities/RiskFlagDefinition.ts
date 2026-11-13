import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RiskFlagKey } from '@lrms/shared';
import type { AdmissionRiskFlag } from './AdmissionRiskFlag.js';

@Entity('risk_flag_definitions')
export class RiskFlagDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
  })
  @Index('idx_risk_flag_definitions_key')
  key!: RiskFlagKey;

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index('idx_risk_flag_definitions_is_active')
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany('AdmissionRiskFlag', 'definition')
  admissionFlags!: AdmissionRiskFlag[];
}
