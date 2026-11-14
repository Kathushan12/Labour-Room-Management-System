import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BirthOutcome, NewbornDischargeStatus, NewbornSex } from '@lrms/shared';
import type { Delivery } from './Delivery.js';
import type { Admission } from './Admission.js';
import type { User } from './User.js';
import type { ApgarAssessment } from './ApgarAssessment.js';
import type { PostpartumNewbornAssessment } from './PostpartumNewbornAssessment.js';

@Entity('newborns')
@Unique('uq_delivery_birth_order', ['deliveryId', 'birthOrder'])
export class Newborn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'delivery_id', type: 'uuid' })
  @Index('idx_newborns_delivery_id')
  deliveryId!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_newborns_admission_id')
  admissionId!: string;

  @Column({ name: 'newborn_reference_id', type: 'varchar', length: 40, unique: true })
  newbornReferenceId!: string;

  @Column({ name: 'birth_order', type: 'integer' })
  birthOrder!: number;

  @Column({ name: 'birth_timestamp', type: 'timestamptz' })
  birthTimestamp!: Date;

  @Column({ name: 'outcome', type: 'varchar', length: 30 })
  @Index('idx_newborns_outcome')
  outcome!: BirthOutcome;

  @Column({ name: 'sex', type: 'varchar', length: 20 })
  sex!: NewbornSex;

  @Column({ name: 'birth_weight_grams', type: 'integer' })
  birthWeightGrams!: number;

  @Column({ name: 'gestational_age_weeks', type: 'integer', nullable: true })
  gestationalAgeWeeks!: number | null;

  @Column({ name: 'gestational_age_days', type: 'integer', nullable: true })
  gestationalAgeDays!: number | null;

  @Column({ name: 'delivered_by_user_id', type: 'uuid' })
  deliveredByUserId!: string;

  @Column({
    name: 'discharge_status',
    type: 'varchar',
    length: 30,
    default: NewbornDischargeStatus.IN_CARE,
  })
  @Index('idx_newborns_discharge_status')
  dischargeStatus!: NewbornDischargeStatus;

  @Column({ name: 'discharged_at', type: 'timestamptz', nullable: true })
  dischargedAt!: Date | null;

  @Column({ name: 'discharged_by_user_id', type: 'uuid', nullable: true })
  dischargedByUserId!: string | null;

  @Column({ name: 'provisional_name', type: 'varchar', length: 100, nullable: true })
  provisionalName!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Delivery', 'newborns', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'delivery_id' })
  delivery!: Delivery;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'delivered_by_user_id' })
  deliveredByUser!: User;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'discharged_by_user_id' })
  dischargedByUser!: User | null;

  @OneToMany('ApgarAssessment', 'newborn')
  apgarAssessments!: ApgarAssessment[];

  @OneToMany('PostpartumNewbornAssessment', 'newborn')
  postpartumAssessments!: PostpartumNewbornAssessment[];
}
