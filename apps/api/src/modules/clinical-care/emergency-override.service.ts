import { DataSource } from 'typeorm';
import { EmergencyOverrideDto, CreateEmergencyOverrideRequest, UserRole } from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import { Admission, AuditLog, EmergencyOverride } from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { NotFoundError, ForbiddenError } from '../../common/errors/auth.errors.js';
import { toEmergencyOverrideDto } from './clinical-care.dto.js';

export class EmergencyOverrideService {
  constructor(private dataSource: DataSource = AppDataSource) {}

  async requestEmergencyOverride(
    admissionId: string,
    payload: CreateEmergencyOverrideRequest,
    actor: RequestUser,
    ipAddress: string | null = null,
  ): Promise<EmergencyOverrideDto> {
    // REQ-1.8: emergency access to an unassigned patient is a doctor-only action.
    if (actor.role !== UserRole.DOCTOR) {
      throw new ForbiddenError(
        'Emergency access to an unassigned patient is available to doctors only.',
        'ROLE_NOT_AUTHORIZED',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const admission = await manager.findOne(Admission, {
        where: { id: admissionId },
      });
      if (!admission) {
        throw new NotFoundError('Admission episode not found');
      }

      const durationMinutes = payload.overrideDurationMinutes ?? 60;
      const grantedAt = new Date();
      const expiresAt = new Date(grantedAt.getTime() + durationMinutes * 60 * 1000);

      // Check if there is already an active unrevoked override
      const existing = await manager
        .createQueryBuilder(EmergencyOverride, 'eo')
        .where('eo.admissionId = :admissionId', { admissionId })
        .andWhere('eo.staffId = :staffId', { staffId: actor.id })
        .andWhere('eo.revokedAt IS NULL')
        .andWhere('(eo.expiresAt IS NULL OR eo.expiresAt > :now)', { now: grantedAt })
        .getOne();

      if (existing) {
        // Extend or return existing
        return toEmergencyOverrideDto(existing);
      }

      const override = manager.create(EmergencyOverride, {
        admissionId,
        staffId: actor.id,
        reason: payload.reason,
        overrideDurationMinutes: durationMinutes,
        grantedAt,
        expiresAt,
      });

      const savedOverride = await manager.save(EmergencyOverride, override);

      // High-priority Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'EMERGENCY_OVERRIDE_GRANTED',
          entityName: 'EmergencyOverride',
          entityId: savedOverride.id,
          ipAddress,
          details: {
            admissionId,
            reason: payload.reason,
            durationMinutes,
            expiresAt: expiresAt.toISOString(),
          },
        }),
      );

      const loaded = await manager.findOneOrFail(EmergencyOverride, {
        where: { id: savedOverride.id },
        relations: ['staff'],
      });

      return toEmergencyOverrideDto(loaded);
    });
  }

  async getActiveOverride(
    admissionId: string,
    staffId: string,
  ): Promise<EmergencyOverrideDto | null> {
    const now = new Date();
    const override = await this.dataSource
      .getRepository(EmergencyOverride)
      .createQueryBuilder('eo')
      .leftJoinAndSelect('eo.staff', 'staff')
      .where('eo.admissionId = :admissionId', { admissionId })
      .andWhere('eo.staffId = :staffId', { staffId })
      .andWhere('eo.revokedAt IS NULL')
      .andWhere('(eo.expiresAt IS NULL OR eo.expiresAt > :now)', { now })
      .getOne();

    return override ? toEmergencyOverrideDto(override) : null;
  }

  async revokeEmergencyOverride(
    overrideId: string,
    actor: RequestUser,
    ipAddress: string | null = null,
  ): Promise<EmergencyOverrideDto> {
    return this.dataSource.transaction(async (manager) => {
      const override = await manager.findOne(EmergencyOverride, {
        where: { id: overrideId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!override) {
        throw new NotFoundError('Emergency override not found');
      }

      if (override.revokedAt) {
        return toEmergencyOverrideDto(override);
      }

      override.revokedAt = new Date();
      override.revokedByUserId = actor.id;

      await manager.save(EmergencyOverride, override);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'EMERGENCY_OVERRIDE_REVOKED',
          entityName: 'EmergencyOverride',
          entityId: override.id,
          ipAddress,
          details: {
            admissionId: override.admissionId,
            revokedByUserId: actor.id,
          },
        }),
      );

      const refreshed = await manager.findOneOrFail(EmergencyOverride, {
        where: { id: override.id },
        relations: ['staff'],
      });

      return toEmergencyOverrideDto(refreshed);
    });
  }

  async getOverridesForAdmission(admissionId: string): Promise<EmergencyOverrideDto[]> {
    const overrides = await this.dataSource.getRepository(EmergencyOverride).find({
      where: { admissionId },
      relations: ['staff'],
      order: {
        createdAt: 'DESC',
      },
    });

    return overrides.map(toEmergencyOverrideDto);
  }
}
