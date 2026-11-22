import { z } from 'zod';
import {
  ApgarMinute,
  BirthOutcome,
  DeliveryMode,
  LochiaAmount,
  LochiaType,
  MaternalReviewStatus,
  NewbornCordCondition,
  NewbornDischargeStatus,
  NewbornFeedingStatus,
  NewbornGeneralCondition,
  NewbornJaundiceStatus,
  DischargeDestination,
  NewbornSex,
  UterineTone,
} from '@lrms/shared';

// ============================================================================
// 1. DELIVERY
// ============================================================================

export const createDeliverySchema = z.object({
  deliveryTimestamp: z.string().datetime({ message: 'Valid delivery timestamp is required' }),
  deliveryMode: z.nativeEnum(DeliveryMode, {
    errorMap: () => ({ message: 'Valid delivery mode is required' }),
  }),
  deliveryLocation: z.string().min(2).max(100),
  attendingDoctorId: z.string().uuid('Valid attending doctor ID is required'),
  responsibleMidwifeId: z.string().uuid('Invalid midwife user ID').nullable().optional(),
  estimatedBloodLossMl: z.number().int().min(0).max(10000).nullable().optional(),
  perinealTraumaStatus: z.string().max(50).nullable().optional(),
  placentaStatus: z.string().max(50).nullable().optional(),
  placentaDeliveryTimestamp: z.string().datetime().nullable().optional(),
  clinicalNotes: z.string().nullable().optional(),
});

export const updateDeliverySchema = z.object({
  deliveryTimestamp: z.string().datetime().optional(),
  deliveryMode: z.nativeEnum(DeliveryMode).optional(),
  deliveryLocation: z.string().min(2).max(100).optional(),
  attendingDoctorId: z.string().uuid().optional(),
  responsibleMidwifeId: z.string().uuid().nullable().optional(),
  estimatedBloodLossMl: z.number().int().min(0).max(10000).nullable().optional(),
  perinealTraumaStatus: z.string().max(50).nullable().optional(),
  placentaStatus: z.string().max(50).nullable().optional(),
  placentaDeliveryTimestamp: z.string().datetime().nullable().optional(),
  clinicalNotes: z.string().nullable().optional(),
  amendmentReason: z.string().max(500).nullable().optional(),
});

export const finalizeDeliverySchema = z.object({
  clinicalSummary: z.string().nullable().optional(),
});

// ============================================================================
// 2. NEWBORN REGISTRATION
// ============================================================================

export const registerNewbornSchema = z.object({
  birthOrder: z.number().int().min(1).max(10),
  birthTimestamp: z.string().datetime({ message: 'Valid birth timestamp is required' }),
  outcome: z.nativeEnum(BirthOutcome, {
    errorMap: () => ({ message: 'Valid birth outcome is required' }),
  }),
  sex: z.nativeEnum(NewbornSex, {
    errorMap: () => ({ message: 'Valid newborn sex is required' }),
  }),
  birthWeightGrams: z
    .number()
    .int()
    .min(300, 'Birth weight must be at least 300g')
    .max(7000, 'Birth weight must be at most 7000g'),
  gestationalAgeWeeks: z.number().int().min(20).max(45).nullable().optional(),
  gestationalAgeDays: z.number().int().min(0).max(6).nullable().optional(),
  deliveredByUserId: z.string().uuid('Valid delivering clinician ID is required'),
  provisionalName: z.string().max(100).nullable().optional(),
});

// ============================================================================
// 3. APGAR ASSESSMENTS
// ============================================================================

export const recordApgarSchema = z.object({
  assessmentMinute: z.nativeEnum(ApgarMinute, {
    errorMap: () => ({ message: 'Valid assessment minute is required' }),
  }),
  assessedAt: z.string().datetime().optional(),
  appearance: z.number().int().min(0).max(2, 'Appearance score must be 0, 1, or 2'),
  pulse: z.number().int().min(0).max(2, 'Pulse score must be 0, 1, or 2'),
  grimace: z.number().int().min(0).max(2, 'Grimace score must be 0, 1, or 2'),
  activity: z.number().int().min(0).max(2, 'Activity score must be 0, 1, or 2'),
  respiration: z.number().int().min(0).max(2, 'Respiration score must be 0, 1, or 2'),
  notes: z.string().nullable().optional(),
  supersedesId: z.string().uuid().nullable().optional(),
  supersedeReason: z.string().nullable().optional(),
});

