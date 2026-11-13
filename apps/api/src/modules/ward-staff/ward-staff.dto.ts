import { UserRole } from '@lrms/shared';
import { StaffWardAssignment } from '../../database/entities/StaffWardAssignment.js';
import { StaffWardAssignmentDto } from '@lrms/shared';

export function serializeStaffWardAssignment(entity: StaffWardAssignment): StaffWardAssignmentDto {
  return {
    id: entity.id,
    userId: entity.userId,
    wardId: entity.wardId,
    assignedAt: entity.assignedAt.toISOString(),
    endedAt: entity.endedAt ? entity.endedAt.toISOString() : null,
    isActive: entity.isActive,
    assignedByUserId: entity.assignedByUserId,
    endedByUserId: entity.endedByUserId ?? null,
    notes: entity.notes ?? null,
    createdAt: entity.createdAt.toISOString(),
    user: entity.user
      ? {
          id: entity.user.id,
          username: entity.user.username,
          fullName: entity.user.fullName,
          role: (entity.user.role?.name ?? entity.user.roleId) as UserRole,
        }
      : undefined,
    assignedByUser: entity.assignedByUser
      ? {
          id: entity.assignedByUser.id,
          fullName: entity.assignedByUser.fullName,
        }
      : undefined,
    endedByUser: entity.endedByUser
      ? {
          id: entity.endedByUser.id,
          fullName: entity.endedByUser.fullName,
        }
      : null,
  };
}
