import { AdmissionCategory, AdmissionStatus, CarePlanState, RiskFlagKey } from '../enums/index.js';

export interface RiskFlagDefinitionDto {
  id: string;
  key: RiskFlagKey;
  label: string;
  description: string | null;
  isActive: boolean;
}

export interface RiskFlagDto {
  id: string;
  definitionId: string;
  key: RiskFlagKey;
  label: string;
  notes: string | null;
  isActive: boolean;
  flaggedByUserId: string;
  flaggedByUsername: string | null;
  flaggedByFullName: string | null;
  createdAt: string;
  deactivatedAt: string | null;
  deactivatedByUserId: string | null;
}

export interface AdmissionSummaryDto {
  id: string;
  admissionReferenceId: string;
  wardId: string;
  patientId: string | null;
  hasPii: boolean;
  admissionCategory: AdmissionCategory;
  currentCarePlan: CarePlanState;
  status: AdmissionStatus;
  admittedAt: string;
  dischargedAt: string | null;
  admittedByUserId: string;
  admittedByFullName: string | null;
  noListedRiskFlagsConfirmed: boolean;
  riskAssessmentCompletedAt: string | null;
  riskFlags: RiskFlagDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionDto extends AdmissionSummaryDto {
  historicalRiskFlags: RiskFlagDto[];
}

export interface CreateTriageRiskFlagInput {
  key: RiskFlagKey;
  notes?: string | null;
}

export interface CreateTriageRequest {
  admissionCategory: AdmissionCategory;
  riskFlagKeys?: RiskFlagKey[];
  riskFlagNotes?: Partial<Record<RiskFlagKey, string | null>>;
  noListedRiskFlagsConfirmed?: boolean;
  linkExistingPatient?: boolean;
  optionalPii?: {
    fullName?: string | null;
    nic?: string | null;
    contactPhone?: string | null;
  } | null;
}

export interface CreateTriageResponse {
  admission: AdmissionDto;
  patientId: string;
  linkedExistingPatient: boolean;
}

export interface UpdateAdmissionRiskFlagsRequest {
  riskFlagKeys: RiskFlagKey[];
  riskFlagNotes?: Partial<Record<RiskFlagKey, string | null>>;
  noListedRiskFlagsConfirmed?: boolean;
  reason?: string | null;
}

export interface PaginatedAdmissionsResponse {
  items: AdmissionSummaryDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
