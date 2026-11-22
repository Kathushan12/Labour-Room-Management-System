import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Role } from './Role.js';
import type { StaffProfile } from './StaffProfile.js';
import type { RefreshSession } from './RefreshSession.js';
import type { PatientStaffAssignment } from './PatientStaffAssignment.js';
import type { EmergencyOverride } from './EmergencyOverride.js';
import type { AuditLog } from './AuditLog.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index('idx_users_username')
  username!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index('idx_users_email')
  email!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  @Index('idx_users_full_name')
  fullName!: string;

  @Column({ name: 'role_id', type: 'uuid' })
  @Index('idx_users_role_id')
  roleId!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index('idx_users_is_active')
  isActive!: boolean;

  @Column({ name: 'must_change_password', type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt!: Date | null;

  @Column({ name: 'temporary_password_expires_at', type: 'timestamptz', nullable: true })
  temporaryPasswordExpiresAt!: Date | null;

  @Column({ name: 'failed_login_attempts', type: 'integer', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Role', 'users')
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @OneToOne('StaffProfile', 'user')
  staffProfile!: StaffProfile | null;

  @OneToMany('RefreshSession', 'user')
  refreshSessions!: RefreshSession[];

  @OneToMany('PatientStaffAssignment', 'staff')
  assignments!: PatientStaffAssignment[];

  @OneToMany('EmergencyOverride', 'staff')
  overrides!: EmergencyOverride[];

  @OneToMany('AuditLog', 'user')
  auditLogs!: AuditLog[];
}
