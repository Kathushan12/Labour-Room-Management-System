import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { User } from './User.js';
import type { Ward } from './Ward.js';

@Entity('staff_ward_assignments')
@Index('idx_unique_active_staff_ward', ['userId', 'wardId'], {
  unique: true,
  where: 'is_active = true AND ended_at IS NULL',
})
export class StaffWardAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('idx_staff_ward_assignments_user_id')
  userId!: string;

  @Column({ name: 'ward_id', type: 'uuid' })
  @Index('idx_staff_ward_assignments_ward_id')
  wardId!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  @Index('idx_staff_ward_assignments_ended_at')
  endedAt!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index('idx_staff_ward_assignments_is_active')
  isActive!: boolean;

  @Column({ name: 'assigned_by_user_id', type: 'uuid' })
  assignedByUserId!: string;

  @Column({ name: 'ended_by_user_id', type: 'uuid', nullable: true })
  endedByUserId!: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne('Ward', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ward_id' })
  ward!: Ward;

  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedByUser!: User;

  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ended_by_user_id' })
  endedByUser!: User | null;
}
