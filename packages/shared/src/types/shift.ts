import {
  ShiftType,
  ShiftStatus,
  ShiftStaffAssignmentStatus,
  StaffOnDutyStatus,
  UserRole,
} from '../enums/index.js';

export interface ShiftDto {
  id: string;
  wardId: string;
  shiftType: ShiftType;
  name: string;
  startsAt: string;
  endsAt: string;
  status: ShiftStatus;
  createdByUserId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftStaffAssignmentDto {
  id: string;
  shiftId: string;
  userId: string;
  roleInShift: string;
  status: ShiftStaffAssignmentStatus;
  assignedByUserId: string;
  assignedAt: string;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
}

export interface ShiftWithStaffDto extends ShiftDto {
  staffAssignments: ShiftStaffAssignmentDto[];
}

export interface CreateShiftRequest {
  wardId: string;
  shiftType: ShiftType;
  name: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
}

export interface UpdateShiftRequest {
  name?: string;
  status?: ShiftStatus;
  notes?: string;
}

export interface AssignStaffToShiftRequest {
  userId: string;
  roleInShift?: string;
}

export interface CancelShiftStaffAssignmentRequest {
  cancellationReason: string;
}

export interface OnDutyStaffSummaryDto {
  userId: string;
  fullName: string;
  username: string;
  role: UserRole;
  wardId: string;
  shiftId: string;
  shiftName: string;
  shiftType: ShiftType;
  shiftStartsAt: string;
  shiftEndsAt: string;
  dutyStatus: StaffOnDutyStatus;
  activePatientCount: number;
}
