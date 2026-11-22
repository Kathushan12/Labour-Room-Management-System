import {
  AlertReceiptState,
  ClinicalCarePlanDto,
  ClinicalCarePlanReviewDto,
  ClinicalCarePlanVersionDto,
  ClinicalEscalationDto,
  ClinicalEscalationHistoryDto,
  EmergencyOverrideDto,
  EmergencyResponseDto,
  SurgicalReviewDto,
  UserSummaryDto,
} from '@lrms/shared';
import {
  ClinicalCarePlan,
  ClinicalCarePlanReview,
  ClinicalCarePlanVersion,
  ClinicalEscalation,
  ClinicalEscalationHistory,
  EmergencyOverride,
  EmergencyResponse,
  SurgicalReview,
  User,
} from '../../database/entities/index.js';

export function toUserSummaryDto(user?: User | null): UserSummaryDto | undefined {
  if (!user) return undefined;
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role?.name as any,
  };
}

export function toCarePlanVersionDto(version: ClinicalCarePlanVersion): ClinicalCarePlanVersionDto {
  return {
    id: version.id,
    carePlanId: version.carePlanId,
    versionNumber: version.versionNumber,
    title: version.title,
    assessmentSummary: version.assessmentSummary,
    clinicalConcerns: version.clinicalConcerns ?? null,
    objectives: version.objectives,
    plannedActions: version.plannedActions,
    assignedStaffRoles: version.assignedStaffRoles ?? null,
    createdByUserId: version.createdByUserId,
    changeReason: version.changeReason ?? null,
    createdAt: version.createdAt.toISOString(),
    createdByUser: toUserSummaryDto(version.createdByUser),
  };
}

export function toCarePlanReviewDto(review: ClinicalCarePlanReview): ClinicalCarePlanReviewDto {
  return {
    id: review.id,
    carePlanId: review.carePlanId,
    reviewedByUserId: review.reviewedByUserId,
    reviewOutcome: review.reviewOutcome,
    reviewNotes: review.reviewNotes,
    nextReviewAt: review.nextReviewAt ? review.nextReviewAt.toISOString() : null,
    reviewedVersionNumber: review.reviewedVersionNumber,
    createdAt: review.createdAt.toISOString(),
    reviewedByUser: toUserSummaryDto(review.reviewedByUser),
  };
}

export function toCarePlanDto(plan: ClinicalCarePlan): ClinicalCarePlanDto {
  const versions = plan.versions?.map(toCarePlanVersionDto);
  const reviews = plan.reviews?.map(toCarePlanReviewDto);
  const currentVersion = versions?.find((v) => v.versionNumber === plan.currentVersionNumber);

  return {
    id: plan.id,
    admissionId: plan.admissionId,
    carePlanReferenceId: plan.carePlanReferenceId,
    currentState: plan.currentState,
    currentVersionNumber: plan.currentVersionNumber,
    createdByUserId: plan.createdByUserId,
    responsibleDoctorId: plan.responsibleDoctorId ?? null,
    approvedByUserId: plan.approvedByUserId ?? null,
    approvedAt: plan.approvedAt ? plan.approvedAt.toISOString() : null,
    plannedReviewAt: plan.plannedReviewAt ? plan.plannedReviewAt.toISOString() : null,
    lastReviewedAt: plan.lastReviewedAt ? plan.lastReviewedAt.toISOString() : null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    createdByUser: toUserSummaryDto(plan.createdByUser),
    responsibleDoctor: toUserSummaryDto(plan.responsibleDoctor),
    approvedByUser: toUserSummaryDto(plan.approvedByUser),
    currentVersion,
    versions,
    reviews,
  };
}

export function toEscalationHistoryDto(h: ClinicalEscalationHistory): ClinicalEscalationHistoryDto {
  return {
    id: h.id,
    escalationId: h.escalationId,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    changedByUserId: h.changedByUserId,
    previousAssignedUserId: h.previousAssignedUserId ?? null,
    newAssignedUserId: h.newAssignedUserId ?? null,
    reason: h.reason ?? null,
    notes: h.notes ?? null,
    createdAt: h.createdAt.toISOString(),
    changedByUser: toUserSummaryDto(h.changedByUser),
  };
}

export function toAlertReceiptState(
  esc: Pick<ClinicalEscalation, 'deliveredAt' | 'acknowledgedAt'>,
): AlertReceiptState {
  if (esc.acknowledgedAt) return AlertReceiptState.ACKNOWLEDGED;
  if (esc.deliveredAt) return AlertReceiptState.DELIVERED;
  return AlertReceiptState.DISPATCHED;
}

