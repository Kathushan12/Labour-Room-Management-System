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
} from 'typeorm';
import { DeliveryMode, DeliveryStatus } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';
import type { Newborn } from './Newborn.js';

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_deliveries_admission_id')
  admissionId!: string;

  @Column({ name: 'delivery_reference_id', type: 'varchar', length: 30, unique: true })
  deliveryReferenceId!: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: DeliveryStatus.DRAFT })
  @Index('idx_deliveries_status')
  status!: DeliveryStatus;

  @Column({ name: 'delivery_timestamp', type: 'timestamptz' })
  deliveryTimestamp!: Date;

  @Column({ name: 'delivery_mode', type: 'varchar', length: 50 })
  deliveryMode!: DeliveryMode;

  @Column({ name: 'delivery_location', type: 'varchar', length: 100 })
  deliveryLocation!: string;

  @Column({ name: 'attending_doctor_id', type: 'uuid' })
  attendingDoctorId!: string;

  @Column({ name: 'responsible_midwife_id', type: 'uuid', nullable: true })
  responsibleMidwifeId!: string | null;

  @Column({ name: 'recorded_by_user_id', type: 'uuid' })
  recordedByUserId!: string;

  @Column({ name: 'finalized_by_user_id', type: 'uuid', nullable: true })
  finalizedByUserId!: string | null;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt!: Date | null;

  @Column({ name: 'estimated_blood_loss_ml', type: 'integer', nullable: true })
  estimatedBloodLossMl!: number | null;

  @Column({ name: 'perineal_trauma_status', type: 'varchar', length: 50, nullable: true })
  perinealTraumaStatus!: string | null;

  @Column({ name: 'placenta_status', type: 'varchar', length: 50, nullable: true })
  placentaStatus!: string | null;

  @Column({ name: 'placenta_delivery_timestamp', type: 'timestamptz', nullable: true })
  placentaDeliveryTimestamp!: Date | null;

  @Column({ name: 'clinical_notes', type: 'text', nullable: true })
  clinicalNotes!: string | null;

  @Column({ name: 'amendment_reason', type: 'text', nullable: true })
  amendmentReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Admission', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'attending_doctor_id' })
  attendingDoctor!: User;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsible_midwife_id' })
  responsibleMidwife!: User | null;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedByUser!: User;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'finalized_by_user_id' })
  finalizedByUser!: User | null;

  @OneToMany('Newborn', 'delivery')
  newborns!: Newborn[];
}
