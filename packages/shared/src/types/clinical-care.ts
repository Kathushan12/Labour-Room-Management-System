import {
  AlertReceiptState,
  AlertStateChange,
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
} from '../enums/index.js';
import { UserSummaryDto } from './observation.js';

// ============================================================================
// 1. CLINICAL CARE PLANS
// ============================================================================

export interface ClinicalCarePlanVersionDto {
  id: string;
  carePlanId: string;
  versionNumber: number;
  title: string;
  assessmentSummary: string;
  clinicalConcerns: string | null;
  objectives: string;
  plannedActions: string;
  assignedStaffRoles: Record<string, string> | null;
  createdByUserId: string;
  changeReason: string | null;
  createdAt: string;
  createdByUser?: UserSummaryDto;
}

export interface ClinicalCarePlanReviewDto {
  id: string;
  carePlanId: string;
  reviewedByUserId: string;
  reviewOutcome: CarePlanReviewOutcome;
  reviewNotes: string;
  nextReviewAt: string | null;
  reviewedVersionNumber: number;
  createdAt: string;
  reviewedByUser?: UserSummaryDto;
}

export interface ClinicalCarePlanDto {
  id: string;
  admissionId: string;
  carePlanReferenceId: string;
  currentState: CarePlanLifecycleState;
  currentVersionNumber: number;
  createdByUserId: string;
  responsibleDoctorId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  plannedReviewAt: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser?: UserSummaryDto;
  responsibleDoctor?: UserSummaryDto;
  approvedByUser?: UserSummaryDto;
  currentVersion?: ClinicalCarePlanVersionDto;
  versions?: ClinicalCarePlanVersionDto[];
  reviews?: ClinicalCarePlanReviewDto[];
}

export interface CreateCarePlanRequest {
  title: string;
  assessmentSummary: string;
  clinicalConcerns?: string | null;
  objectives: string;
  plannedActions: string;
  responsibleDoctorId?: string | null;
  plannedReviewAt?: string | null;
  assignedStaffRoles?: Record<string, string> | null;
  submitForApproval?: boolean;
}

export interface TransitionCarePlanRequest {
  targetState: CarePlanLifecycleState;
  reason?: string | null;
}

export interface AmendCarePlanRequest {
  title: string;
  assessmentSummary: string;
  clinicalConcerns?: string | null;
  objectives: string;
  plannedActions: string;
  changeReason: string;
  plannedReviewAt?: string | null;
  assignedStaffRoles?: Record<string, string> | null;
}

export interface RecordCarePlanReviewRequest {
  reviewOutcome: CarePlanReviewOutcome;
  reviewNotes: string;
  nextReviewAt?: string | null;
}

// ============================================================================
// 2. CLINICAL ESCALATION
// ============================================================================

export interface ClinicalEscalationHistoryDto {
  id: string;
  escalationId: string;
  fromStatus: EscalationStatus | null;
  toStatus: EscalationStatus;
  changedByUserId: string;
  previousAssignedUserId: string | null;
  newAssignedUserId: string | null;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  changedByUser?: UserSummaryDto;
}

export interface ClinicalEscalationDto {
  id: string;
  admissionId: string;
  escalationReferenceId: string;
  category: EscalationCategory;
  priority: EscalationPriority;
  status: EscalationStatus;
  clinicalReason: string;
  sourceObservationType: ClinicalObservationType | null;
  sourceObservationId: string | null;
  initiatedByUserId: string;
  assignedRecipientUserId: string | null;
  alertState: AlertReceiptState;
  dispatchedAt: string;
  deliveredAt: string | null;
  timedOutAt: string | null;
  // Only filled while the alert is timed out and not yet acknowledged.
  recipientContactNumber: string | null;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  assessmentAt: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  clinicalResponseNotes: string | null;
  closureReason: string | null;
  createdAt: string;
  updatedAt: string;
  initiatedByUser?: UserSummaryDto;
  assignedRecipientUser?: UserSummaryDto;
  acknowledgedByUser?: UserSummaryDto;
  resolvedByUser?: UserSummaryDto;
  history?: ClinicalEscalationHistoryDto[];
}

export interface EscalationFeedItemDto extends ClinicalEscalationDto {
  admissionReferenceId: string;
  bedNumber: string | null;
}

