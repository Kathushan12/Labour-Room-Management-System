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
import { AdmissionCategory, CarePlanState, AdmissionStatus } from '@lrms/shared';
import type { Ward } from './Ward.js';
import type { Patient } from './Patient.js';
import type { User } from './User.js';
import type { AdmissionRiskFlag } from './AdmissionRiskFlag.js';
import type { PatientStaffAssignment } from './PatientStaffAssignment.js';
import type { EmergencyOverride } from './EmergencyOverride.js';
import type { MaternalObservation } from './MaternalObservation.js';
import type { FetalObservation } from './FetalObservation.js';
import type { CarePlanTransition } from './CarePlanTransition.js';
import type { EmergencyAlert } from './EmergencyAlert.js';
import type { BedAllocationHistory } from './BedAllocationHistory.js';
import type { DischargeRecord } from './DischargeRecord.js';

@Entity('admissions')
export class Admission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admission_reference_id', type: 'varchar', length: 30, unique: true })
  @Index('idx_admissions_reference_id')
  admissionReferenceId!: string;

  @Column({ name: 'ward_id', type: 'uuid' })
  @Index('idx_admissions_ward_id')
  wardId!: string;

  // Decoupled patient identity: an admission may optionally link to a registered patient record
  // Rapid/unidentified emergency admissions can proceed with patientId = null
  @Column({ name: 'patient_id', type: 'uuid', nullable: true })
  @Index('idx_admissions_patient_id')
  patientId!: string | null;

  @Column({ name: 'admitted_by_user_id', type: 'uuid' })
  admittedByUserId!: string;

  @Column({ name: 'admission_category', type: 'varchar', length: 50 })
  @Index('idx_admissions_category')
  admissionCategory!: AdmissionCategory;

  @Column({ name: 'current_care_plan', type: 'varchar', length: 50 })
  @Index('idx_admissions_care_plan')
  currentCarePlan!: CarePlanState;

  @Column({ name: 'status', type: 'varchar', length: 30, default: AdmissionStatus.ADMITTED })
  @Index('idx_admissions_status')
  status!: AdmissionStatus;

  @Column({ name: 'admitted_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  admittedAt!: Date;

  @Column({ name: 'discharged_at', type: 'timestamptz', nullable: true })
  dischargedAt!: Date | null;

  @Column({ name: 'no_listed_risk_flags_confirmed', type: 'boolean', default: false })
  noListedRiskFlagsConfirmed!: boolean;

  @Column({ name: 'risk_assessment_completed_at', type: 'timestamptz', nullable: true })
  riskAssessmentCompletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne('Ward', 'admissions')
  @JoinColumn({ name: 'ward_id' })
  ward!: Ward;

  @ManyToOne('Patient', 'admissions', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient | null;

  @ManyToOne('User')
  @JoinColumn({ name: 'admitted_by_user_id' })
  admittedByUser!: User;

  @OneToMany('AdmissionRiskFlag', 'admission', { cascade: true })
  riskFlags!: AdmissionRiskFlag[];

  @OneToMany('PatientStaffAssignment', 'admission', { cascade: true })
  staffAssignments!: PatientStaffAssignment[];

  @OneToMany('EmergencyOverride', 'admission')
  emergencyOverrides!: EmergencyOverride[];

  @OneToMany('MaternalObservation', 'admission', { cascade: true })
  maternalObservations!: MaternalObservation[];

  @OneToMany('FetalObservation', 'admission', { cascade: true })
  fetalObservations!: FetalObservation[];

  @OneToMany('CarePlanTransition', 'admission', { cascade: true })
  carePlanTransitions!: CarePlanTransition[];

  @OneToMany('EmergencyAlert', 'admission', { cascade: true })
  emergencyAlerts!: EmergencyAlert[];

  @OneToMany('BedAllocationHistory', 'admission')
  bedHistory!: BedAllocationHistory[];

  @OneToOne('DischargeRecord', 'admission', { nullable: true })
  dischargeRecord!: DischargeRecord | null;
}
