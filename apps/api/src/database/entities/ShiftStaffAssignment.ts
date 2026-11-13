import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ShiftStaffAssignmentStatus } from '@lrms/shared';
import type { Shift } from './Shift.js';
import type { User } from './User.js';

@Entity('shift_staff_assignments')
@Index('idx_unique_shift_staff', ['shiftId', 'userId'], {
  unique: true,
  where: "status != 'CANCELLED'",
})
export class ShiftStaffAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'shift_id', type: 'uuid' })
  @Index('idx_shift_staff_assignments_shift_id')
  shiftId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_shift_staff_assignments_user_id')
  userId!: string;

  @Column({ name: 'role_in_shift', type: 'varchar', length: 50, default: 'STAFF' })
  roleInShift!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    default: ShiftStaffAssignmentStatus.ASSIGNED,
  })
  @Index('idx_shift_staff_assignments_status')
  status!: ShiftStaffAssignmentStatus;

  @Column({ name: 'assigned_by_user_id', type: 'uuid' })
  assignedByUserId!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt!: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancelled_by_user_id', type: 'uuid', nullable: true })
  cancelledByUserId!: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Shift', 'staffAssignments', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift!: Shift;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedByUser!: User;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cancelled_by_user_id' })
  cancelledByUser!: User | null;
}
