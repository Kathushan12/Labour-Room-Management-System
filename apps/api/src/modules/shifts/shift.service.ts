import { AppDataSource } from '../../config/database.js';
import { Shift } from '../../database/entities/Shift.js';
import { ShiftStaffAssignment } from '../../database/entities/ShiftStaffAssignment.js';
import { StaffWardAssignment } from '../../database/entities/StaffWardAssignment.js';
import { PatientStaffAssignment } from '../../database/entities/PatientStaffAssignment.js';
import { Ward } from '../../database/entities/Ward.js';
import { User } from '../../database/entities/User.js';
import { AuditLog } from '../../database/entities/AuditLog.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/auth.errors.js';
import { ShiftStatus, ShiftStaffAssignmentStatus, StaffOnDutyStatus, UserRole } from '@lrms/shared';
import {
  CreateShiftInput,
  UpdateShiftInput,
  AssignStaffToShiftInput,
  CancelShiftStaffAssignmentInput,
} from './shift.schemas.js';
import {
  serializeShift,
  serializeShiftWithStaff,
  serializeShiftStaffAssignment,
} from './shift.dto.js';
import {
  ShiftDto,
  ShiftWithStaffDto,
  ShiftStaffAssignmentDto,
  OnDutyStaffSummaryDto,
} from '@lrms/shared';

export class ShiftService {
  public async listShifts(
    wardId: string,
    fromDate?: string,
    toDate?: string,
    status?: ShiftStatus,
  ): Promise<ShiftWithStaffDto[]> {
    const qb = AppDataSource.getRepository(Shift)
      .createQueryBuilder('shift')
      .leftJoinAndSelect(
        'shift.staffAssignments',
        'assignment',
        'assignment.status != :cancelledStatus',
        { cancelledStatus: ShiftStaffAssignmentStatus.CANCELLED },
      )
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .where('shift.wardId = :wardId', { wardId })
      .orderBy('shift.startsAt', 'ASC');

    if (fromDate) {
      qb.andWhere('shift.startsAt >= :fromDate', { fromDate: new Date(fromDate) });
    }
    if (toDate) {
      qb.andWhere('shift.endsAt <= :toDate', { toDate: new Date(toDate) });
    }
    if (status) {
      qb.andWhere('shift.status = :status', { status });
    }

    const shifts = await qb.getMany();
    return shifts.map(serializeShiftWithStaff);
  }

  public async getShiftById(wardId: string, shiftId: string): Promise<ShiftWithStaffDto> {
    const shift = await AppDataSource.getRepository(Shift)
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.staffAssignments', 'assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .where('shift.id = :shiftId AND shift.wardId = :wardId', { shiftId, wardId })
      .getOne();

    if (!shift) {
      throw new NotFoundError('Shift not found in this ward', 'SHIFT_NOT_FOUND');
    }

    return serializeShiftWithStaff(shift);
  }

