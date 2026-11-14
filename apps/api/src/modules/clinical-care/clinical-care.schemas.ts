import { z } from 'zod';
import {
  AnaesthesiaReviewStatus,
  CaesareanDecision,
  CarePlanLifecycleState,
  CarePlanReviewOutcome,
  ClinicalObservationType,
  EmergencyResponseCategory,
  EmergencyResponseStatus,
  EscalationCategory,
  EscalationPriority,
  EscalationStatus,
  SurgicalReviewStatus,
  TheatreReadinessStatus,
} from '@lrms/shared';

// ============================================================================
// 1. CARE PLANS
// ============================================================================

export const createCarePlanSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  assessmentSummary: z.string().min(10, 'Assessment summary must be at least 10 characters'),
  clinicalConcerns: z.string().nullable().optional(),
  objectives: z.string().min(5, 'Objectives must be at least 5 characters'),
  plannedActions: z.string().min(5, 'Planned actions must be at least 5 characters'),
  responsibleDoctorId: z.string().uuid('Invalid doctor ID').nullable().optional(),
  plannedReviewAt: z.string().datetime().nullable().optional(),
  assignedStaffRoles: z.record(z.string()).nullable().optional(),
  submitForApproval: z.boolean().optional(),
});

export const transitionCarePlanSchema = z.object({
  targetState: z.nativeEnum(CarePlanLifecycleState, {
    errorMap: () => ({ message: 'Invalid target care plan state' }),
  }),
  reason: z.string().nullable().optional(),
});

export const amendCarePlanSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  assessmentSummary: z.string().min(10, 'Assessment summary must be at least 10 characters'),
  clinicalConcerns: z.string().nullable().optional(),
  objectives: z.string().min(5, 'Objectives must be at least 5 characters'),
  plannedActions: z.string().min(5, 'Planned actions must be at least 5 characters'),
  changeReason: z
    .string()
    .min(10, 'Mandatory care plan amendment reason must be at least 10 characters'),
  plannedReviewAt: z.string().datetime().nullable().optional(),
  assignedStaffRoles: z.record(z.string()).nullable().optional(),
});

export const recordCarePlanReviewSchema = z.object({
  reviewOutcome: z.nativeEnum(CarePlanReviewOutcome, {
    errorMap: () => ({ message: 'Invalid review outcome' }),
  }),
  reviewNotes: z.string().min(10, 'Review notes must be at least 10 characters'),
  nextReviewAt: z.string().datetime().nullable().optional(),
});

// ============================================================================
// 2. CLINICAL ESCALATIONS
// ============================================================================

export const createEscalationSchema = z.object({
  category: z.nativeEnum(EscalationCategory, {
    errorMap: () => ({ message: 'Invalid escalation category' }),
  }),
  priority: z.nativeEnum(EscalationPriority, {
    errorMap: () => ({ message: 'Invalid escalation priority' }),
  }),
  clinicalReason: z.string().min(10, 'Clinical reason must be at least 10 characters'),
  sourceObservationType: z.nativeEnum(ClinicalObservationType).nullable().optional(),
  sourceObservationId: z.string().uuid('Invalid source observation ID').nullable().optional(),
  assignedRecipientUserId: z.string().uuid('Invalid recipient user ID').nullable().optional(),
});

export const acknowledgeEscalationSchema = z.object({
  notes: z.string().nullable().optional(),
});

export const assignEscalationSchema = z.object({
  assignedRecipientUserId: z.string().uuid('Invalid recipient user ID'),
  reason: z.string().min(5, 'Reassignment reason must be at least 5 characters'),
});

export const transitionEscalationSchema = z.object({
  targetStatus: z.nativeEnum(EscalationStatus, {
    errorMap: () => ({ message: 'Invalid target escalation status' }),
  }),
  notes: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export const resolveEscalationSchema = z.object({
  clinicalResponseNotes: z
    .string()
    .min(10, 'Clinical response notes must be at least 10 characters'),
  closureReason: z.string().nullable().optional(),
});

// ============================================================================
// 3. EMERGENCY RESPONSES
// ============================================================================

export const createEmergencyResponseSchema = z.object({
  category: z.nativeEnum(EmergencyResponseCategory, {
    errorMap: () => ({ message: 'Invalid emergency response category' }),
  }),
  clinicalReason: z.string().min(10, 'Clinical reason must be at least 10 characters'),
  assignedTeam: z.string().max(100).nullable().optional(),
  assignedResponderUserId: z.string().uuid('Invalid responder user ID').nullable().optional(),
});

export const acknowledgeEmergencyResponseSchema = z.object({
  actionNotes: z.string().nullable().optional(),
});

export const transitionEmergencyResponseSchema = z.object({
  targetStatus: z.nativeEnum(EmergencyResponseStatus, {
    errorMap: () => ({ message: 'Invalid target emergency response status' }),
  }),
  actionNotes: z.string().nullable().optional(),
  resolutionNotes: z.string().nullable().optional(),
});

// ============================================================================
// 4. SURGICAL REVIEWS
// ============================================================================

export const createSurgicalReviewSchema = z.object({
  clinicalIndication: z.string().min(10, 'Clinical indication must be at least 10 characters'),
  consultantUserId: z.string().uuid('Invalid consultant user ID').nullable().optional(),
});

export const recordSurgicalDecisionSchema = z.object({
  caesareanDecision: z.nativeEnum(CaesareanDecision, {
    errorMap: () => ({ message: 'Invalid caesarean decision' }),
  }),
  decisionRationale: z.string().min(10, 'Decision rationale must be at least 10 characters'),
  consultantUserId: z.string().uuid('Invalid consultant user ID').nullable().optional(),
});

export const updateSurgicalCoordinationSchema = z.object({
  anaesthesiaReviewStatus: z.nativeEnum(AnaesthesiaReviewStatus).optional(),
  anaesthesiaNotes: z.string().nullable().optional(),
  theatreReadinessStatus: z.nativeEnum(TheatreReadinessStatus).optional(),
  handoverNotes: z.string().nullable().optional(),
  targetStatus: z.nativeEnum(SurgicalReviewStatus).optional(),
});

// ============================================================================
// 5. EMERGENCY ACCESS OVERRIDES
// ============================================================================

export const createEmergencyOverrideSchema = z.object({
  reason: z
    .string()
    .min(15, 'Emergency override justification must be at least 15 characters to prevent abuse'),
  overrideDurationMinutes: z
    .number()
    .int()
    .min(5, 'Minimum duration is 5 minutes')
    .max(480, 'Maximum duration is 480 minutes (8 hours)')
    .optional(),
});
