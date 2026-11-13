import { UserRole } from '@lrms/shared';
import { Shift } from '../../database/entities/Shift.js';
import { ShiftStaffAssignment } from '../../database/entities/ShiftStaffAssignment.js';
import { ShiftDto, ShiftStaffAssignmentDto, ShiftWithStaffDto } from '@lrms/shared';

export function serializeShift(entity: Shift): ShiftDto {
  return {
    id: entity.id,
    wardId: entity.wardId,
    shiftType: entity.shiftType,
    name: entity.name,
    startsAt: entity.startsAt.toISOString(),
    endsAt: entity.endsAt.toISOString(),
    status: entity.status,
    createdByUserId: entity.createdByUserId,
    notes: entity.notes ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export function serializeShiftStaffAssignment(
  entity: ShiftStaffAssignment,
): ShiftStaffAssignmentDto {
  return {
    id: entity.id,
    shiftId: entity.shiftId,
    userId: entity.userId,
    roleInShift: entity.roleInShift,
    status: entity.status,
    assignedByUserId: entity.assignedByUserId,
    assignedAt: entity.assignedAt.toISOString(),
    cancelledAt: entity.cancelledAt ? entity.cancelledAt.toISOString() : null,
    cancelledByUserId: entity.cancelledByUserId ?? null,
    cancellationReason: entity.cancellationReason ?? null,
    createdAt: entity.createdAt.toISOString(),
    user: entity.user
      ? {
          id: entity.user.id,
          username: entity.user.username,
          fullName: entity.user.fullName,
          role: (entity.user.role?.name ?? entity.user.roleId) as UserRole,
        }
      : undefined,
  };
}

export function serializeShiftWithStaff(entity: Shift): ShiftWithStaffDto {
  const base = serializeShift(entity);
  return {
    ...base,
    staffAssignments: (entity.staffAssignments ?? []).map(serializeShiftStaffAssignment),
  };
}
