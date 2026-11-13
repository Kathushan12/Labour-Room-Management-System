import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { BedFunctioningStatus, BedOccupancyStatus, BedCleaningStatus } from '@lrms/shared';
import type { Ward } from './Ward.js';
import type { BedStatusHistory } from './BedStatusHistory.js';
import type { BedAllocationHistory } from './BedAllocationHistory.js';
import type { BedCleaningRecord } from './BedCleaningRecord.js';

@Entity('beds')
@Unique(['wardId', 'bedNumber'])
export class Bed {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ward_id', type: 'uuid' })
  wardId!: string;

  @Column({ name: 'bed_number', type: 'varchar', length: 20 })
  bedNumber!: string;

  @Column({
    name: 'functioning_status',
    type: 'varchar',
    length: 30,
    default: BedFunctioningStatus.FUNCTIONING,
  })
  @Index('idx_beds_functioning_status')
  functioningStatus!: BedFunctioningStatus;

  @Column({
    name: 'occupancy_status',
    type: 'varchar',
    length: 30,
    default: BedOccupancyStatus.AVAILABLE,
  })
  @Index('idx_beds_occupancy_status')
  occupancyStatus!: BedOccupancyStatus;

  @Column({
    name: 'cleaning_status',
    type: 'varchar',
    length: 30,
    default: BedCleaningStatus.CLEAN,
  })
  @Index('idx_beds_cleaning_status')
  cleaningStatus!: BedCleaningStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Ward', 'beds')
  @JoinColumn({ name: 'ward_id' })
  ward!: Ward;

  @OneToMany('BedStatusHistory', 'bed')
  statusHistory!: BedStatusHistory[];

  @OneToMany('BedAllocationHistory', 'bed')
  allocationHistory!: BedAllocationHistory[];

  @OneToMany('BedCleaningRecord', 'bed')
  cleaningRecords!: BedCleaningRecord[];
}
