import {
  ApiResponse,
  CreateUserRequest,
  CreateUserResponse,
  PaginatedUsersResponse,
  ReissueCredentialResponse,
  UpdateUserProfileRequest,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
  UserDetailDto,
  UserListItemDto,
  UserRole,
} from '@lrms/shared';
import { apiFetch } from './api.js';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | 'ALL';
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  sortBy?: 'username' | 'fullName' | 'role' | 'isActive' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

export async function fetchUsers(
  params: ListUsersParams = {},
): Promise<ApiResponse<PaginatedUsersResponse>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search && params.search.trim().length > 0) qs.set('search', params.search.trim());
  if (params.role && params.role !== 'ALL') qs.set('role', params.role);
  if (params.status && params.status !== 'ALL') qs.set('status', params.status);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);

  const query = qs.toString();
  return apiFetch<PaginatedUsersResponse>(`/users${query ? `?${query}` : ''}`);
}

export async function fetchUserDetail(userId: string): Promise<ApiResponse<UserDetailDto>> {
  return apiFetch<UserDetailDto>(`/users/${userId}`);
}

export async function createStaffUser(
  payload: CreateUserRequest,
): Promise<ApiResponse<CreateUserResponse>> {
  return apiFetch<CreateUserResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStaffProfile(
  userId: string,
  payload: UpdateUserProfileRequest,
): Promise<ApiResponse<UserListItemDto>> {
  return apiFetch<UserListItemDto>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateStaffStatus(
  userId: string,
  payload: UpdateUserStatusRequest,
): Promise<ApiResponse<UserListItemDto>> {
  return apiFetch<UserListItemDto>(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateStaffRole(
  userId: string,
  payload: UpdateUserRoleRequest,
): Promise<ApiResponse<UserListItemDto>> {
  return apiFetch<UserListItemDto>(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function reissueStaffCredential(
  userId: string,
): Promise<ApiResponse<ReissueCredentialResponse>> {
  return apiFetch<ReissueCredentialResponse>(`/users/${userId}/reissue-credential`, {
    method: 'POST',
  });
}
