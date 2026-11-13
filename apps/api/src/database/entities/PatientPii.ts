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
import type { Patient } from './Patient.js';

@Entity('patient_pii')
export class PatientPii {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid', unique: true })
  patientId!: string;

  // Separate binary columns for AES-256-GCM encrypted patient full name
  @Column({ name: 'full_name_ciphertext', type: 'bytea', nullable: true })
  fullNameCiphertext!: Buffer | null;

  @Column({ name: 'full_name_nonce', type: 'bytea', nullable: true })
  fullNameNonce!: Buffer | null;

  @Column({ name: 'full_name_auth_tag', type: 'bytea', nullable: true })
  fullNameAuthTag!: Buffer | null;

  // Separate binary columns for AES-256-GCM encrypted National Identity Card (NIC)
  @Column({ name: 'nic_ciphertext', type: 'bytea', nullable: true })
  nicCiphertext!: Buffer | null;

  @Column({ name: 'nic_nonce', type: 'bytea', nullable: true })
  nicNonce!: Buffer | null;

  @Column({ name: 'nic_auth_tag', type: 'bytea', nullable: true })
  nicAuthTag!: Buffer | null;

  // Separate binary columns for AES-256-GCM encrypted contact phone
  @Column({ name: 'contact_phone_ciphertext', type: 'bytea', nullable: true })
  contactPhoneCiphertext!: Buffer | null;

  @Column({ name: 'contact_phone_nonce', type: 'bytea', nullable: true })
  contactPhoneNonce!: Buffer | null;

  @Column({ name: 'contact_phone_auth_tag', type: 'bytea', nullable: true })
  contactPhoneAuthTag!: Buffer | null;

  // Key versioning for cryptographic key rotation
  @Column({ name: 'key_version', type: 'varchar', length: 10, default: 'v1' })
  keyVersion!: string;

  // HMAC-SHA256 blind index for exact-match NIC searches without decryption.
  // Enforces at most one patient per non-null NIC blind index.
  @Column({ name: 'nic_blind_index', type: 'bytea', nullable: true })
  @Index('uq_patient_pii_nic_blind_index', { unique: true, where: '"nic_blind_index" IS NOT NULL' })
  nicBlindIndex!: Buffer | null;

  // HMAC-SHA256 blind index for contact phone searches
  @Column({ name: 'contact_phone_blind_index', type: 'bytea', nullable: true })
  @Index('idx_patient_pii_contact_blind_index')
  contactPhoneBlindIndex!: Buffer | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne('Patient', 'pii', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;
}
