import {
  AdmissionCategory,
  AdmissionDto,
  AdmissionStatus,
  ApiResponse,
  CreateTriageRequest,
  CreateTriageResponse,
  PaginatedAdmissionsResponse,
  RiskFlagDefinitionDto,
  RiskFlagKey,
  UpdateAdmissionRiskFlagsRequest,
} from '@lrms/shared';
import { apiFetch } from './api.js';

export interface ListAdmissionsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: AdmissionCategory | 'ALL';
  status?: AdmissionStatus | 'ALL';
  riskFlagKey?: RiskFlagKey | 'ALL';
  fromDate?: string;
  toDate?: string;
  sortBy?: 'admittedAt' | 'admissionReferenceId' | 'admissionCategory' | 'status' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export async function fetchRiskFlagDefinitions(): Promise<
  ApiResponse<{ items: RiskFlagDefinitionDto[] }>
> {
  return apiFetch<{ items: RiskFlagDefinitionDto[] }>('/admissions/risk-flags');
}

export async function fetchAdmissions(
  params: ListAdmissionsParams = {},
): Promise<ApiResponse<PaginatedAdmissionsResponse>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search && params.search.trim()) qs.set('search', params.search.trim());
  if (params.category && params.category !== 'ALL') qs.set('category', params.category);
  if (params.status && params.status !== 'ALL') qs.set('status', params.status);
  if (params.riskFlagKey && params.riskFlagKey !== 'ALL') qs.set('riskFlagKey', params.riskFlagKey);
  if (params.fromDate && params.fromDate.trim()) qs.set('fromDate', params.fromDate.trim());
  if (params.toDate && params.toDate.trim()) qs.set('toDate', params.toDate.trim());
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);

  const queryStr = qs.toString();
  return apiFetch<PaginatedAdmissionsResponse>(`/admissions${queryStr ? `?${queryStr}` : ''}`);
}

export async function fetchAdmissionDetail(
  admissionId: string,
): Promise<ApiResponse<AdmissionDto>> {
  return apiFetch<AdmissionDto>(`/admissions/${admissionId}`);
}

export async function submitRapidTriage(
  payload: CreateTriageRequest,
): Promise<ApiResponse<CreateTriageResponse>> {
  return apiFetch<CreateTriageResponse>('/admissions/triage', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdmissionRiskFlags(
  admissionId: string,
  payload: UpdateAdmissionRiskFlagsRequest,
): Promise<ApiResponse<AdmissionDto>> {
  return apiFetch<AdmissionDto>(`/admissions/${admissionId}/risk-flags`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
