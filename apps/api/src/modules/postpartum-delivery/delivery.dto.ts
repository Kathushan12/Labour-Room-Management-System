import {
  ApgarAssessmentDto,
  DeliveryDto,
  NewbornDto,
  PostpartumDischargeAuthorizationDto,
  PostpartumMaternalAssessmentDto,
  PostpartumNewbornAssessmentDto,
} from '@lrms/shared';
import { Delivery } from '../../database/entities/Delivery.js';
import { Newborn } from '../../database/entities/Newborn.js';
import { ApgarAssessment } from '../../database/entities/ApgarAssessment.js';
import { PostpartumMaternalAssessment } from '../../database/entities/PostpartumMaternalAssessment.js';
import { PostpartumNewbornAssessment } from '../../database/entities/PostpartumNewbornAssessment.js';
import { PostpartumDischargeAuthorization } from '../../database/entities/PostpartumDischargeAuthorization.js';

export function toDeliveryDto(entity: Delivery): DeliveryDto {
  return {
    id: entity.id,
    admissionId: entity.admissionId,
    deliveryReferenceId: entity.deliveryReferenceId,
    status: entity.status,
    deliveryTimestamp:
      entity.deliveryTimestamp instanceof Date
        ? entity.deliveryTimestamp.toISOString()
        : String(entity.deliveryTimestamp),
    deliveryMode: entity.deliveryMode,
    deliveryLocation: entity.deliveryLocation,
    attendingDoctorId: entity.attendingDoctorId,
    attendingDoctorFullName: entity.attendingDoctor?.fullName || null,
    responsibleMidwifeId: entity.responsibleMidwifeId,
    responsibleMidwifeFullName: entity.responsibleMidwife?.fullName || null,
    recordedByUserId: entity.recordedByUserId,
    recordedByFullName: entity.recordedByUser?.fullName || null,
    finalizedByUserId: entity.finalizedByUserId,
    finalizedByFullName: entity.finalizedByUser?.fullName || null,
    finalizedAt: entity.finalizedAt ? entity.finalizedAt.toISOString() : null,
    estimatedBloodLossMl: entity.estimatedBloodLossMl,
    perinealTraumaStatus: entity.perinealTraumaStatus,
    placentaStatus: entity.placentaStatus,
    placentaDeliveryTimestamp: entity.placentaDeliveryTimestamp
      ? entity.placentaDeliveryTimestamp.toISOString()
      : null,
    clinicalNotes: entity.clinicalNotes,
    amendmentReason: entity.amendmentReason,
    newborns: entity.newborns ? entity.newborns.map(toNewbornDto) : undefined,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function toNewbornDto(entity: Newborn): NewbornDto {
  return {
    id: entity.id,
    deliveryId: entity.deliveryId,
    admissionId: entity.admissionId,
    newbornReferenceId: entity.newbornReferenceId,
    birthOrder: entity.birthOrder,
    birthTimestamp:
      entity.birthTimestamp instanceof Date
        ? entity.birthTimestamp.toISOString()
        : String(entity.birthTimestamp),
    outcome: entity.outcome,
    sex: entity.sex,
    birthWeightGrams: entity.birthWeightGrams,
    gestationalAgeWeeks: entity.gestationalAgeWeeks,
    gestationalAgeDays: entity.gestationalAgeDays,
    deliveredByUserId: entity.deliveredByUserId,
    deliveredByFullName: entity.deliveredByUser?.fullName || null,
    dischargeStatus: entity.dischargeStatus,
    dischargedAt: entity.dischargedAt ? entity.dischargedAt.toISOString() : null,
    dischargedByUserId: entity.dischargedByUserId,
    provisionalName: entity.provisionalName,
    apgarAssessments: entity.apgarAssessments
      ? entity.apgarAssessments.map(toApgarAssessmentDto)
      : undefined,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function toApgarAssessmentDto(entity: ApgarAssessment): ApgarAssessmentDto {
  return {
    id: entity.id,
    newbornId: entity.newbornId,
    admissionId: entity.admissionId,
    assessmentMinute: entity.assessmentMinute,
    assessedAt:
      entity.assessedAt instanceof Date
        ? entity.assessedAt.toISOString()
        : String(entity.assessedAt),
    appearance: entity.appearance,
    pulse: entity.pulse,
    grimace: entity.grimace,
    activity: entity.activity,
    respiration: entity.respiration,
    totalScore: entity.totalScore,
    assessedByUserId: entity.assessedByUserId,
    assessedByFullName: entity.assessedByUser?.fullName || null,
    notes: entity.notes,
    supersedesId: entity.supersedesId,
    supersedeReason: entity.supersedeReason,
    createdAt: entity.createdAt.toISOString(),
  };
}

export function toPostpartumMaternalAssessmentDto(
  entity: PostpartumMaternalAssessment,
): PostpartumMaternalAssessmentDto {
  return {
    id: entity.id,
    admissionId: entity.admissionId,
    recordedByUserId: entity.recordedByUserId,
    recordedByFullName: entity.recordedByUser?.fullName || null,
    assessmentTimestamp:
      entity.assessmentTimestamp instanceof Date
        ? entity.assessmentTimestamp.toISOString()
        : String(entity.assessmentTimestamp),
    systolicBp: entity.systolicBp,
    diastolicBp: entity.diastolicBp,
    pulseRate: entity.pulseRate,
    respiratoryRate: entity.respiratoryRate,
    temperatureCelsius:
      entity.temperatureCelsius !== null ? Number(entity.temperatureCelsius) : null,
    fundalHeightCm: entity.fundalHeightCm,
    uterineTone: entity.uterineTone,
    lochiaAmount: entity.lochiaAmount,
    lochiaType: entity.lochiaType,
    perinealWoundStatus: entity.perinealWoundStatus,
    painScore: entity.painScore,
    bladderStatus: entity.bladderStatus,
    clinicalReviewStatus: entity.clinicalReviewStatus,
    clinicalNotes: entity.clinicalNotes,
    createdAt: entity.createdAt.toISOString(),
  };
}

export function toPostpartumNewbornAssessmentDto(
  entity: PostpartumNewbornAssessment,
): PostpartumNewbornAssessmentDto {
  return {
    id: entity.id,
    newbornId: entity.newbornId,
    admissionId: entity.admissionId,
    recordedByUserId: entity.recordedByUserId,
    recordedByFullName: entity.recordedByUser?.fullName || null,
    assessmentTimestamp:
      entity.assessmentTimestamp instanceof Date
        ? entity.assessmentTimestamp.toISOString()
        : String(entity.assessmentTimestamp),
    generalCondition: entity.generalCondition,
    respiratoryRate: entity.respiratoryRate,
    heartRate: entity.heartRate,
    temperatureCelsius:
      entity.temperatureCelsius !== null ? Number(entity.temperatureCelsius) : null,
    feedingStatus: entity.feedingStatus,
    cordCondition: entity.cordCondition,
    urinePassed: entity.urinePassed,
    meconiumPassed: entity.meconiumPassed,
    jaundiceStatus: entity.jaundiceStatus,
    clinicalNotes: entity.clinicalNotes,
    createdAt: entity.createdAt.toISOString(),
  };
}

export function toPostpartumDischargeAuthorizationDto(
  entity: PostpartumDischargeAuthorization,
): PostpartumDischargeAuthorizationDto {
  return {
    id: entity.id,
    admissionId: entity.admissionId,
    newbornId: entity.newbornId,
    dischargedEntityType: entity.dischargedEntityType,
    authorizedByDoctorId: entity.authorizedByDoctorId,
    authorizedByDoctorFullName: entity.authorizedByDoctor?.fullName || null,
    dischargedAt:
      entity.dischargedAt instanceof Date
        ? entity.dischargedAt.toISOString()
        : String(entity.dischargedAt),
    dischargeDestination: entity.dischargeDestination,
    maternalCondition: entity.maternalCondition,
    newbornCondition: entity.newbornCondition,
    dischargeSummary: entity.dischargeSummary,
    feedingPlan: entity.feedingPlan,
    followUpInstructions: entity.followUpInstructions,
    bedReleasedId: entity.bedReleasedId,
    createdAt: entity.createdAt.toISOString(),
  };
}