  public async createShift(
    wardId: string,
    input: CreateShiftInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<ShiftDto> {
    const ward = await AppDataSource.getRepository(Ward).findOne({
      where: { id: wardId },
    });
    if (!ward) {
      throw new NotFoundError('Ward not found', 'WARD_NOT_FOUND');
    }
    if (!ward.isActive) {
      throw new BadRequestError('Cannot schedule shifts in an inactive ward', 'WARD_INACTIVE');
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestError(
        'Shift endsAt must be strictly later than startsAt',
        'INVALID_SHIFT_WINDOW',
      );
    }

    const shiftRepo = AppDataSource.getRepository(Shift);
    const shift = shiftRepo.create({
      wardId: ward.id,
      shiftType: input.shiftType,
      name: input.name,
      startsAt,
      endsAt,
      status: ShiftStatus.SCHEDULED,
      createdByUserId: actor.id,
      notes: input.notes ?? null,
    });
    await shiftRepo.save(shift);

    const auditRepo = AppDataSource.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        userId: actor.id,
        action: 'SHIFT_CREATED',
        entityName: 'Shift',
        entityId: shift.id,
        ipAddress,
        details: {
          requestId,
          wardId: ward.id,
          shiftType: input.shiftType,
          startsAt: shift.startsAt.toISOString(),
          endsAt: shift.endsAt.toISOString(),
        },
      }),
    );

    return serializeShift(shift);
  }

  public async updateShift(
    wardId: string,
    shiftId: string,
    input: UpdateShiftInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<ShiftDto> {
    const shift = await AppDataSource.getRepository(Shift).findOne({
      where: { id: shiftId, wardId },
    });
    if (!shift) {
      throw new NotFoundError('Shift not found', 'SHIFT_NOT_FOUND');
    }

    if (input.name) {
      shift.name = input.name;
    }
    if (input.notes !== undefined) {
      shift.notes = input.notes;
    }
    if (input.status) {
      // Validate status state machine transitions
      if (shift.status === ShiftStatus.COMPLETED && input.status !== ShiftStatus.COMPLETED) {
        throw new BadRequestError(
          'Cannot modify status of a completed shift',
          'SHIFT_ALREADY_COMPLETED',
        );
      }
      if (shift.status === ShiftStatus.CANCELLED && input.status !== ShiftStatus.CANCELLED) {
        throw new BadRequestError(
          'Cannot modify status of a cancelled shift',
          'SHIFT_ALREADY_CANCELLED',
        );
      }
      shift.status = input.status;
    }

    await AppDataSource.getRepository(Shift).save(shift);

    const auditRepo = AppDataSource.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        userId: actor.id,
        action: 'SHIFT_UPDATED',
        entityName: 'Shift',
        entityId: shift.id,
        ipAddress,
        details: {
          requestId,
          wardId,
          newStatus: shift.status,
        },
      }),
    );

    return serializeShift(shift);
  }

  public async assignStaffToShift(
    wardId: string,
    shiftId: string,
    input: AssignStaffToShiftInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<ShiftStaffAssignmentDto> {
    return await AppDataSource.transaction(async (tm) => {
      // 1. Lock and verify shift
      const shift = await tm.findOne(Shift, {
        where: { id: shiftId, wardId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!shift) {
        throw new NotFoundError('Shift not found in this ward', 'SHIFT_NOT_FOUND');
      }
      if (shift.status === ShiftStatus.CANCELLED || shift.status === ShiftStatus.COMPLETED) {
        throw new BadRequestError(
          `Cannot assign staff to a shift with status ${shift.status}`,
          'SHIFT_NOT_SCHEDULABLE',
        );
      }

      // 2. Verify target user
      const user = await tm.findOne(User, {
        where: { id: input.userId },
        relations: ['role'],
      });
      if (!user) {
        throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      }
      if (!user.isActive) {
        throw new BadRequestError('Cannot schedule a deactivated staff member', 'USER_INACTIVE');
      }

      // 3. Verify active ward assignment
      const wardAssignment = await tm.findOne(StaffWardAssignment, {
        where: {
          userId: user.id,
          wardId,
          isActive: true,
        },
      });
      if (!wardAssignment || wardAssignment.endedAt) {
        throw new BadRequestError(
          'Staff member does not have an active assignment to this ward',
          'STAFF_NOT_ASSIGNED_TO_WARD',
        );
      }

      // 4. Verify user not already assigned to THIS shift
      const existingInSameShift = await tm.findOne(ShiftStaffAssignment, {
        where: {
          shiftId: shift.id,
          userId: user.id,
        },
      });
      if (
        existingInSameShift &&
        existingInSameShift.status !== ShiftStaffAssignmentStatus.CANCELLED
      ) {
        throw new ConflictError(
          'Staff member is already assigned to this shift',
          'STAFF_ALREADY_ASSIGNED_TO_SHIFT',
        );
      }

      // 5. Concurrency & Overlap Prevention:
      // Check if user has ANY other active shift assignment overlapping this shift's time window
      const overlapping = await tm
        .createQueryBuilder(ShiftStaffAssignment, 'ssa')
        .innerJoin('ssa.shift', 's')
        .where('ssa.userId = :userId', { userId: user.id })
        .andWhere('ssa.status != :cancelledStatus', {
          cancelledStatus: ShiftStaffAssignmentStatus.CANCELLED,
        })
        .andWhere('s.status != :cancelledShiftStatus', {
          cancelledShiftStatus: ShiftStatus.CANCELLED,
        })
        .andWhere('s.id != :shiftId', { shiftId: shift.id })
        .andWhere('(s.startsAt < :shiftEndsAt AND s.endsAt > :shiftStartsAt)', {
          shiftStartsAt: shift.startsAt,
          shiftEndsAt: shift.endsAt,
        })
        .getOne();

      if (overlapping) {
        throw new ConflictError(
          'Staff member already has an active overlapping shift assignment during this time interval',
          'OVERLAPPING_SHIFT_CONFLICT',
        );
      }

      const assignment = tm.create(ShiftStaffAssignment, {
        shiftId: shift.id,
        userId: user.id,
        roleInShift: input.roleInShift ?? user.role?.name ?? 'STAFF',
        status: ShiftStaffAssignmentStatus.ASSIGNED,
        assignedByUserId: actor.id,
        assignedAt: new Date(),
      });
      await tm.save(assignment);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'SHIFT_STAFF_ASSIGNED',
          entityName: 'ShiftStaffAssignment',
          entityId: assignment.id,
          ipAddress,
          details: {
            requestId,
            shiftId: shift.id,
            targetUserId: user.id,
            roleInShift: assignment.roleInShift,
          },
        }),
      );

      const reloaded = await tm.findOneOrFail(ShiftStaffAssignment, {
        where: { id: assignment.id },
        relations: ['user', 'user.role'],
      });

      return serializeShiftStaffAssignment(reloaded);
    });
  }

  public async cancelShiftStaffAssignment(
    wardId: string,
    shiftId: string,
    assignmentId: string,
    input: CancelShiftStaffAssignmentInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<ShiftStaffAssignmentDto> {
    return await AppDataSource.transaction(async (tm) => {
      const assignment = await tm.findOne(ShiftStaffAssignment, {
        where: { id: assignmentId, shiftId },
        relations: ['shift', 'user', 'user.role'],
      });
      if (!assignment || assignment.shift.wardId !== wardId) {
        throw new NotFoundError(
          'Shift staff assignment not found in this shift',
          'ASSIGNMENT_NOT_FOUND',
        );
      }

      if (assignment.status === ShiftStaffAssignmentStatus.CANCELLED) {
        throw new BadRequestError(
          'Assignment is already cancelled',
          'ASSIGNMENT_ALREADY_CANCELLED',
        );
      }

      assignment.status = ShiftStaffAssignmentStatus.CANCELLED;
      assignment.cancelledAt = new Date();
      assignment.cancelledByUserId = actor.id;
      assignment.cancellationReason = input.cancellationReason;

      await tm.save(assignment);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'SHIFT_STAFF_CANCELLED',
          entityName: 'ShiftStaffAssignment',
          entityId: assignment.id,
          ipAddress,
          details: {
            requestId,
            shiftId,
            targetUserId: assignment.userId,
            reason: input.cancellationReason,
          },
        }),
      );

      return serializeShiftStaffAssignment(assignment);
    });
  }

  public async getOnDutyStaff(
    wardId: string,
    now: Date = new Date(),
  ): Promise<OnDutyStaffSummaryDto[]> {
    // 1. Get all active staff in ward
    const wardStaff = await AppDataSource.getRepository(StaffWardAssignment)
      .createQueryBuilder('swa')
      .innerJoinAndSelect('swa.user', 'user')
      .innerJoinAndSelect('user.role', 'role')
      .where('swa.wardId = :wardId', { wardId })
      .andWhere('swa.isActive = true AND swa.endedAt IS NULL')
      .andWhere('user.isActive = true')
      .getMany();

    const results: OnDutyStaffSummaryDto[] = [];

    for (const ws of wardStaff) {
      const user = ws.user;

      // Find shift assignments for this user in this ward
      const shiftAssignments = await AppDataSource.getRepository(ShiftStaffAssignment)
        .createQueryBuilder('ssa')
        .innerJoinAndSelect('ssa.shift', 's')
        .where('ssa.userId = :userId', { userId: user.id })
        .andWhere('s.wardId = :wardId', { wardId })
        .andWhere('ssa.status != :cancelledStatus', {
          cancelledStatus: ShiftStaffAssignmentStatus.CANCELLED,
        })
        .andWhere('s.status != :cancelledShiftStatus', {
          cancelledShiftStatus: ShiftStatus.CANCELLED,
        })
        .orderBy('s.startsAt', 'ASC')
        .getMany();

      // Find current active shift or upcoming shift
      let currentShiftAssignment = shiftAssignments.find(
        (sa) =>
          now >= sa.shift.startsAt &&
          now <= sa.shift.endsAt &&
          (sa.shift.status === ShiftStatus.IN_PROGRESS ||
            sa.shift.status === ShiftStatus.SCHEDULED),
      );

      let dutyStatus = StaffOnDutyStatus.OFF_DUTY;

      if (currentShiftAssignment) {
        dutyStatus = StaffOnDutyStatus.ON_DUTY;
      } else {
        const upcoming = shiftAssignments.find(
          (sa) => sa.shift.startsAt > now && sa.shift.status === ShiftStatus.SCHEDULED,
        );
        if (upcoming) {
          dutyStatus = StaffOnDutyStatus.SCHEDULED;
          currentShiftAssignment = upcoming;
        }
      }

      // Count active patient assignments
      const patientCount = await AppDataSource.getRepository(PatientStaffAssignment)
        .createQueryBuilder('psa')
        .where('psa.staffId = :staffId AND psa.unassignedAt IS NULL', { staffId: user.id })
        .getCount();

      if (currentShiftAssignment) {
        results.push({
          userId: user.id,
          fullName: user.fullName,
          username: user.username,
          role: user.role?.name as UserRole,
          wardId,
          shiftId: currentShiftAssignment.shift.id,
          shiftName: currentShiftAssignment.shift.name,
          shiftType: currentShiftAssignment.shift.shiftType,
          shiftStartsAt: currentShiftAssignment.shift.startsAt.toISOString(),
          shiftEndsAt: currentShiftAssignment.shift.endsAt.toISOString(),
          dutyStatus,
          activePatientCount: patientCount,
        });
      }
    }

    return results;
  }
}

export const shiftService = new ShiftService();