// ============================================================================
// 4. POSTPARTUM MATERNAL CARE
// ============================================================================

export const createPostpartumMaternalAssessmentSchema = z.object({
  assessmentTimestamp: z.string().datetime().optional(),
  systolicBp: z.number().int().min(50).max(280).nullable().optional(),
  diastolicBp: z.number().int().min(30).max(180).nullable().optional(),
  pulseRate: z.number().int().min(30).max(220).nullable().optional(),
  respiratoryRate: z.number().int().min(8).max(60).nullable().optional(),
  temperatureCelsius: z.number().min(30.0).max(45.0).nullable().optional(),
  fundalHeightCm: z.number().int().min(0).max(40).nullable().optional(),
  uterineTone: z.nativeEnum(UterineTone).nullable().optional(),
  lochiaAmount: z.nativeEnum(LochiaAmount).nullable().optional(),
  lochiaType: z.nativeEnum(LochiaType).nullable().optional(),
  perinealWoundStatus: z.string().max(50).nullable().optional(),
  painScore: z.number().int().min(0).max(10).nullable().optional(),
  bladderStatus: z.string().max(30).nullable().optional(),
  clinicalReviewStatus: z.nativeEnum(MaternalReviewStatus).optional(),
  clinicalNotes: z.string().nullable().optional(),
});

// ============================================================================
// 5. POSTPARTUM NEWBORN CARE
// ============================================================================

export const createPostpartumNewbornAssessmentSchema = z.object({
  assessmentTimestamp: z.string().datetime().optional(),
  generalCondition: z.nativeEnum(NewbornGeneralCondition, {
    errorMap: () => ({ message: 'Valid newborn general condition is required' }),
  }),
  respiratoryRate: z.number().int().min(10).max(120).nullable().optional(),
  heartRate: z.number().int().min(50).max(240).nullable().optional(),
  temperatureCelsius: z.number().min(30.0).max(45.0).nullable().optional(),
  feedingStatus: z.nativeEnum(NewbornFeedingStatus, {
    errorMap: () => ({ message: 'Valid feeding status is required' }),
  }),
  cordCondition: z.nativeEnum(NewbornCordCondition, {
    errorMap: () => ({ message: 'Valid cord condition is required' }),
  }),
  urinePassed: z.boolean().optional(),
  meconiumPassed: z.boolean().optional(),
  jaundiceStatus: z.nativeEnum(NewbornJaundiceStatus).optional(),
  clinicalNotes: z.string().nullable().optional(),
});

// ============================================================================
// 6. POSTPARTUM DISCHARGE AUTHORIZATION
// ============================================================================

export const authorizeMaternalDischargeSchema = z.object({
  dischargedAt: z.string().datetime().optional(),
  dischargeDestination: z.nativeEnum(DischargeDestination, {
    errorMap: () => ({
      message: 'Destination must be POSTNATAL, ANTENATAL, THEATRE, ICU or OTHER',
    }),
  }),
  maternalCondition: z.string().min(2).max(50),
  dischargeSummary: z.string().min(10, 'Discharge summary must be at least 10 characters'),
  followUpInstructions: z.string().min(5, 'Follow-up instructions must be at least 5 characters'),
  releaseBed: z.boolean().optional(),
});

export const authorizeNewbornDischargeSchema = z.object({
  dischargedAt: z.string().datetime().optional(),
  dischargeDestination: z.string().min(2).max(100),
  newbornCondition: z.string().min(2).max(50),
  dischargeStatus: z.nativeEnum(NewbornDischargeStatus, {
    errorMap: () => ({ message: 'Valid newborn discharge status is required' }),
  }),
  dischargeSummary: z.string().min(10, 'Discharge summary must be at least 10 characters'),
  feedingPlan: z.string().nullable().optional(),
  followUpInstructions: z.string().min(5, 'Follow-up instructions must be at least 5 characters'),
});
