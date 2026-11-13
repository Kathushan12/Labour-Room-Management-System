import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { CarePlanState } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';
import type { EmergencyAlert } from './EmergencyAlert.js';

@Entity('care_plan_transitions')
export class CarePlanTransition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_care_plan_transitions_admission_id')
  admissionId!: string;

  @Column({ name: 'previous_state', type: 'varchar', length: 50 })
  previousState!: CarePlanState;

  @Column({ name: 'new_state', type: 'varchar', length: 50 })
  @Index('idx_care_plan_transitions_new_state')
  newState!: CarePlanState;

  @Column({ name: 'transitioned_by_user_id', type: 'uuid' })
  transitionedByUserId!: string;

  @Column({ name: 'clinical_rationale', type: 'text' })
  clinicalRationale!: string;

  @Column({ name: 'is_emergency', type: 'boolean', default: false })
  @Index('idx_care_plan_transitions_is_emergency')
  isEmergency!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', 'carePlanTransitions', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User')
  @JoinColumn({ name: 'transitioned_by_user_id' })
  transitionedByUser!: User;

  @OneToMany('EmergencyAlert', 'carePlanTransition')
  emergencyAlerts!: EmergencyAlert[];
}
