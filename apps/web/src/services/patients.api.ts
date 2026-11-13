import {
  ApiResponse,
  PatientAdmissionHistoryDto,
  PatientDto,
  PatientLookupResponse,
  PatientPiiDto,
  PatientSummaryDto,
  UpdatePatientPiiRequest,
} from '@lrms/shared';
import { apiFetch } from './api.js';

export async function fetchPatientMasterRecord(
  patientId: string,
): Promise<ApiResponse<PatientDto>> {
  return apiFetch<PatientDto>(`/patients/${patientId}`);
}

export async function fetchPatientAdmissions(
  patientId: string,
): Promise<ApiResponse<PatientAdmissionHistoryDto>> {
  return apiFetch<PatientAdmissionHistoryDto>(`/patients/${patientId}/admissions`);
}

export async function revealPatientPii(patientId: string): Promise<ApiResponse<PatientPiiDto>> {
  return apiFetch<PatientPiiDto>(`/patients/${patientId}/pii`);
}

export async function updatePatientPii(
  patientId: string,
  payload: UpdatePatientPiiRequest,
): Promise<ApiResponse<PatientSummaryDto>> {
  return apiFetch<PatientSummaryDto>(`/patients/${patientId}/pii`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function lookupPatientByNic(nic: string): Promise<ApiResponse<PatientLookupResponse>> {
  return apiFetch<PatientLookupResponse>('/patients/lookup', {
    method: 'POST',
    body: JSON.stringify({ nic }),
  });
}
