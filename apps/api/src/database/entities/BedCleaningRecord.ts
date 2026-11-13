import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Bed } from './Bed.js';
import type { User } from './User.js';

@Entity('bed_cleaning_records')
export class BedCleaningRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'bed_id', type: 'uuid' })
  @Index('idx_bed_cleaning_records_bed_id')
  bedId!: string;

  @Column({ name: 'started_by_user_id', type: 'uuid' })
  startedByUserId!: string;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  @Column({ name: 'completed_by_user_id', type: 'uuid', nullable: true })
  completedByUserId!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 30, default: 'IN_PROGRESS' })
  @Index('idx_bed_cleaning_records_status')
  status!: 'IN_PROGRESS' | 'COMPLETED';

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Bed', 'cleaningRecords')
  @JoinColumn({ name: 'bed_id' })
  bed!: Bed;

  @ManyToOne('User')
  @JoinColumn({ name: 'started_by_user_id' })
  startedByUser!: User;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'completed_by_user_id' })
  completedByUser!: User | null;
}
