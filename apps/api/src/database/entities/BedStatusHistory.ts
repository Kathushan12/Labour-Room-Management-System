import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Bed } from './Bed.js';
import type { User } from './User.js';

@Entity('bed_status_history')
export class BedStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'bed_id', type: 'uuid' })
  @Index('idx_bed_status_history_bed_id')
  bedId!: string;

  @Column({ name: 'previous_functioning_status', type: 'varchar', length: 30, nullable: true })
  previousFunctioningStatus!: string | null;

  @Column({ name: 'new_functioning_status', type: 'varchar', length: 30 })
  newFunctioningStatus!: string;

  @Column({ name: 'previous_occupancy_status', type: 'varchar', length: 30, nullable: true })
  previousOccupancyStatus!: string | null;

  @Column({ name: 'new_occupancy_status', type: 'varchar', length: 30 })
  newOccupancyStatus!: string;

  @Column({ name: 'changed_by_user_id', type: 'uuid' })
  changedByUserId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Bed', 'statusHistory')
  @JoinColumn({ name: 'bed_id' })
  bed!: Bed;

  @ManyToOne('User')
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser!: User;
}