export function toEscalationDto(esc: ClinicalEscalation): ClinicalEscalationDto {
  return {
    id: esc.id,
    admissionId: esc.admissionId,
    escalationReferenceId: esc.escalationReferenceId,
    category: esc.category,
    priority: esc.priority,
    status: esc.status,
    clinicalReason: esc.clinicalReason,
    sourceObservationType: esc.sourceObservationType ?? null,
    sourceObservationId: esc.sourceObservationId ?? null,
    initiatedByUserId: esc.initiatedByUserId,
    assignedRecipientUserId: esc.assignedRecipientUserId ?? null,
    alertState: toAlertReceiptState(esc),
    dispatchedAt: esc.dispatchedAt.toISOString(),
    deliveredAt: esc.deliveredAt ? esc.deliveredAt.toISOString() : null,
    timedOutAt: esc.timedOutAt ? esc.timedOutAt.toISOString() : null,
    recipientContactNumber: null,
    acknowledgedAt: esc.acknowledgedAt ? esc.acknowledgedAt.toISOString() : null,
    acknowledgedByUserId: esc.acknowledgedByUserId ?? null,
    assessmentAt: esc.assessmentAt ? esc.assessmentAt.toISOString() : null,
    resolvedAt: esc.resolvedAt ? esc.resolvedAt.toISOString() : null,
    resolvedByUserId: esc.resolvedByUserId ?? null,
    clinicalResponseNotes: esc.clinicalResponseNotes ?? null,
    closureReason: esc.closureReason ?? null,
    createdAt: esc.createdAt.toISOString(),
    updatedAt: esc.updatedAt.toISOString(),
    initiatedByUser: toUserSummaryDto(esc.initiatedByUser),
    assignedRecipientUser: toUserSummaryDto(esc.assignedRecipientUser),
    acknowledgedByUser: toUserSummaryDto(esc.acknowledgedByUser),
    resolvedByUser: toUserSummaryDto(esc.resolvedByUser),
    history: esc.history?.map(toEscalationHistoryDto),
  };
}

export function toEmergencyResponseDto(er: EmergencyResponse): EmergencyResponseDto {
  return {
    id: er.id,
    admissionId: er.admissionId,
    responseReferenceId: er.responseReferenceId,
    category: er.category,
    status: er.status,
    clinicalReason: er.clinicalReason,
    initiatedByUserId: er.initiatedByUserId,
    assignedTeam: er.assignedTeam ?? null,
    assignedResponderUserId: er.assignedResponderUserId ?? null,
    acknowledgedAt: er.acknowledgedAt ? er.acknowledgedAt.toISOString() : null,
    acknowledgedByUserId: er.acknowledgedByUserId ?? null,
    actionNotes: er.actionNotes ?? null,
    resolutionNotes: er.resolutionNotes ?? null,
    resolvedAt: er.resolvedAt ? er.resolvedAt.toISOString() : null,
    createdAt: er.createdAt.toISOString(),
    updatedAt: er.updatedAt.toISOString(),
    initiatedByUser: toUserSummaryDto(er.initiatedByUser),
    assignedResponderUser: toUserSummaryDto(er.assignedResponderUser),
    acknowledgedByUser: toUserSummaryDto(er.acknowledgedByUser),
  };
}

export function toSurgicalReviewDto(sr: SurgicalReview): SurgicalReviewDto {
  return {
    id: sr.id,
    admissionId: sr.admissionId,
    reviewReferenceId: sr.reviewReferenceId,
    status: sr.status,
    caesareanDecision: sr.caesareanDecision,
    clinicalIndication: sr.clinicalIndication,
    decisionRationale: sr.decisionRationale ?? null,
    requestedByUserId: sr.requestedByUserId,
    consultantUserId: sr.consultantUserId ?? null,
    consultantAssessedAt: sr.consultantAssessedAt ? sr.consultantAssessedAt.toISOString() : null,
    decisionRecordedAt: sr.decisionRecordedAt ? sr.decisionRecordedAt.toISOString() : null,
    anaesthesiaReviewStatus: sr.anaesthesiaReviewStatus,
    anaesthesiaNotes: sr.anaesthesiaNotes ?? null,
    theatreReadinessStatus: sr.theatreReadinessStatus,
    theatreReadyAt: sr.theatreReadyAt ? sr.theatreReadyAt.toISOString() : null,
    handedOverAt: sr.handedOverAt ? sr.handedOverAt.toISOString() : null,
    handoverNotes: sr.handoverNotes ?? null,
    createdAt: sr.createdAt.toISOString(),
    updatedAt: sr.updatedAt.toISOString(),
    requestedByUser: toUserSummaryDto(sr.requestedByUser),
    consultantUser: toUserSummaryDto(sr.consultantUser),
  };
}

export function toEmergencyOverrideDto(eo: EmergencyOverride): EmergencyOverrideDto {
  const isExpired = eo.expiresAt ? new Date() > eo.expiresAt : false;
  const isRevoked = !!eo.revokedAt;
  const isActive = !isRevoked && !isExpired;

  return {
    id: eo.id,
    admissionId: eo.admissionId,
    staffId: eo.staffId,
    reason: eo.reason,
    overrideDurationMinutes: eo.overrideDurationMinutes ?? null,
    grantedAt: eo.grantedAt.toISOString(),
    expiresAt: eo.expiresAt ? eo.expiresAt.toISOString() : null,
    revokedAt: eo.revokedAt ? eo.revokedAt.toISOString() : null,
    revokedByUserId: eo.revokedByUserId ?? null,
    createdAt: eo.createdAt.toISOString(),
    staff: toUserSummaryDto(eo.staff),
    isActive,
  };
}
