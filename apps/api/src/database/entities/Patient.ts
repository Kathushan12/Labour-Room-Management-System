import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import type { PatientPii } from './PatientPii.js';
import type { Admission } from './Admission.js';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne('PatientPii', 'patient', { cascade: true })
  pii!: PatientPii | null;

  @OneToMany('Admission', 'patient')
  admissions!: Admission[];
}
