import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { Bed } from './Bed.js';
import type { Admission } from './Admission.js';

@Entity('wards')
export class Ward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index('idx_wards_code')
  code!: string;

  @Column({ name: 'total_physical_beds', type: 'integer', default: 7 })
  totalPhysicalBeds!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'alert_timeout_seconds', type: 'integer', default: 120 })
  alertTimeoutSeconds!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany('Bed', 'ward')
  beds!: Bed[];

  @OneToMany('Admission', 'ward')
  admissions!: Admission[];
}
