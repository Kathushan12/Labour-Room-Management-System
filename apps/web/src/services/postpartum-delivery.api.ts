import { api } from './api.js';
import {
  ApgarAssessmentDto,
  AuthorizeMaternalDischargeInput,
  AuthorizeNewbornDischargeInput,
  CreateDeliveryInput,
  CreatePostpartumMaternalAssessmentInput,
  CreatePostpartumNewbornAssessmentInput,
  DeliveryDto,
  FinalizeDeliveryInput,
  NewbornDto,
  PostpartumDischargeAuthorizationDto,
  PostpartumMaternalAssessmentDto,
  PostpartumNewbornAssessmentDto,
  RecordApgarInput,
  RegisterNewbornInput,
  UpdateDeliveryInput,
} from '@lrms/shared';

export const postpartumDeliveryApi = {
  // =========================================================================
  // 1. DELIVERY EVENT MANAGEMENT
  // =========================================================================

  getDeliveryByAdmission: async (admissionId: string): Promise<DeliveryDto | null> => {
    const res = await api.get<{ success: boolean; data: DeliveryDto | null }>(
      `/admissions/${admissionId}/delivery`,
    );
    return res.data.data;
  },

  getDeliveryById: async (id: string): Promise<DeliveryDto> => {
    const res = await api.get<{ success: boolean; data: DeliveryDto }>(`/deliveries/${id}`);
    return res.data.data;
  },

  createDelivery: async (
    admissionId: string,
    payload: CreateDeliveryInput,
  ): Promise<DeliveryDto> => {
    const res = await api.post<{ success: boolean; data: DeliveryDto }>(
      `/admissions/${admissionId}/delivery`,
      payload,
    );
    return res.data.data;
  },

  updateDelivery: async (id: string, payload: UpdateDeliveryInput): Promise<DeliveryDto> => {
    const res = await api.patch<{ success: boolean; data: DeliveryDto }>(
      `/deliveries/${id}`,
      payload,
    );
    return res.data.data;
  },

  finalizeDelivery: async (id: string, payload: FinalizeDeliveryInput): Promise<DeliveryDto> => {
    const res = await api.post<{ success: boolean; data: DeliveryDto }>(
      `/deliveries/${id}/finalize`,
      payload,
    );
    return res.data.data;
  },

  // =========================================================================
  // 2. NEWBORN & BIRTH REGISTRATION
  // =========================================================================

  getNewbornsByAdmission: async (admissionId: string): Promise<NewbornDto[]> => {
    const res = await api.get<{ success: boolean; data: NewbornDto[] }>(
      `/admissions/${admissionId}/newborns`,
    );
    return res.data.data;
  },

  getNewbornById: async (id: string): Promise<NewbornDto> => {
    const res = await api.get<{ success: boolean; data: NewbornDto }>(`/newborns/${id}`);
    return res.data.data;
  },

  registerNewborn: async (
    deliveryId: string,
    payload: RegisterNewbornInput,
  ): Promise<NewbornDto> => {
    const res = await api.post<{ success: boolean; data: NewbornDto }>(
      `/deliveries/${deliveryId}/newborns`,
      payload,
    );
    return res.data.data;
  },

  // =========================================================================
  // 3. APGAR ASSESSMENTS
  // =========================================================================

  getApgarHistory: async (newbornId: string): Promise<ApgarAssessmentDto[]> => {
    const res = await api.get<{ success: boolean; data: ApgarAssessmentDto[] }>(
      `/newborns/${newbornId}/apgar`,
    );
    return res.data.data;
  },

  recordApgar: async (
    newbornId: string,
    payload: RecordApgarInput,
  ): Promise<ApgarAssessmentDto> => {
    const res = await api.post<{ success: boolean; data: ApgarAssessmentDto }>(
      `/newborns/${newbornId}/apgar`,
      payload,
    );
    return res.data.data;
  },

  // =========================================================================
  // 4. POSTPARTUM MATERNAL CARE
  // =========================================================================

  getMaternalPostpartumAssessments: async (
    admissionId: string,
  ): Promise<PostpartumMaternalAssessmentDto[]> => {
    const res = await api.get<{ success: boolean; data: PostpartumMaternalAssessmentDto[] }>(
      `/admissions/${admissionId}/postpartum/maternal-assessments`,
    );
    return res.data.data;
  },

  createMaternalPostpartumAssessment: async (
    admissionId: string,
    payload: CreatePostpartumMaternalAssessmentInput,
  ): Promise<PostpartumMaternalAssessmentDto> => {
    const res = await api.post<{ success: boolean; data: PostpartumMaternalAssessmentDto }>(
      `/admissions/${admissionId}/postpartum/maternal-assessments`,
      payload,
    );
    return res.data.data;
  },

  // =========================================================================
  // 5. POSTPARTUM NEWBORN CARE
  // =========================================================================

  getNewbornPostpartumAssessments: async (
    newbornId: string,
  ): Promise<PostpartumNewbornAssessmentDto[]> => {
    const res = await api.get<{ success: boolean; data: PostpartumNewbornAssessmentDto[] }>(
      `/newborns/${newbornId}/postpartum/assessments`,
    );
    return res.data.data;
  },

  createNewbornPostpartumAssessment: async (
    newbornId: string,
    payload: CreatePostpartumNewbornAssessmentInput,
  ): Promise<PostpartumNewbornAssessmentDto> => {
    const res = await api.post<{ success: boolean; data: PostpartumNewbornAssessmentDto }>(
      `/newborns/${newbornId}/postpartum/assessments`,
      payload,
    );
    return res.data.data;
  },

  // =========================================================================
  // 6. CLINICIAN-AUTHORIZED DISCHARGES
  // =========================================================================

  getDischargeAuthorizations: async (
    admissionId: string,
  ): Promise<PostpartumDischargeAuthorizationDto[]> => {
    const res = await api.get<{ success: boolean; data: PostpartumDischargeAuthorizationDto[] }>(
      `/admissions/${admissionId}/postpartum/discharges`,
    );
    return res.data.data;
  },

  authorizeMaternalDischarge: async (
    admissionId: string,
    payload: AuthorizeMaternalDischargeInput,
  ): Promise<PostpartumDischargeAuthorizationDto> => {
    const res = await api.post<{ success: boolean; data: PostpartumDischargeAuthorizationDto }>(
      `/admissions/${admissionId}/postpartum/discharge`,
      payload,
    );
    return res.data.data;
  },

  authorizeNewbornDischarge: async (
    newbornId: string,
    payload: AuthorizeNewbornDischargeInput,
  ): Promise<PostpartumDischargeAuthorizationDto> => {
    const res = await api.post<{ success: boolean; data: PostpartumDischargeAuthorizationDto }>(
      `/newborns/${newbornId}/postpartum/discharge`,
      payload,
    );
    return res.data.data;
  },
};
