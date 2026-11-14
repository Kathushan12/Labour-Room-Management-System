import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DischargedEntityType } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { Newborn } from './Newborn.js';
import type { User } from './User.js';
import type { BedAllocationHistory } from './BedAllocationHistory.js';

@Entity('postpartum_discharge_authorizations')
export class PostpartumDischargeAuthorization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_postpartum_discharge_admission_id')
  admissionId!: string;

  @Column({ name: 'newborn_id', type: 'uuid', nullable: true })
  @Index('idx_postpartum_discharge_newborn_id')
  newbornId!: string | null;

  @Column({ name: 'discharged_entity_type', type: 'varchar', length: 20 })
  @Index('idx_postpartum_discharge_entity')
  dischargedEntityType!: DischargedEntityType;

  @Column({ name: 'authorized_by_doctor_id', type: 'uuid' })
  authorizedByDoctorId!: string;

  @Column({ name: 'discharged_at', type: 'timestamptz' })
  dischargedAt!: Date;

  @Column({ name: 'discharge_destination', type: 'varchar', length: 100 })
  dischargeDestination!: string;

  @Column({ name: 'maternal_condition', type: 'varchar', length: 50, nullable: true })
  maternalCondition!: string | null;

  @Column({ name: 'newborn_condition', type: 'varchar', length: 50, nullable: true })
  newbornCondition!: string | null;

  @Column({ name: 'discharge_summary', type: 'text' })
  dischargeSummary!: string;

  @Column({ name: 'feeding_plan', type: 'text', nullable: true })
  feedingPlan!: string | null;

  @Column({ name: 'follow_up_instructions', type: 'text' })
  followUpInstructions!: string;

  @Column({ name: 'bed_released_id', type: 'uuid', nullable: true })
  bedReleasedId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('Newborn', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'newborn_id' })
  newborn!: Newborn | null;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorized_by_doctor_id' })
  authorizedByDoctor!: User;

  @ManyToOne('BedAllocationHistory', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bed_released_id' })
  bedReleased!: BedAllocationHistory | null;
}
