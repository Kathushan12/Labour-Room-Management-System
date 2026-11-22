import { AdmissionDto, AdmissionSummaryDto, RiskFlagDto } from '@lrms/shared';
import { Admission, AdmissionRiskFlag } from '../../database/entities/index.js';

export function toRiskFlagDto(flag: AdmissionRiskFlag): RiskFlagDto {
  return {
    id: flag.id,
    definitionId: flag.riskFlagDefinitionId,
    key: flag.definition.key,
    label: flag.definition.label,
    notes: flag.notes ?? null,
    isActive: flag.isActive,
    flaggedByUserId: flag.flaggedByUserId,
    flaggedByUsername: flag.flaggedByUser?.username ?? null,
    flaggedByFullName: flag.flaggedByUser?.fullName ?? null,
    createdAt: flag.createdAt.toISOString(),
    deactivatedAt: flag.deactivatedAt ? flag.deactivatedAt.toISOString() : null,
    deactivatedByUserId: flag.deactivatedByUserId ?? null,
  };
}

export function toAdmissionSummaryDto(admission: Admission): AdmissionSummaryDto {
  const activeFlags = (admission.riskFlags || [])
    .filter((f) => f.isActive && f.definition)
    .map(toRiskFlagDto);

  const pii = admission.patient?.pii;
  const hasPii = Boolean(
    pii && (pii.fullNameCiphertext || pii.nicCiphertext || pii.contactPhoneCiphertext),
  );

  return {
    id: admission.id,
    admissionReferenceId: admission.admissionReferenceId,
    wardId: admission.wardId,
    patientId: admission.patientId ?? null,
    hasPii,
    admissionCategory: admission.admissionCategory,
    currentCarePlan: admission.currentCarePlan,
    gestationWeeks: admission.gestationWeeks ?? null,
    status: admission.status,
    admittedAt: admission.admittedAt.toISOString(),
    dischargedAt: admission.dischargedAt ? admission.dischargedAt.toISOString() : null,
    admittedByUserId: admission.admittedByUserId,
    admittedByFullName: admission.admittedByUser?.fullName ?? null,
    noListedRiskFlagsConfirmed: admission.noListedRiskFlagsConfirmed,
    riskAssessmentCompletedAt: admission.riskAssessmentCompletedAt
      ? admission.riskAssessmentCompletedAt.toISOString()
      : null,
    riskFlags: activeFlags,
    createdAt: admission.createdAt.toISOString(),
    updatedAt: admission.updatedAt.toISOString(),
  };
}

export function toAdmissionDto(admission: Admission): AdmissionDto {
  const historicalRiskFlags = (admission.riskFlags || [])
    .filter((f) => Boolean(f.definition))
    .map(toRiskFlagDto);

  return {
    ...toAdmissionSummaryDto(admission),
    historicalRiskFlags,
  };
}
