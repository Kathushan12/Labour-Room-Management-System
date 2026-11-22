import { ApiResponse, PaginatedAuditLogsResponse } from '@lrms/shared';
import { apiFetch } from './api.js';

export async function fetchAuditLogs(
  page = 1,
  limit = 100,
): Promise<ApiResponse<PaginatedAuditLogsResponse>> {
  return apiFetch<PaginatedAuditLogsResponse>(`/audit-logs?page=${page}&limit=${limit}`);
}
