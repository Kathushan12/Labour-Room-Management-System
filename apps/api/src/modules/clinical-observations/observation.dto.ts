import {
  ClinicalObservationAmendmentDto,
  ContractionObservationDto,
  FetalObservationDto,
  LabourAssessmentDto,
  MaternalObservationDto,
  UserSummaryDto,
} from '@lrms/shared';
import {
  ClinicalObservationAmendment,
  ContractionObservation,
  FetalObservation,
  LabourAssessment,
  MaternalObservation,
  User,
} from '../../database/entities/index.js';
import { fetalHighlights, maternalHighlights } from './observation-highlights.js';

export function toUserSummaryDto(user?: User | null): UserSummaryDto | undefined {
  if (!user) return undefined;
  const roleName =
    typeof user.role === 'object' && user.role !== null && 'name' in user.role
      ? (user.role as { name: string }).name
      : String(user.role || '');
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: roleName as unknown as UserSummaryDto['role'],
  };
}

export function toMaternalObservationDto(entity: MaternalObservation): MaternalObservationDto {
  const systolicBp = entity.systolicBp !== null ? Number(entity.systolicBp) : null;
  const diastolicBp = entity.diastolicBp !== null ? Number(entity.diastolicBp) : null;
  const pulseRateBpm = entity.pulseRateBpm !== null ? Number(entity.pulseRateBpm) : null;
  return {
    id: entity.id,
    admissionId: entity.admissionId,
    recordedByUserId: entity.recordedByUserId,
    systolicBp: entity.systolicBp !== null ? Number(entity.systolicBp) : null,
    diastolicBp: entity.diastolicBp !== null ? Number(entity.diastolicBp) : null,
    bloodGlucoseValue:
      entity.bloodGlucoseValue !== null && entity.bloodGlucoseValue !== undefined
        ? Number(entity.bloodGlucoseValue)
        : null,
    bloodGlucoseUnit: entity.bloodGlucoseUnit || null,
    temperatureCelsius:
      entity.temperatureCelsius !== null && entity.temperatureCelsius !== undefined
        ? Number(entity.temperatureCelsius)
        : null,
    pulseRateBpm: entity.pulseRateBpm !== null ? Number(entity.pulseRateBpm) : null,
    pulseRate: entity.pulseRateBpm !== null ? Number(entity.pulseRateBpm) : null,
    respiratoryRate: entity.respiratoryRate !== null ? Number(entity.respiratoryRate) : null,
    oxygenSaturationPercent:
      entity.oxygenSaturationPercent !== null ? Number(entity.oxygenSaturationPercent) : null,
    clinicalNotes: entity.clinicalNotes || null,
    observationTimestamp: new Date(entity.observationTimestamp).toISOString(),
    supersedesId: entity.supersedesId || null,
    supersedeReason: entity.supersedeReason || null,
    createdAt: new Date(entity.createdAt).toISOString(),
    recordedByUser: toUserSummaryDto(entity.recordedByUser),
    supersededObservation: entity.supersededObservation
      ? toMaternalObservationDto(entity.supersededObservation)
      : null,
    highlights: maternalHighlights({ systolicBp, diastolicBp, pulseRateBpm }),
  };
}

export function toFetalObservationDto(entity: FetalObservation): FetalObservationDto {
  return {
    id: entity.id,
    admissionId: entity.admissionId,
    recordedByUserId: entity.recordedByUserId,
    fetalHeartRateBpm: Number(entity.fetalHeartRateBpm),
    fetalHeartRateUnit: entity.fetalHeartRateUnit || 'BPM',
    variability: entity.variability || null,
    decelerations: entity.decelerations || null,
    accelerations: entity.accelerations || null,
    liquorStatus: entity.liquorStatus || null,
    clinicalNotes: entity.clinicalNotes || null,
    observationTimestamp: new Date(entity.observationTimestamp).toISOString(),
    supersedesId: entity.supersedesId || null,
    supersedeReason: entity.supersedeReason || null,
    createdAt: new Date(entity.createdAt).toISOString(),
    recordedByUser: toUserSummaryDto(entity.recordedByUser),
    supersededObservation: entity.supersededObservation
      ? toFetalObservationDto(entity.supersededObservation)
      : null,
    highlights: fetalHighlights({ fetalHeartRateBpm: Number(entity.fetalHeartRateBpm) }),
  };
}

export function toLabourAssessmentDto(entity: LabourAssessment): LabourAssessmentDto {
  return {
    id: entity.id,
    admissionId: entity.admissionId,
    recordedByUserId: entity.recordedByUserId,
    cervicalDilationCm:
      entity.cervicalDilationCm !== null && entity.cervicalDilationCm !== undefined
        ? Number(entity.cervicalDilationCm)
        : null,
    cervicalEffacementPercent:
      entity.cervicalEffacementPercent !== null ? Number(entity.cervicalEffacementPercent) : null,
    fetalStation: entity.fetalStation || null,
    fetalDescentFifths:
      entity.fetalDescentFifths !== null ? Number(entity.fetalDescentFifths) : null,
    membraneStatus: entity.membraneStatus || null,
    liquorAppearance: entity.liquorAppearance || null,
    fetalPosition: entity.fetalPosition || null,
    caput: entity.caput || null,
    moulding: entity.moulding || null,
    clinicalNotes: entity.clinicalNotes || null,
    observationTimestamp: new Date(entity.observationTimestamp).toISOString(),
    supersedesId: entity.supersedesId || null,
    supersedeReason: entity.supersedeReason || null,
    createdAt: new Date(entity.createdAt).toISOString(),
    recordedByUser: toUserSummaryDto(entity.recordedByUser),
    supersededAssessment: entity.supersededAssessment
      ? toLabourAssessmentDto(entity.supersededAssessment)
      : null,
  };
}

export function toContractionObservationDto(
  entity: ContractionObservation,
): ContractionObservationDto {
  return {
    id: entity.id,
    admissionId: entity.admissionId,
    recordedByUserId: entity.recordedByUserId,
    contractionsCount: Number(entity.contractionsCount),
    observationWindowMinutes: Number(entity.observationWindowMinutes || 10),
    durationSeconds: entity.durationSeconds !== null ? Number(entity.durationSeconds) : null,
    intensity: entity.intensity || null,
    clinicalNotes: entity.clinicalNotes || null,
    observationTimestamp: new Date(entity.observationTimestamp).toISOString(),
    supersedesId: entity.supersedesId || null,
    supersedeReason: entity.supersedeReason || null,
    createdAt: new Date(entity.createdAt).toISOString(),
    recordedByUser: toUserSummaryDto(entity.recordedByUser),
    supersededObservation: entity.supersededObservation
      ? toContractionObservationDto(entity.supersededObservation)
      : null,
  };
}

export function toClinicalObservationAmendmentDto(
  entity: ClinicalObservationAmendment,
): ClinicalObservationAmendmentDto {
  return {
    id: entity.id,
    admissionId: entity.admissionId,
    observationType: entity.observationType,
    originalObservationId: entity.originalObservationId,
    amendedObservationId: entity.amendedObservationId,
    amendedByUserId: entity.amendedByUserId,
    amendmentReason: entity.amendmentReason,
    previousValues: entity.previousValues || {},
    amendedValues: entity.amendedValues || {},
    createdAt: new Date(entity.createdAt).toISOString(),
    amendedByUser: toUserSummaryDto(entity.amendedByUser),
  };
}
