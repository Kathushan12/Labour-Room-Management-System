import {
  ApiResponse,
  BedBoardSummaryDto,
  CreateWardRequest,
  UpdateWardRequest,
  WardDto,
} from '@lrms/shared';
import { apiFetch } from './api.js';

export async function fetchWards(): Promise<ApiResponse<{ items: WardDto[] }>> {
  return apiFetch<{ items: WardDto[] }>('/wards');
}

export async function fetchWardDetail(id: string): Promise<ApiResponse<WardDto>> {
  return apiFetch<WardDto>(`/wards/${id}`);
}

export async function fetchWardBedBoard(id: string): Promise<ApiResponse<BedBoardSummaryDto>> {
  return apiFetch<BedBoardSummaryDto>(`/wards/${id}/bed-board`);
}

export async function createWard(input: CreateWardRequest): Promise<ApiResponse<WardDto>> {
  return apiFetch<WardDto>('/wards', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateWard(
  id: string,
  input: UpdateWardRequest,
): Promise<ApiResponse<WardDto>> {
  return apiFetch<WardDto>(`/wards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
