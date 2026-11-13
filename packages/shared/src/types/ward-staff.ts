import { UserRole } from '../enums/index.js';

export interface StaffWardAssignmentDto {
  id: string;
  userId: string;
  wardId: string;
  assignedAt: string;
  endedAt: string | null;
  isActive: boolean;
  assignedByUserId: string;
  endedByUserId: string | null;
  notes: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
  assignedByUser?: {
    id: string;
    fullName: string;
  };
  endedByUser?: {
    id: string;
    fullName: string;
  } | null;
}

export interface AssignStaffToWardRequest {
  userId: string;
  wardId: string;
  notes?: string;
}

export interface EndStaffWardAssignmentRequest {
  notes?: string;
}

export interface WardStaffMemberDto {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  role: UserRole;
  wardId: string;
  assignedAt: string;
  isActive: boolean;
  notes: string | null;
}
