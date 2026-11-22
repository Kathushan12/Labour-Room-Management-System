import { AppDataSource } from '../../config/database.js';
import { StaffWardAssignment } from '../../database/entities/StaffWardAssignment.js';
import { Ward } from '../../database/entities/Ward.js';
import { User } from '../../database/entities/User.js';
import { AuditLog } from '../../database/entities/AuditLog.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/auth.errors.js';
import { UserRole } from '@lrms/shared';
import { AssignStaffToWardInput, EndStaffWardAssignmentInput } from './ward-staff.schemas.js';
import { serializeStaffWardAssignment } from './ward-staff.dto.js';
import { StaffWardAssignmentDto } from '@lrms/shared';

export class WardStaffService {
  public async listWardStaff(
    wardId: string,
    activeOnly = false,
  ): Promise<StaffWardAssignmentDto[]> {
    const qb = AppDataSource.getRepository(StaffWardAssignment)
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('assignment.assignedByUser', 'assignedByUser')
      .leftJoinAndSelect('assignment.endedByUser', 'endedByUser')
      .where('assignment.wardId = :wardId', { wardId })
      .orderBy('assignment.createdAt', 'DESC');

    if (activeOnly) {
      // REQ-4.3: pickers list only active accounts.
      qb.andWhere('assignment.isActive = true AND assignment.endedAt IS NULL AND user.isActive = true');
    }

    const assignments = await qb.getMany();
    return assignments.map(serializeStaffWardAssignment);
  }

  public async assignStaffToWard(
    wardId: string,
    input: AssignStaffToWardInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<StaffWardAssignmentDto> {
    const ward = await AppDataSource.getRepository(Ward).findOne({
      where: { id: wardId },
    });
    if (!ward) {
      throw new NotFoundError('Ward not found', 'WARD_NOT_FOUND');
    }
    if (!ward.isActive) {
      throw new BadRequestError('Cannot assign staff to an inactive ward', 'WARD_INACTIVE');
    }

    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: input.userId },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }
    if (!user.isActive) {
      throw new BadRequestError(
        'Cannot assign a deactivated staff member to a ward',
        'USER_INACTIVE',
      );
    }

    const roleName = user.role?.name;
    if (roleName !== UserRole.DOCTOR && roleName !== UserRole.NURSE_STAFF) {
      throw new BadRequestError(
        'Only clinicians (Doctor or Nurse) can be assigned to ward clinical rosters',
        'INVALID_ROLE_FOR_WARD',
      );
    }

    return await AppDataSource.transaction(async (tm) => {
      // Check existing active assignment to this ward
      const existing = await tm.findOne(StaffWardAssignment, {
        where: {
          userId: user.id,
          wardId: ward.id,
          isActive: true,
        },
      });

      if (existing && !existing.endedAt) {
        throw new ConflictError(
          'Staff member is already actively assigned to this ward',
          'STAFF_ALREADY_ASSIGNED_TO_WARD',
        );
      }

      // If user has an active assignment to another ward, end it gracefully
      const activeOtherWard = await tm.find(StaffWardAssignment, {
        where: {
          userId: user.id,
          isActive: true,
        },
      });

      const now = new Date();
      for (const prior of activeOtherWard) {
        prior.isActive = false;
        prior.endedAt = now;
        prior.endedByUserId = actor.id;
        prior.notes = `Transferred to ward ${ward.name}`;
        await tm.save(prior);
      }

      const newAssignment = tm.create(StaffWardAssignment, {
        userId: user.id,
        wardId: ward.id,
        assignedAt: now,
        isActive: true,
        assignedByUserId: actor.id,
        notes: input.notes ?? null,
      });
      await tm.save(newAssignment);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'WARD_STAFF_ASSIGNED',
          entityName: 'StaffWardAssignment',
          entityId: newAssignment.id,
          ipAddress,
          details: {
            requestId,
            targetUserId: user.id,
            wardId: ward.id,
            wardCode: ward.code,
          },
        }),
      );

      const reloaded = await tm.findOneOrFail(StaffWardAssignment, {
        where: { id: newAssignment.id },
        relations: ['user', 'user.role', 'assignedByUser'],
      });

      return serializeStaffWardAssignment(reloaded);
    });
  }

  public async endStaffWardAssignment(
    wardId: string,
    assignmentId: string,
    input: EndStaffWardAssignmentInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<StaffWardAssignmentDto> {
    return await AppDataSource.transaction(async (tm) => {
      const assignment = await tm.findOne(StaffWardAssignment, {
        where: { id: assignmentId, wardId },
        relations: ['user', 'user.role', 'assignedByUser', 'endedByUser'],
      });

      if (!assignment) {
        throw new NotFoundError('Ward staff assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      if (!assignment.isActive || assignment.endedAt) {
        throw new BadRequestError(
          'Staff ward assignment is already ended',
          'ASSIGNMENT_ALREADY_ENDED',
        );
      }

      const now = new Date();
      assignment.isActive = false;
      assignment.endedAt = now;
      assignment.endedByUserId = actor.id;
      if (input.notes) {
        assignment.notes = assignment.notes ? `${assignment.notes} | ${input.notes}` : input.notes;
      }

      await tm.save(assignment);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'WARD_STAFF_REMOVED',
          entityName: 'StaffWardAssignment',
          entityId: assignment.id,
          ipAddress,
          details: {
            requestId,
            targetUserId: assignment.userId,
            wardId,
          },
        }),
      );

      return serializeStaffWardAssignment(assignment);
    });
  }
}

export const wardStaffService = new WardStaffService();
