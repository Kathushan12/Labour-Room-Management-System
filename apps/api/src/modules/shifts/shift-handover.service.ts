import { AppDataSource } from '../../config/database.js';
import { ShiftHandover } from '../../database/entities/ShiftHandover.js';
import { Shift } from '../../database/entities/Shift.js';
import { User } from '../../database/entities/User.js';
import { AuditLog } from '../../database/entities/AuditLog.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/auth.errors.js';
import { HandoverStatus, UserRole } from '@lrms/shared';
import {
  ShiftHandoverDto,
  CreateShiftHandoverRequest,
  AcknowledgeShiftHandoverRequest,
} from '@lrms/shared';

export function serializeShiftHandover(entity: ShiftHandover): ShiftHandoverDto {
  return {
    id: entity.id,
    shiftId: entity.shiftId,
    outgoingUserId: entity.outgoingUserId,
    incomingUserId: entity.incomingUserId,
    handoverNotes: entity.handoverNotes,
    status: entity.status,
    acknowledgedAt: entity.acknowledgedAt ? entity.acknowledgedAt.toISOString() : null,
    acknowledgementNotes: entity.acknowledgementNotes ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    outgoingUser: entity.outgoingUser
      ? {
          id: entity.outgoingUser.id,
          username: entity.outgoingUser.username,
          fullName: entity.outgoingUser.fullName,
          role: (entity.outgoingUser.role?.name ?? entity.outgoingUser.roleId) as UserRole,
        }
      : undefined,
    incomingUser: entity.incomingUser
      ? {
          id: entity.incomingUser.id,
          username: entity.incomingUser.username,
          fullName: entity.incomingUser.fullName,
          role: (entity.incomingUser.role?.name ?? entity.incomingUser.roleId) as UserRole,
        }
      : undefined,
  };
}

export class ShiftHandoverService {
  public async listHandovers(shiftId: string): Promise<ShiftHandoverDto[]> {
    const handovers = await AppDataSource.getRepository(ShiftHandover)
      .createQueryBuilder('sh')
      .leftJoinAndSelect('sh.outgoingUser', 'outgoingUser')
      .leftJoinAndSelect('outgoingUser.role', 'outRole')
      .leftJoinAndSelect('sh.incomingUser', 'incomingUser')
      .leftJoinAndSelect('incomingUser.role', 'inRole')
      .where('sh.shiftId = :shiftId', { shiftId })
      .orderBy('sh.createdAt', 'DESC')
      .getMany();

    return handovers.map(serializeShiftHandover);
  }

  public async createHandover(
    shiftId: string,
    input: CreateShiftHandoverRequest,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<ShiftHandoverDto> {
    const shift = await AppDataSource.getRepository(Shift).findOne({
      where: { id: shiftId },
    });
    if (!shift) {
      throw new NotFoundError('Shift not found', 'SHIFT_NOT_FOUND');
    }

    const incomingUser = await AppDataSource.getRepository(User).findOne({
      where: { id: input.incomingUserId },
      relations: ['role'],
    });
    if (!incomingUser) {
      throw new NotFoundError('Incoming staff user not found', 'USER_NOT_FOUND');
    }
    if (!incomingUser.isActive) {
      throw new BadRequestError('Incoming staff user is inactive', 'INCOMING_STAFF_INACTIVE');
    }

    const handoverRepo = AppDataSource.getRepository(ShiftHandover);
    const handover = handoverRepo.create({
      shiftId: shift.id,
      outgoingUserId: actor.id,
      incomingUserId: incomingUser.id,
      handoverNotes: input.handoverNotes,
      status: HandoverStatus.PENDING,
    });
    await handoverRepo.save(handover);

    const auditRepo = AppDataSource.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        userId: actor.id,
        action: 'SHIFT_HANDOVER_CREATED',
        entityName: 'ShiftHandover',
        entityId: handover.id,
        ipAddress,
        details: {
          requestId,
          shiftId: shift.id,
          incomingUserId: incomingUser.id,
        },
      }),
    );

    const reloaded = await handoverRepo.findOneOrFail({
      where: { id: handover.id },
      relations: ['outgoingUser', 'outgoingUser.role', 'incomingUser', 'incomingUser.role'],
    });

    return serializeShiftHandover(reloaded);
  }

  public async acknowledgeHandover(
    shiftId: string,
    handoverId: string,
    input: AcknowledgeShiftHandoverRequest,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<ShiftHandoverDto> {
    const handoverRepo = AppDataSource.getRepository(ShiftHandover);
    const handover = await handoverRepo.findOne({
      where: { id: handoverId, shiftId },
      relations: ['outgoingUser', 'outgoingUser.role', 'incomingUser', 'incomingUser.role'],
    });

    if (!handover) {
      throw new NotFoundError('Handover record not found', 'HANDOVER_NOT_FOUND');
    }

    // Only the assigned incoming user (or admin) can acknowledge
    if (handover.incomingUserId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenError(
        'Only the nominated incoming staff member can acknowledge this handover',
        'NOT_HANDOVER_RECIPIENT',
      );
    }

    if (handover.status === HandoverStatus.ACKNOWLEDGED) {
      throw new BadRequestError('Handover is already acknowledged', 'ALREADY_ACKNOWLEDGED');
    }

    handover.status = HandoverStatus.ACKNOWLEDGED;
    handover.acknowledgedAt = new Date();
    if (input.acknowledgementNotes) {
      handover.acknowledgementNotes = input.acknowledgementNotes;
    }
    await handoverRepo.save(handover);

    const auditRepo = AppDataSource.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        userId: actor.id,
        action: 'SHIFT_HANDOVER_ACKNOWLEDGED',
        entityName: 'ShiftHandover',
        entityId: handover.id,
        ipAddress,
        details: {
          requestId,
          shiftId,
        },
      }),
    );

    return serializeShiftHandover(handover);
  }
}

export const shiftHandoverService = new ShiftHandoverService();
