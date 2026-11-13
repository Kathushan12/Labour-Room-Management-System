import { AdmissionSummaryDto } from './admission.js';

export interface PatientSummaryDto {
  id: string;
  hasPii: boolean;
  hasFullName: boolean;
  hasNic: boolean;
  hasContactPhone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatientPiiDto {
  fullName: string | null;
  nic: string | null;
  contactPhone: string | null;
  keyVersion: string;
  updatedAt: string;
}

export interface PatientAuditSummaryEntryDto {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface PatientDto extends PatientSummaryDto {
  admissionCount: number;
  admissions?: AdmissionSummaryDto[];
  auditHistory?: PatientAuditSummaryEntryDto[];
}

export interface PatientAdmissionHistoryDto {
  patient: PatientSummaryDto;
  admissions: AdmissionSummaryDto[];
}

export interface UpdatePatientPiiRequest {
  fullName?: string | null;
  nic?: string | null;
  contactPhone?: string | null;
}

export interface PatientLookupRequest {
  nic: string;
}

export interface PatientLookupResponse {
  matches: PatientSummaryDto[];
}
