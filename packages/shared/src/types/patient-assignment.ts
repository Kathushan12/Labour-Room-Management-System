import { StaffAssignmentRole, UserRole } from '../enums/index.js';

export interface PatientStaffAssignmentDto {
  id: string;
  admissionId: string;
  staffId: string;
  assignmentRole: StaffAssignmentRole;
  assignedByUserId: string;
  assignedAt: string;
  unassignedAt: string | null;
  unassignedByUserId: string | null;
  endReason: string | null;
  createdAt: string;
  staff?: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
  assignedByUser?: {
    id: string;
    fullName: string;
  };
  unassignedByUser?: {
    id: string;
    fullName: string;
  } | null;
}

export interface AssignPatientStaffRequest {
  staffId: string;
  assignmentRole: StaffAssignmentRole;
}

export interface TransferPatientStaffRequest {
  newStaffId: string;
  assignmentRole: StaffAssignmentRole; // ATTENDING_DOCTOR or PRIMARY_NURSE
  reason?: string;
}

export interface EndPatientStaffAssignmentRequest {
  reason: string;
}

export interface AdmissionStaffResponsibilityDto {
  admissionId: string;
  admissionReferenceId: string;
  attendingDoctor: PatientStaffAssignmentDto | null;
  primaryNurse: PatientStaffAssignmentDto | null;
  supportingStaff: PatientStaffAssignmentDto[];
  history: PatientStaffAssignmentDto[];
}

export interface UnassignedAdmissionSummaryDto {
  admissionId: string;
  admissionReferenceId: string;
  patientId: string;
  admissionCategory: string;
  currentCarePlan: string;
  admittedAt: string;
  hasPii: boolean;
  missingAttendingDoctor: boolean;
  missingPrimaryNurse: boolean;
  activeRiskFlagKeys: string[];
}
