import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('discharge_records')
export class DischargeRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid', unique: true })
  @Index('idx_discharge_records_admission_id')
  admissionId!: string;

  @Column({ name: 'discharged_by_user_id', type: 'uuid' })
  dischargedByUserId!: string;

  @Column({ name: 'maternal_outcome', type: 'varchar', length: 100 })
  maternalOutcome!: string;

  @Column({ name: 'neonatal_outcome', type: 'varchar', length: 100 })
  neonatalOutcome!: string;

  @Column({ name: 'delivery_mode', type: 'varchar', length: 50 })
  deliveryMode!: string;

  @Column({ name: 'delivery_timestamp', type: 'timestamptz', nullable: true })
  deliveryTimestamp!: Date | null;

  @Column({ name: 'discharge_summary', type: 'text', nullable: true })
  dischargeSummary!: string | null;

  @Column({
    name: 'discharge_timestamp',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  dischargeTimestamp!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToOne('Admission', 'dischargeRecord', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User')
  @JoinColumn({ name: 'discharged_by_user_id' })
  dischargedByUser!: User;
}