export interface AlertNewPayload {
  escalationId: string;
  admissionId: string;
  escalationReferenceId: string;
  admissionReferenceId: string;
  bedNumber: string | null;
  riskFlags: string[];
  category: EscalationCategory;
  priority: EscalationPriority;
  clinicalReason: string;
  dispatchedAt: string;
}

export interface AlertStatePayload {
  escalationId: string;
  admissionId: string;
  wardId: string;
  state: AlertStateChange;
  dispatchedAt: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  timedOutAt: string | null;
}

export interface AlertReceiptRequest {
  escalationId: string;
}

export interface AlertReceiptResponse {
  status: 'OK' | 'FORBIDDEN' | 'ERROR';
  reason?: string;
}

export interface CreateEscalationRequest {
  category: EscalationCategory;
  priority: EscalationPriority;
  clinicalReason: string;
  sourceObservationType?: ClinicalObservationType | null;
  sourceObservationId?: string | null;
  assignedRecipientUserId?: string | null;
}

export interface AcknowledgeEscalationRequest {
  notes?: string | null;
}

export interface AssignEscalationRequest {
  assignedRecipientUserId: string;
  reason: string;
}

export interface TransitionEscalationRequest {
  targetStatus: EscalationStatus;
  notes?: string | null;
  reason?: string | null;
}

export interface ResolveEscalationRequest {
  clinicalResponseNotes: string;
  closureReason?: string | null;
}

// ============================================================================
// 3. EMERGENCY RESPONSE
// ============================================================================

export interface EmergencyResponseDto {
  id: string;
  admissionId: string;
  responseReferenceId: string;
  category: EmergencyResponseCategory;
  status: EmergencyResponseStatus;
  clinicalReason: string;
  initiatedByUserId: string;
  assignedTeam: string | null;
  assignedResponderUserId: string | null;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  actionNotes: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  initiatedByUser?: UserSummaryDto;
  assignedResponderUser?: UserSummaryDto;
  acknowledgedByUser?: UserSummaryDto;
}

export interface CreateEmergencyResponseRequest {
  category: EmergencyResponseCategory;
  clinicalReason: string;
  assignedTeam?: string | null;
  assignedResponderUserId?: string | null;
}

export interface AcknowledgeEmergencyResponseRequest {
  actionNotes?: string | null;
}

export interface TransitionEmergencyResponseRequest {
  targetStatus: EmergencyResponseStatus;
  actionNotes?: string | null;
  resolutionNotes?: string | null;
}

// ============================================================================
// 4. SURGICAL REVIEW
// ============================================================================

export interface SurgicalReviewDto {
  id: string;
  admissionId: string;
  reviewReferenceId: string;
  status: SurgicalReviewStatus;
  caesareanDecision: CaesareanDecision;
  clinicalIndication: string;
  decisionRationale: string | null;
  requestedByUserId: string;
  consultantUserId: string | null;
  consultantAssessedAt: string | null;
  decisionRecordedAt: string | null;
  anaesthesiaReviewStatus: AnaesthesiaReviewStatus;
  anaesthesiaNotes: string | null;
  theatreReadinessStatus: TheatreReadinessStatus;
  theatreReadyAt: string | null;
  handedOverAt: string | null;
  handoverNotes: string | null;
  createdAt: string;
  updatedAt: string;
  requestedByUser?: UserSummaryDto;
  consultantUser?: UserSummaryDto;
}

export interface CreateSurgicalReviewRequest {
  clinicalIndication: string;
  consultantUserId?: string | null;
}

export interface RecordSurgicalDecisionRequest {
  caesareanDecision: CaesareanDecision;
  decisionRationale: string;
  consultantUserId?: string | null;
}

export interface UpdateSurgicalCoordinationRequest {
  anaesthesiaReviewStatus?: AnaesthesiaReviewStatus;
  anaesthesiaNotes?: string | null;
  theatreReadinessStatus?: TheatreReadinessStatus;
  handoverNotes?: string | null;
  targetStatus?: SurgicalReviewStatus;
}

// ============================================================================
// 5. EMERGENCY ACCESS OVERRIDE (BREAK-GLASS)
// ============================================================================

export interface EmergencyOverrideDto {
  id: string;
  admissionId: string;
  staffId: string;
  reason: string;
  overrideDurationMinutes: number | null;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedByUserId: string | null;
  createdAt: string;
  staff?: UserSummaryDto;
  isActive: boolean;
}

export interface CreateEmergencyOverrideRequest {
  reason: string;
  overrideDurationMinutes?: number | null;
}
