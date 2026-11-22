import { api } from './api.js';
import {
  AcknowledgeEmergencyResponseRequest,
  AcknowledgeEscalationRequest,
  AmendCarePlanRequest,
  AssignEscalationRequest,
  ClinicalCarePlanDto,
  ClinicalCarePlanReviewDto,
  ClinicalEscalationDto,
  CreateCarePlanRequest,
  CreateEmergencyOverrideRequest,
  CreateEmergencyResponseRequest,
  CreateEscalationRequest,
  CreateSurgicalReviewRequest,
  EmergencyOverrideDto,
  EmergencyResponseDto,
  EscalationFeedItemDto,
  RecordCarePlanReviewRequest,
  RecordSurgicalDecisionRequest,
  ResolveEscalationRequest,
  ReverseEscalationRequest,
  SurgicalReviewDto,
  TransitionCarePlanRequest,
  TransitionEmergencyResponseRequest,
  TransitionEscalationRequest,
  UpdateSurgicalCoordinationRequest,
} from '@lrms/shared';

export const clinicalCareApi = {
  // =========================================================================
  // 1. CARE PLANS
  // =========================================================================

  createCarePlan: async (
    admissionId: string,
    payload: CreateCarePlanRequest,
  ): Promise<ClinicalCarePlanDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalCarePlanDto }>(
      `/admissions/${admissionId}/care-plans`,
      payload,
    );
    return res.data.data;
  },

  getCarePlans: async (admissionId: string): Promise<ClinicalCarePlanDto[]> => {
    const res = await api.get<{ success: boolean; data: ClinicalCarePlanDto[] }>(
      `/admissions/${admissionId}/care-plans`,
    );
    return res.data.data;
  },

  getActiveCarePlan: async (admissionId: string): Promise<ClinicalCarePlanDto | null> => {
    const res = await api.get<{ success: boolean; data: ClinicalCarePlanDto | null }>(
      `/admissions/${admissionId}/care-plans/active`,
    );
    return res.data.data;
  },

  getCarePlanById: async (
    admissionId: string,
    carePlanId: string,
  ): Promise<ClinicalCarePlanDto> => {
    const res = await api.get<{ success: boolean; data: ClinicalCarePlanDto }>(
      `/admissions/${admissionId}/care-plans/${carePlanId}`,
    );
    return res.data.data;
  },

  transitionCarePlan: async (
    admissionId: string,
    carePlanId: string,
    payload: TransitionCarePlanRequest,
  ): Promise<ClinicalCarePlanDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalCarePlanDto }>(
      `/admissions/${admissionId}/care-plans/${carePlanId}/transition`,
      payload,
    );
    return res.data.data;
  },

  amendCarePlan: async (
    admissionId: string,
    carePlanId: string,
    payload: AmendCarePlanRequest,
  ): Promise<ClinicalCarePlanDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalCarePlanDto }>(
      `/admissions/${admissionId}/care-plans/${carePlanId}/amend`,
      payload,
    );
    return res.data.data;
  },

  recordCarePlanReview: async (
    admissionId: string,
    carePlanId: string,
    payload: RecordCarePlanReviewRequest,
  ): Promise<ClinicalCarePlanReviewDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalCarePlanReviewDto }>(
      `/admissions/${admissionId}/care-plans/${carePlanId}/reviews`,
      payload,
    );
    return res.data.data;
  },

  getCarePlanReviews: async (
    admissionId: string,
    carePlanId: string,
  ): Promise<ClinicalCarePlanReviewDto[]> => {
    const res = await api.get<{ success: boolean; data: ClinicalCarePlanReviewDto[] }>(
      `/admissions/${admissionId}/care-plans/${carePlanId}/reviews`,
    );
    return res.data.data;
  },

  // =========================================================================
  // 2. CLINICAL ESCALATIONS
  // =========================================================================

  createEscalation: async (
    admissionId: string,
    payload: CreateEscalationRequest,
  ): Promise<ClinicalEscalationDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalEscalationDto }>(
      `/admissions/${admissionId}/escalations`,
      payload,
    );
    return res.data.data;
  },

  getVisibleEscalations: async (): Promise<EscalationFeedItemDto[]> => {
    const res = await api.get<{ success: boolean; data: EscalationFeedItemDto[] }>('/escalations');
    return res.data.data;
  },

  getEscalations: async (admissionId: string): Promise<ClinicalEscalationDto[]> => {
    const res = await api.get<{ success: boolean; data: ClinicalEscalationDto[] }>(
      `/admissions/${admissionId}/escalations`,
    );
    return res.data.data;
  },

  getEscalationById: async (
    admissionId: string,
    escalationId: string,
  ): Promise<ClinicalEscalationDto> => {
    const res = await api.get<{ success: boolean; data: ClinicalEscalationDto }>(
      `/admissions/${admissionId}/escalations/${escalationId}`,
    );
    return res.data.data;
  },

  acknowledgeEscalation: async (
    admissionId: string,
    escalationId: string,
    payload: AcknowledgeEscalationRequest = {},
  ): Promise<ClinicalEscalationDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalEscalationDto }>(
      `/admissions/${admissionId}/escalations/${escalationId}/acknowledge`,
      payload,
    );
    return res.data.data;
  },

  assignEscalation: async (
    admissionId: string,
    escalationId: string,
    payload: AssignEscalationRequest,
  ): Promise<ClinicalEscalationDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalEscalationDto }>(
      `/admissions/${admissionId}/escalations/${escalationId}/assign`,
      payload,
    );
    return res.data.data;
  },

  transitionEscalation: async (
    admissionId: string,
    escalationId: string,
    payload: TransitionEscalationRequest,
  ): Promise<ClinicalEscalationDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalEscalationDto }>(
      `/admissions/${admissionId}/escalations/${escalationId}/transition`,
      payload,
    );
    return res.data.data;
  },

  reverseEscalation: async (
    admissionId: string,
    escalationId: string,
    payload: ReverseEscalationRequest,
  ): Promise<ClinicalEscalationDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalEscalationDto }>(
      `/admissions/${admissionId}/escalations/${escalationId}/reverse`,
      payload,
    );
    return res.data.data;
  },

  resolveEscalation: async (
    admissionId: string,
    escalationId: string,
    payload: ResolveEscalationRequest,
  ): Promise<ClinicalEscalationDto> => {
    const res = await api.post<{ success: boolean; data: ClinicalEscalationDto }>(
      `/admissions/${admissionId}/escalations/${escalationId}/resolve`,
      payload,
    );
    return res.data.data;
  },

  // =========================================================================
  // 3. EMERGENCY RESPONSES
  // =========================================================================

  initiateEmergencyResponse: async (
    admissionId: string,
    payload: CreateEmergencyResponseRequest,
  ): Promise<EmergencyResponseDto> => {
    const res = await api.post<{ success: boolean; data: EmergencyResponseDto }>(
      `/admissions/${admissionId}/emergency-responses`,
      payload,
    );
    return res.data.data;
  },

  getEmergencyResponses: async (admissionId: string): Promise<EmergencyResponseDto[]> => {
    const res = await api.get<{ success: boolean; data: EmergencyResponseDto[] }>(
      `/admissions/${admissionId}/emergency-responses`,
    );
    return res.data.data;
  },

  acknowledgeEmergencyResponse: async (
    admissionId: string,
    responseId: string,
    payload: AcknowledgeEmergencyResponseRequest = {},
  ): Promise<EmergencyResponseDto> => {
    const res = await api.post<{ success: boolean; data: EmergencyResponseDto }>(
      `/admissions/${admissionId}/emergency-responses/${responseId}/acknowledge`,
      payload,
    );
    return res.data.data;
  },

  transitionEmergencyResponse: async (
    admissionId: string,
    responseId: string,
    payload: TransitionEmergencyResponseRequest,
  ): Promise<EmergencyResponseDto> => {
    const res = await api.post<{ success: boolean; data: EmergencyResponseDto }>(
      `/admissions/${admissionId}/emergency-responses/${responseId}/transition`,
      payload,
    );
    return res.data.data;
  },

  // =========================================================================
  // 4. SURGICAL REVIEWS
  // =========================================================================

  requestSurgicalReview: async (
    admissionId: string,
    payload: CreateSurgicalReviewRequest,
  ): Promise<SurgicalReviewDto> => {
    const res = await api.post<{ success: boolean; data: SurgicalReviewDto }>(
      `/admissions/${admissionId}/surgical-reviews`,
      payload,
    );
    return res.data.data;
  },

  getSurgicalReviews: async (admissionId: string): Promise<SurgicalReviewDto[]> => {
    const res = await api.get<{ success: boolean; data: SurgicalReviewDto[] }>(
      `/admissions/${admissionId}/surgical-reviews`,
    );
    return res.data.data;
  },

  recordSurgicalDecision: async (
    admissionId: string,
    reviewId: string,
    payload: RecordSurgicalDecisionRequest,
  ): Promise<SurgicalReviewDto> => {
    const res = await api.post<{ success: boolean; data: SurgicalReviewDto }>(
      `/admissions/${admissionId}/surgical-reviews/${reviewId}/decision`,
      payload,
    );
    return res.data.data;
  },

  updateSurgicalCoordination: async (
    admissionId: string,
    reviewId: string,
    payload: UpdateSurgicalCoordinationRequest,
  ): Promise<SurgicalReviewDto> => {
    const res = await api.post<{ success: boolean; data: SurgicalReviewDto }>(
      `/admissions/${admissionId}/surgical-reviews/${reviewId}/coordination`,
      payload,
    );
    return res.data.data;
  },

  // =========================================================================
  // 5. BREAK-GLASS EMERGENCY OVERRIDES
  // =========================================================================

  requestEmergencyOverride: async (
    admissionId: string,
    payload: CreateEmergencyOverrideRequest,
  ): Promise<EmergencyOverrideDto> => {
    const res = await api.post<{ success: boolean; data: EmergencyOverrideDto }>(
      `/admissions/${admissionId}/emergency-overrides`,
      payload,
    );
    return res.data.data;
  },

  getOverridesForAdmission: async (admissionId: string): Promise<EmergencyOverrideDto[]> => {
    const res = await api.get<{ success: boolean; data: EmergencyOverrideDto[] }>(
      `/admissions/${admissionId}/emergency-overrides`,
    );
    return res.data.data;
  },

  revokeEmergencyOverride: async (
    admissionId: string,
    overrideId: string,
  ): Promise<EmergencyOverrideDto> => {
    const res = await api.post<{ success: boolean; data: EmergencyOverrideDto }>(
      `/admissions/${admissionId}/emergency-overrides/${overrideId}/revoke`,
    );
    return res.data.data;
  },
};
