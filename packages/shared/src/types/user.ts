import { UserRole, StaffAssignmentRole, ProfessionalRegistrationBody } from '../enums/index.js';
import { StaffProfileDto } from './auth.js';

export interface UserListItemDto {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
  temporaryPasswordExpiresAt: string | null;
  staffProfile: StaffProfileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAssignmentHistoryItemDto {
  id: string;
  admissionId: string;
  admissionReferenceId: string | null;
  assignmentRole: StaffAssignmentRole;
  assignedAt: string;
  unassignedAt: string | null;
}

export interface UserAuditEntryDto {
  id: string;
  actorUserId: string | null;
  actorUsername: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface UserDetailDto extends UserListItemDto {
  assignmentHistory: StaffAssignmentHistoryItemDto[];
  auditHistory: UserAuditEntryDto[];
}

export interface CreateUserRequest {
  username: string;
  fullName: string;
  role: UserRole;
  email?: string | null;
  staffId?: string | null;
  professionalRegistrationBody?: ProfessionalRegistrationBody | null;
  professionalRegistrationNumber?: string | null;
  contactNumber?: string | null;
}

export interface CreateUserResponse {
  user: UserListItemDto;
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
}

export interface UpdateUserProfileRequest {
  fullName?: string;
  email?: string | null;
  staffId?: string | null;
  professionalRegistrationBody?: ProfessionalRegistrationBody | null;
  professionalRegistrationNumber?: string | null;
  contactNumber?: string | null;
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
  reason?: string | null;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
  reason?: string | null;
}

export interface ReissueCredentialResponse {
  user: UserListItemDto;
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
}

export interface PaginatedUsersResponse {
  items: UserListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
