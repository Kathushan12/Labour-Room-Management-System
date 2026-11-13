import {
  BedCleaningRecordDto,
  BedCleaningStatus,
  BedDto,
  BedFunctioningStatus,
  BedOccupancyStatus,
  CreateBedRequest,
  Permission,
  UpdateBedMaintenanceRequest,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import { Bed } from '../../database/entities/Bed.js';
import { Ward } from '../../database/entities/Ward.js';
import { BedStatusHistory } from '../../database/entities/BedStatusHistory.js';
import { BedCleaningRecord } from '../../database/entities/BedCleaningRecord.js';
import { BedAllocationHistory } from '../../database/entities/BedAllocationHistory.js';
import { AuditLog } from '../../database/entities/AuditLog.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/auth.errors.js';
import { toBedCleaningRecordDto, toBedDto } from './bed.dto.js';
import {
  findActiveAllocationForBed,
  findBedById,
  findBedsByWard,
  findCleaningHistoryForBed,
  findLastCleaningRecordForBed,
} from './bed.repository.js';
import { IsNull } from 'typeorm';

export async function listBeds(wardId: string, actor: RequestUser): Promise<BedDto[]> {
  const beds = await findBedsByWard(wardId);
  const canViewPii = actor.permissions.includes(Permission.PATIENTS_VIEW_PII);

  const dtos: BedDto[] = [];
  for (const bed of beds) {
    const activeAllocation = await findActiveAllocationForBed(bed.id);
    const lastCleaning = await findLastCleaningRecordForBed(bed.id);
    dtos.push(toBedDto(bed, activeAllocation, lastCleaning, canViewPii));
  }
  return dtos;
}

export async function getBed(bedId: string, actor: RequestUser): Promise<BedDto> {
  const bed = await findBedById(bedId);
  if (!bed) {
    throw new NotFoundError(`Bed not found with ID ${bedId}`, 'BED_NOT_FOUND');
  }
  const canViewPii = actor.permissions.includes(Permission.PATIENTS_VIEW_PII);
  const activeAllocation = await findActiveAllocationForBed(bed.id);
  const lastCleaning = await findLastCleaningRecordForBed(bed.id);
  return toBedDto(bed, activeAllocation, lastCleaning, canViewPii);
}

export async function createBed(
  wardId: string,
  input: CreateBedRequest,
  actor: RequestUser,
  ipAddress: string | null,
  requestId: string | null,
): Promise<BedDto> {
  const savedBed = await AppDataSource.transaction(async (tm) => {
    const lockedWard = await tm.findOne(Ward, {
      where: { id: wardId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!lockedWard) {
      throw new NotFoundError(`Ward not found with ID ${wardId}`, 'WARD_NOT_FOUND');
    }

    // Check unique bed number within ward
    const existingBed = await tm.findOne(Bed, {
      where: { wardId, bedNumber: input.bedNumber.trim() },
    });
    if (existingBed) {
      throw new ConflictError(
        `Bed number '${input.bedNumber.trim()}' already exists in ward '${lockedWard.name}'`,
        'DUPLICATE_BED_NUMBER',
      );
    }

    // Check capacity limit
    const registeredCount = await tm.count(Bed, { where: { wardId } });
    if (registeredCount >= lockedWard.totalPhysicalBeds) {
      throw new BadRequestError(
        `Cannot add bed: ward capacity of ${lockedWard.totalPhysicalBeds} physical bed(s) has been reached. Increase ward capacity first.`,
        'WARD_CAPACITY_EXCEEDED',
      );
    }

    const bed = tm.create(Bed, {
      wardId,
      bedNumber: input.bedNumber.trim(),
      functioningStatus: BedFunctioningStatus.FUNCTIONING,
      occupancyStatus: BedOccupancyStatus.AVAILABLE,
      cleaningStatus: BedCleaningStatus.CLEAN,
    });
    await tm.save(bed);

    // Initial status history
    await tm.save(
      tm.create(BedStatusHistory, {
        bedId: bed.id,
        previousFunctioningStatus: null,
        newFunctioningStatus: bed.functioningStatus,
        previousOccupancyStatus: null,
        newOccupancyStatus: bed.occupancyStatus,
        changedByUserId: actor.id,
        reason: 'Initial bed registration',
      }),
    );

    // Audit log
    await tm.save(
      tm.create(AuditLog, {
        userId: actor.id,
        action: 'BED_REGISTERED',
        entityName: 'Bed',
        entityId: bed.id,
        ipAddress,
        details: {
          requestId,
          wardId,
          bedNumber: bed.bedNumber,
        },
      }),
    );

    bed.ward = lockedWard;
    return bed;
  });

  return toBedDto(savedBed, null, null, false);
}

export async function updateBedMaintenance(
  bedId: string,
  input: UpdateBedMaintenanceRequest,
  actor: RequestUser,
  ipAddress: string | null,
  requestId: string | null,
): Promise<BedDto> {
  const savedBed = await AppDataSource.transaction(async (tm) => {
    const lockedBed = await tm.findOne(Bed, {
      where: { id: bedId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!lockedBed) {
      throw new NotFoundError(`Bed not found with ID ${bedId}`, 'BED_NOT_FOUND');
    }

    const prevFunctioning = lockedBed.functioningStatus;

    if (input.functioningStatus === BedFunctioningStatus.OUT_OF_SERVICE) {
      // Check active allocation
      const activeAllocation = await tm.findOne(BedAllocationHistory, {
        where: { bedId, releasedAt: IsNull() },
      });
      if (activeAllocation) {
        throw new ConflictError(
          'Cannot mark bed out of service while actively occupied. Transfer or release the patient before performing maintenance.',
          'BED_OCCUPIED_CONFLICT',
        );
      }
      lockedBed.functioningStatus = BedFunctioningStatus.OUT_OF_SERVICE;
    } else {
      lockedBed.functioningStatus = BedFunctioningStatus.FUNCTIONING;
      // When returning to service, if not clean, ensure cleaning required is preserved
    }

    lockedBed.updatedAt = new Date();
    await tm.save(lockedBed);

    await tm.save(
      tm.create(BedStatusHistory, {
        bedId: lockedBed.id,
        previousFunctioningStatus: prevFunctioning,
        newFunctioningStatus: lockedBed.functioningStatus,
        previousOccupancyStatus: lockedBed.occupancyStatus,
        newOccupancyStatus: lockedBed.occupancyStatus,
        changedByUserId: actor.id,
        reason: input.reason || 'Maintenance status updated',
      }),
    );

    await tm.save(
      tm.create(AuditLog, {
        userId: actor.id,
        action:
          lockedBed.functioningStatus === BedFunctioningStatus.OUT_OF_SERVICE
            ? 'BED_MARKED_OUT_OF_SERVICE'
            : 'BED_RETURNED_TO_SERVICE',
        entityName: 'Bed',
        entityId: lockedBed.id,
        ipAddress,
        details: {
          requestId,
          bedNumber: lockedBed.bedNumber,
          previousFunctioningStatus: prevFunctioning,
          newFunctioningStatus: lockedBed.functioningStatus,
          reason: input.reason || null,
        },
      }),
    );

    return lockedBed;
  });

  const activeAllocation = await findActiveAllocationForBed(savedBed.id);
  const lastCleaning = await findLastCleaningRecordForBed(savedBed.id);
  const canViewPii = actor.permissions.includes(Permission.PATIENTS_VIEW_PII);
  return toBedDto(savedBed, activeAllocation, lastCleaning, canViewPii);
}

export async function startBedCleaning(
  bedId: string,
  notes: string | undefined,
  actor: RequestUser,
  ipAddress: string | null,
  requestId: string | null,
): Promise<BedDto> {
  const savedBed = await AppDataSource.transaction(async (tm) => {
    const lockedBed = await tm.findOne(Bed, {
      where: { id: bedId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!lockedBed) {
      throw new NotFoundError(`Bed not found with ID ${bedId}`, 'BED_NOT_FOUND');
    }

    // Check active allocation
    const activeAllocation = await tm.findOne(BedAllocationHistory, {
      where: { bedId, releasedAt: IsNull() },
    });
    if (activeAllocation) {
      throw new ConflictError(
        'Cannot start cleaning on an occupied bed. Transfer or release the patient first.',
        'BED_OCCUPIED_CONFLICT',
      );
    }

    if (lockedBed.functioningStatus === BedFunctioningStatus.OUT_OF_SERVICE) {
      throw new ConflictError(
        'Cannot initiate cleaning on a bed that is currently marked out of service.',
        'BED_OUT_OF_SERVICE',
      );
    }

    lockedBed.cleaningStatus = BedCleaningStatus.IN_PROGRESS;
    lockedBed.occupancyStatus = BedOccupancyStatus.CLEANING;
    lockedBed.updatedAt = new Date();
    await tm.save(lockedBed);

    const cleaningRecord = tm.create(BedCleaningRecord, {
      bedId,
      startedByUserId: actor.id,
      startedAt: new Date(),
      status: 'IN_PROGRESS',
      notes: notes || null,
    });
    await tm.save(cleaningRecord);

    await tm.save(
      tm.create(AuditLog, {
        userId: actor.id,
        action: 'BED_CLEANING_STARTED',
        entityName: 'Bed',
        entityId: lockedBed.id,
        ipAddress,
        details: {
          requestId,
          bedNumber: lockedBed.bedNumber,
          notes: notes || null,
        },
      }),
    );

    return lockedBed;
  });

  const lastCleaning = await findLastCleaningRecordForBed(savedBed.id);
  const canViewPii = actor.permissions.includes(Permission.PATIENTS_VIEW_PII);
  return toBedDto(savedBed, null, lastCleaning, canViewPii);
}

export async function completeBedCleaning(
  bedId: string,
  notes: string | undefined,
  actor: RequestUser,
  ipAddress: string | null,
  requestId: string | null,
): Promise<BedDto> {
  const savedBed = await AppDataSource.transaction(async (tm) => {
    const lockedBed = await tm.findOne(Bed, {
      where: { id: bedId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!lockedBed) {
      throw new NotFoundError(`Bed not found with ID ${bedId}`, 'BED_NOT_FOUND');
    }

    // Check active allocation
    const activeAllocation = await tm.findOne(BedAllocationHistory, {
      where: { bedId, releasedAt: IsNull() },
    });
    if (activeAllocation) {
      throw new ConflictError('Cannot mark an occupied bed as clean.', 'BED_OCCUPIED_CONFLICT');
    }

    const openRecord = await tm.findOne(BedCleaningRecord, {
      where: { bedId, status: 'IN_PROGRESS' },
      order: { startedAt: 'DESC' },
    });

    const now = new Date();
    if (openRecord) {
      openRecord.completedByUserId = actor.id;
      openRecord.completedAt = now;
      openRecord.status = 'COMPLETED';
      if (notes) {
        openRecord.notes = openRecord.notes ? `${openRecord.notes}; ${notes}` : notes;
      }
      openRecord.updatedAt = now;
      await tm.save(openRecord);
    } else {
      // Completed directly
      const directRecord = tm.create(BedCleaningRecord, {
        bedId,
        startedByUserId: actor.id,
        startedAt: now,
        completedByUserId: actor.id,
        completedAt: now,
        status: 'COMPLETED',
        notes: notes || 'Turnover cleaning completed',
      });
      await tm.save(directRecord);
    }

    lockedBed.cleaningStatus = BedCleaningStatus.CLEAN;
    lockedBed.occupancyStatus = BedOccupancyStatus.AVAILABLE;
    lockedBed.updatedAt = now;
    await tm.save(lockedBed);

    await tm.save(
      tm.create(AuditLog, {
        userId: actor.id,
        action: 'BED_CLEANING_COMPLETED',
        entityName: 'Bed',
        entityId: lockedBed.id,
        ipAddress,
        details: {
          requestId,
          bedNumber: lockedBed.bedNumber,
          notes: notes || null,
        },
      }),
    );

    return lockedBed;
  });

  const lastCleaning = await findLastCleaningRecordForBed(savedBed.id);
  const canViewPii = actor.permissions.includes(Permission.PATIENTS_VIEW_PII);
  return toBedDto(savedBed, null, lastCleaning, canViewPii);
}

export async function getBedCleaningHistory(bedId: string): Promise<BedCleaningRecordDto[]> {
  const records = await findCleaningHistoryForBed(bedId);
  return records.map(toBedCleaningRecordDto);
}
