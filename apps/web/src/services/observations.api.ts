import { api } from './api.js';
import {
  AdmissionObservationsSummaryDto,
  ClinicalObservationAmendmentDto,
  ClinicalObservationType,
  ContractionObservationDto,
  CreateContractionObservationRequest,
  CreateFetalObservationRequest,
  CreateLabourAssessmentRequest,
  CreateMaternalObservationRequest,
  FetalObservationDto,
  LabourAssessmentDto,
  MaternalObservationDto,
  PartographDto,
} from '@lrms/shared';

export const observationsApi = {
  // Maternal Observations
  listMaternalObservations: async (
    admissionId: string,
    options?: { includeSuperseded?: boolean },
  ): Promise<MaternalObservationDto[]> => {
    const res = await api.get<{ success: boolean; data: MaternalObservationDto[] }>(
      `/admissions/${admissionId}/observations/maternal`,
      { params: options },
    );
    return res.data.data;
  },

  recordMaternalObservation: async (
    admissionId: string,
    payload: CreateMaternalObservationRequest,
  ): Promise<MaternalObservationDto> => {
    const res = await api.post<{ success: boolean; data: MaternalObservationDto }>(
      `/admissions/${admissionId}/observations/maternal`,
      payload,
    );
    return res.data.data;
  },

  // Fetal Observations
  listFetalObservations: async (
    admissionId: string,
    options?: { includeSuperseded?: boolean },
  ): Promise<FetalObservationDto[]> => {
    const res = await api.get<{ success: boolean; data: FetalObservationDto[] }>(
      `/admissions/${admissionId}/observations/fetal`,
      { params: options },
    );
    return res.data.data;
  },

  recordFetalObservation: async (
    admissionId: string,
    payload: CreateFetalObservationRequest,
  ): Promise<FetalObservationDto> => {
    const res = await api.post<{ success: boolean; data: FetalObservationDto }>(
      `/admissions/${admissionId}/observations/fetal`,
      payload,
    );
    return res.data.data;
  },

  // Labour Assessments
  listLabourAssessments: async (
    admissionId: string,
    options?: { includeSuperseded?: boolean },
  ): Promise<LabourAssessmentDto[]> => {
    const res = await api.get<{ success: boolean; data: LabourAssessmentDto[] }>(
      `/admissions/${admissionId}/labour-assessments`,
      { params: options },
    );
    return res.data.data;
  },

  recordLabourAssessment: async (
    admissionId: string,
    payload: CreateLabourAssessmentRequest,
  ): Promise<LabourAssessmentDto> => {
    const res = await api.post<{ success: boolean; data: LabourAssessmentDto }>(
      `/admissions/${admissionId}/labour-assessments`,
      payload,
    );
    return res.data.data;
  },

  // Contraction Observations
  listContractionObservations: async (
    admissionId: string,
    options?: { includeSuperseded?: boolean },
  ): Promise<ContractionObservationDto[]> => {
    const res = await api.get<{ success: boolean; data: ContractionObservationDto[] }>(
      `/admissions/${admissionId}/contractions`,
      { params: options },
    );
    return res.data.data;
  },

  recordContractionObservation: async (
    admissionId: string,
    payload: CreateContractionObservationRequest,
  ): Promise<ContractionObservationDto> => {
    const res = await api.post<{ success: boolean; data: ContractionObservationDto }>(
      `/admissions/${admissionId}/contractions`,
      payload,
    );
    return res.data.data;
  },

  // Composite Summary & History
  getObservationsSummary: async (admissionId: string): Promise<AdmissionObservationsSummaryDto> => {
    const res = await api.get<{ success: boolean; data: AdmissionObservationsSummaryDto }>(
      `/admissions/${admissionId}/observations`,
    );
    return res.data.data;
  },

  // Partograph
  getPartograph: async (admissionId: string): Promise<PartographDto> => {
    const res = await api.get<{ success: boolean; data: PartographDto }>(
      `/admissions/${admissionId}/partograph`,
    );
    return res.data.data;
  },

  // Amendments
  amendObservation: async (
    admissionId: string,
    observationId: string,
    observationType: ClinicalObservationType,
    amendmentReasonOrPayload:
      | string
      | { amendmentReason: string; amendedValues?: Record<string, unknown>; [key: string]: any },
    maybeAmendedValues?: Record<string, unknown>,
  ): Promise<{
    amendment: ClinicalObservationAmendmentDto;
    amendedObservation:
      | MaternalObservationDto
      | FetalObservationDto
      | LabourAssessmentDto
      | ContractionObservationDto;
  }> => {
    const payload =
      typeof amendmentReasonOrPayload === 'string'
        ? {
            observationType,
            amendmentReason: amendmentReasonOrPayload,
            amendedValues: maybeAmendedValues || {},
          }
        : {
            observationType,
            amendmentReason: amendmentReasonOrPayload.amendmentReason,
            amendedValues:
              amendmentReasonOrPayload.amendedValues ||
              Object.fromEntries(
                Object.entries(amendmentReasonOrPayload).filter(
                  ([k]) => k !== 'amendmentReason' && k !== 'observationType',
                ),
              ),
          };

    const res = await api.post<{
      success: boolean;
      data: {
        amendment: ClinicalObservationAmendmentDto;
        amendedObservation:
          | MaternalObservationDto
          | FetalObservationDto
          | LabourAssessmentDto
          | ContractionObservationDto;
      };
    }>(`/admissions/${admissionId}/observations/${observationId}/amend`, payload);
    return res.data.data;
  },

  listObservationAmendments: async (
    admissionId: string,
    observationId?: string,
  ): Promise<ClinicalObservationAmendmentDto[]> => {
    const res = await api.get<{ success: boolean; data: ClinicalObservationAmendmentDto[] }>(
      `/admissions/${admissionId}/observations/${observationId || 'all'}/amendments`,
    );
    return res.data.data;
  },
};
