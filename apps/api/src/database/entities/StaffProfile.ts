import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProfessionalRegistrationBody } from '@lrms/shared';
import type { User } from './User.js';

@Entity('staff_profiles')
export class StaffProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ name: 'staff_id', type: 'varchar', length: 50, nullable: true })
  @Index('idx_staff_profiles_staff_id')
  staffId!: string | null;

  @Column({
    name: 'professional_registration_body',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  professionalRegistrationBody!: ProfessionalRegistrationBody | null;

  @Column({
    name: 'professional_registration_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @Index('idx_staff_profiles_reg_number')
  professionalRegistrationNumber!: string | null;

  // Separate binary BYTEA columns matching the existing PatientPii AES-256-GCM architecture
  @Column({ name: 'contact_number_ciphertext', type: 'bytea', nullable: true })
  contactNumberCiphertext!: Buffer | null;

  @Column({ name: 'contact_number_nonce', type: 'bytea', nullable: true })
  contactNumberNonce!: Buffer | null;

  @Column({ name: 'contact_number_auth_tag', type: 'bytea', nullable: true })
  contactNumberAuthTag!: Buffer | null;

  @Column({ name: 'key_version', type: 'varchar', length: 10, default: 'v1' })
  keyVersion!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // Enforce RESTRICT to prevent accidental cascade loss of historical staff records
  @OneToOne('User', 'staffProfile', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
