import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Admission } from './Admission.js';
import type { User } from './User.js';

@Entity('emergency_overrides')
export class EmergencyOverride {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_id', type: 'uuid' })
  @Index('idx_emergency_overrides_admission_id')
  admissionId!: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  @Index('idx_emergency_overrides_staff_id')
  staffId!: string;

  @Column({ type: 'text' })
  reason!: string;

  // Duration is configurable per institutional policy / demonstration setting, NOT hard-coded
  @Column({ name: 'override_duration_minutes', type: 'integer', nullable: true })
  overrideDurationMinutes!: number | null;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  grantedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'revoked_by_user_id', type: 'uuid', nullable: true })
  revokedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne('Admission', 'emergencyOverrides', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admission_id' })
  admission!: Admission;

  @ManyToOne('User', 'overrides')
  @JoinColumn({ name: 'staff_id' })
  staff!: User;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'revoked_by_user_id' })
  revokedByUser!: User | null;
}
