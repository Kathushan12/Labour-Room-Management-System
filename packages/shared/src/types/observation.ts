import {
  CaputGrade,
  ClinicalObservationType,
  ContractionIntensity,
  FetalPosition,
  GlucoseUnit,
  LiquorAppearance,
  MembraneStatus,
  MouldingGrade,
  UserRole,
} from '../enums/index.js';

export interface UserSummaryDto {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

// ============================================================================
// MATERNAL OBSERVATIONS
// ============================================================================
export interface MaternalObservationDto {
  id: string;
  admissionId: string;
  recordedByUserId: string;
  systolicBp: number | null;
  diastolicBp: number | null;
  bloodGlucoseValue: number | null;
  bloodGlucoseUnit: GlucoseUnit | null;
  temperatureCelsius: number | null;
  pulseRateBpm: number | null;
  pulseRate?: number | null;
  respiratoryRate: number | null;
  oxygenSaturationPercent: number | null;
  clinicalNotes: string | null;
  observationTimestamp: string;
  supersedesId: string | null;
  supersedeReason: string | null;
  createdAt: string;
  recordedByUser?: UserSummaryDto;
  supersededObservation?: MaternalObservationDto | null;
}

export interface CreateMaternalObservationRequest {
  systolicBp?: number | null;
  diastolicBp?: number | null;
  bloodGlucoseValue?: number | null;
  bloodGlucoseUnit?: GlucoseUnit | null;
  temperatureCelsius?: number | null;
  pulseRateBpm?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturationPercent?: number | null;
  clinicalNotes?: string | null;
  observationTimestamp?: string;
}

// ============================================================================
// FETAL OBSERVATIONS
// ============================================================================
export interface FetalObservationDto {
  id: string;
  admissionId: string;
  recordedByUserId: string;
  fetalHeartRateBpm: number;
  fetalHeartRateUnit: string;
  variability: string | null;
  decelerations: string | null;
  accelerations: string | null;
  liquorStatus: string | null;
  clinicalNotes: string | null;
  observationTimestamp: string;
  supersedesId: string | null;
  supersedeReason: string | null;
  createdAt: string;
  recordedByUser?: UserSummaryDto;
  supersededObservation?: FetalObservationDto | null;
}

export interface CreateFetalObservationRequest {
  fetalHeartRateBpm: number;
  fetalHeartRateUnit?: string;
  variability?: string | null;
  decelerations?: string | null;
  accelerations?: string | null;
  liquorStatus?: string | null;
  clinicalNotes?: string | null;
  observationTimestamp?: string;
}

// ============================================================================
// LABOUR ASSESSMENTS
// ============================================================================
export interface LabourAssessmentDto {
  id: string;
  admissionId: string;
  recordedByUserId: string;
  cervicalDilationCm: number | null;
  cervicalEffacementPercent: number | null;
  fetalStation: string | null;
  fetalDescentFifths: number | null;
  membraneStatus: MembraneStatus | null;
  liquorAppearance: LiquorAppearance | null;
  fetalPosition: FetalPosition | null;
  caput: CaputGrade | null;
  moulding: MouldingGrade | null;
  clinicalNotes: string | null;
  observationTimestamp: string;
  supersedesId: string | null;
  supersedeReason: string | null;
  createdAt: string;
  recordedByUser?: UserSummaryDto;
  supersededAssessment?: LabourAssessmentDto | null;
}

export interface CreateLabourAssessmentRequest {
  cervicalDilationCm?: number | null;
  cervicalEffacementPercent?: number | null;
  fetalStation?: string | null;
  fetalDescentFifths?: number | null;
  membraneStatus?: MembraneStatus | null;
  liquorAppearance?: LiquorAppearance | null;
  fetalPosition?: FetalPosition | null;
  caput?: CaputGrade | null;
  moulding?: MouldingGrade | null;
  clinicalNotes?: string | null;
  observationTimestamp?: string;
}

// ============================================================================
// CONTRACTION OBSERVATIONS
// ============================================================================
export interface ContractionObservationDto {
  id: string;
  admissionId: string;
  recordedByUserId: string;
  contractionsCount: number;
  observationWindowMinutes: number;
  durationSeconds: number | null;
  intensity: ContractionIntensity | null;
  clinicalNotes: string | null;
  observationTimestamp: string;
  supersedesId: string | null;
  supersedeReason: string | null;
  createdAt: string;
  recordedByUser?: UserSummaryDto;
  supersededObservation?: ContractionObservationDto | null;
}

export interface CreateContractionObservationRequest {
  contractionsCount: number;
  observationWindowMinutes?: number;
  durationSeconds?: number | null;
  intensity?: ContractionIntensity | null;
  clinicalNotes?: string | null;
  observationTimestamp?: string;
}

// ============================================================================
// CLINICAL OBSERVATION AMENDMENTS
// ============================================================================
export interface ClinicalObservationAmendmentDto {
  id: string;
  admissionId: string;
  observationType: ClinicalObservationType;
  originalObservationId: string;
  amendedObservationId: string;
  amendedByUserId: string;
  amendmentReason: string;
  previousValues: Record<string, unknown>;
  amendedValues: Record<string, unknown>;
  createdAt: string;
  amendedByUser?: UserSummaryDto;
}

export interface AmendClinicalObservationRequest {
  amendmentReason: string;
  amendedValues: Record<string, unknown>;
}

// ============================================================================
// COMPOSITE CLINICAL OBSERVATION HISTORY
// ============================================================================
export interface AdmissionObservationsSummaryDto {
  admissionId: string;
  maternalCount: number;
  fetalCount: number;
  labourAssessmentCount: number;
  contractionCount: number;
  totalObservationsCount: number;
  latestObservationTimestamp: string | null;
  maternalObservations: MaternalObservationDto[];
  fetalObservations: FetalObservationDto[];
  labourAssessments: LabourAssessmentDto[];
  contractions: ContractionObservationDto[];
  amendments: ClinicalObservationAmendmentDto[];
}
