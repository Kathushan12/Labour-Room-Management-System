import {
  ApiResponse,
  BedAllocationHistoryDto,
  BedCleaningRecordDto,
  BedDto,
  CreateBedRequest,
  UpdateBedMaintenanceRequest,
} from '@lrms/shared';
import { apiFetch } from './api.js';

export async function fetchBedsByWard(wardId: string): Promise<ApiResponse<{ items: BedDto[] }>> {
  return apiFetch<{ items: BedDto[] }>(`/beds/ward/${wardId}`);
}

export async function fetchBedDetail(id: string): Promise<ApiResponse<BedDto>> {
  return apiFetch<BedDto>(`/beds/${id}`);
}

export async function createBed(
  wardId: string,
  input: CreateBedRequest,
): Promise<ApiResponse<BedDto>> {
  return apiFetch<BedDto>(`/beds/ward/${wardId}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateBedMaintenance(
  id: string,
  input: UpdateBedMaintenanceRequest,
): Promise<ApiResponse<BedDto>> {
  return apiFetch<BedDto>(`/beds/${id}/maintenance`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function startBedCleaning(id: string, notes?: string): Promise<ApiResponse<BedDto>> {
  return apiFetch<BedDto>(`/beds/${id}/cleaning/start`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function completeBedCleaning(
  id: string,
  notes?: string,
): Promise<ApiResponse<BedDto>> {
  return apiFetch<BedDto>(`/beds/${id}/cleaning/complete`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function fetchBedCleaningHistory(
  id: string,
): Promise<ApiResponse<{ items: BedCleaningRecordDto[] }>> {
  return apiFetch<{ items: BedCleaningRecordDto[] }>(`/beds/${id}/cleaning-history`);
}

export async function allocateBed(
  admissionId: string,
  bedId: string,
  notes?: string,
): Promise<ApiResponse<BedAllocationHistoryDto>> {
  return apiFetch<BedAllocationHistoryDto>(`/admissions/${admissionId}/bed-allocation`, {
    method: 'POST',
    body: JSON.stringify({ bedId, notes }),
  });
}

export async function transferBed(
  currentAllocationId: string,
  targetBedId: string,
  reason?: string,
): Promise<ApiResponse<BedAllocationHistoryDto>> {
  return apiFetch<BedAllocationHistoryDto>(`/bed-allocations/${currentAllocationId}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ targetBedId, reason }),
  });
}

export async function releaseBed(
  allocationId: string,
  reason?: string,
): Promise<ApiResponse<BedAllocationHistoryDto>> {
  return apiFetch<BedAllocationHistoryDto>(`/bed-allocations/${allocationId}/release`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function fetchAdmissionBedHistory(
  admissionId: string,
): Promise<ApiResponse<{ items: BedAllocationHistoryDto[] }>> {
  return apiFetch<{ items: BedAllocationHistoryDto[] }>(`/admissions/${admissionId}/bed-history`);
}
