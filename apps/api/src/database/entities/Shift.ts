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
import { ShiftType, ShiftStatus } from '@lrms/shared';
import type { Ward } from './Ward.js';
import type { User } from './User.js';
import type { ShiftStaffAssignment } from './ShiftStaffAssignment.js';
import type { ShiftHandover } from './ShiftHandover.js';

@Entity('shifts')
@Index('idx_shifts_ward_window', ['wardId', 'startsAt', 'endsAt'])
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ward_id', type: 'uuid' })
  @Index('idx_shifts_ward_id')
  wardId!: string;

  @Column({ name: 'shift_type', type: 'varchar', length: 30 })
  shiftType!: ShiftType;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    default: ShiftStatus.SCHEDULED,
  })
  @Index('idx_shifts_status')
  status!: ShiftStatus;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Ward', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ward_id' })
  ward!: Ward;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @OneToMany('ShiftStaffAssignment', 'shift')
  staffAssignments!: ShiftStaffAssignment[];

  @OneToMany('ShiftHandover', 'shift')
  handovers!: ShiftHandover[];
}
