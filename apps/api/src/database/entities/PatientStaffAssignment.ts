import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StaffAssignmentRole } from '@lrms/shared';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('patient_staff_assignments')
export class PatientStaffAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_patient_staff_assignments_admission_id')
  admissionId!: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  @Index('idx_patient_staff_assignments_staff_id')
  staffId!: string;

  @Column({
    name: 'assignment_role',
    type: 'varchar',
    length: 50,
  })
  assignmentRole!: StaffAssignmentRole;

  @Column({ name: 'assigned_by_user_id', type: 'uuid' })
  assignedByUserId!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt!: Date;

  @Column({ name: 'unassigned_at', type: 'timestamptz', nullable: true })
  @Index('idx_patient_staff_assignments_unassigned_at')
  unassignedAt!: Date | null;

  @Column({ name: 'unassigned_by_user_id', type: 'uuid', nullable: true })
  unassignedByUserId!: string | null;

  @Column({ name: 'end_reason', type: 'text', nullable: true })
  endReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', 'staffAssignments', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', 'assignments')
  @JoinColumn({ name: 'staff_id' })
  staff!: User;

  @ManyToOne('User')
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedByUser!: User;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'unassigned_by_user_id' })
  unassignedByUser!: User | null;
}
