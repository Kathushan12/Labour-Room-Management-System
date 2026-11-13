import { UserRole, Permission, ProfessionalRegistrationBody } from '../enums/index.js';

export interface StaffProfileDto {
  id: string;
  staffId: string | null;
  professionalRegistrationBody: ProfessionalRegistrationBody | null;
  professionalRegistrationNumber: string | null;
  contactNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email: string | null;
  staffRegistrationId: string | null;
  staffId?: string | null;
  mustChangePassword?: boolean;
  passwordChangedAt?: string | null;
  staffProfile?: StaffProfileDto | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  csrfToken: string;
  expiresIn: number;
}

export interface RefreshResponse {
  user: AuthUser;
  accessToken: string;
  csrfToken: string;
  expiresIn: number;
}

export interface CurrentUserResponse {
  user: AuthUser;
  permissions: Permission[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
