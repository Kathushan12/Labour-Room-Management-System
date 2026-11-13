import {
  AdmissionStatus,
  BedAllocationHistoryDto,
  BedCleaningStatus,
  BedFunctioningStatus,
  BedOccupancyStatus,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import { Bed } from '../../database/entities/Bed.js';
import { Admission } from '../../database/entities/Admission.js';
import { BedAllocationHistory } from '../../database/entities/BedAllocationHistory.js';
import { AuditLog } from '../../database/entities/AuditLog.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/auth.errors.js';
import { toBedAllocationHistoryDto } from './bed-allocation.dto.js';
import { IsNull } from 'typeorm';

export async function allocateBed(
  admissionId: string,
  bedId: string,
  actor: RequestUser,
  ipAddress: string | null,
  requestId: string | null,
  notes?: string,
): Promise<BedAllocationHistoryDto> {
  let createdAllocation: BedAllocationHistory;

  try {
    createdAllocation = await AppDataSource.transaction(async (tm) => {
      // 1. Lock Bed and Admission with pessimistic write locks
      const lockedBed = await tm.findOne(Bed, {
        where: { id: bedId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedBed) {
        throw new NotFoundError(`Bed not found with ID ${bedId}`, 'BED_NOT_FOUND');
      }

      const lockedAdmission = await tm.findOne(Admission, {
        where: { id: admissionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedAdmission) {
        throw new NotFoundError(
          `Admission not found with ID ${admissionId}`,
          'ADMISSION_NOT_FOUND',
        );
      }

      // 2. Validate Admission state
      if (lockedAdmission.status !== AdmissionStatus.ADMITTED) {
        throw new BadRequestError(
          `Cannot allocate bed to admission with status '${lockedAdmission.status}'. Only active ADMITTED patients can be assigned beds.`,
          'ADMISSION_NOT_ACTIVE',
        );
      }

      if (lockedAdmission.wardId !== lockedBed.wardId) {
        throw new BadRequestError(
          `Admission belongs to ward '${lockedAdmission.ward?.name || lockedAdmission.wardId}', but selected bed is in ward '${lockedBed.ward?.name || lockedBed.wardId}'. Beds can only be allocated within the patient's admitted ward.`,
          'WARD_MISMATCH',
        );
      }

      // 3. Check if admission already has an active bed allocation
      const existingAdmissionAlloc = await tm.findOne(BedAllocationHistory, {
        where: { admissionId, releasedAt: IsNull() },
        relations: ['bed'],
      });
      if (existingAdmissionAlloc) {
        throw new ConflictError(
          `Admission '${lockedAdmission.admissionReferenceId}' already has an active allocation to bed '${existingAdmissionAlloc.bed?.bedNumber}'. Use bed transfer to move the patient to a different bed.`,
          'ACTIVE_ALLOCATION_EXISTS',
        );
      }

      // 4. Validate Bed operational condition and cleaning state
      if (lockedBed.functioningStatus !== BedFunctioningStatus.FUNCTIONING) {
        throw new ConflictError(
          `Bed '${lockedBed.bedNumber}' is currently marked OUT_OF_SERVICE for maintenance and cannot be allocated.`,
          'BED_OUT_OF_SERVICE',
        );
      }

      if (lockedBed.cleaningStatus !== BedCleaningStatus.CLEAN) {
        throw new ConflictError(
          `Bed '${lockedBed.bedNumber}' currently has cleaning status '${lockedBed.cleaningStatus}'. Beds must be cleaned and certified CLEAN before allocating a patient.`,
          'BED_NOT_CLEAN',
        );
      }

      // 5. Check if bed already has an active allocation
      const existingBedAlloc = await tm.findOne(BedAllocationHistory, {
        where: { bedId, releasedAt: IsNull() },
      });
      if (existingBedAlloc) {
        throw new ConflictError(
          `Bed '${lockedBed.bedNumber}' is already allocated to another active patient.`,
          'BED_ALREADY_OCCUPIED',
        );
      }

      // 6. Create BedAllocationHistory record
      const now = new Date();
      const allocation = tm.create(BedAllocationHistory, {
        bedId,
        admissionId,
        assignedByUserId: actor.id,
        assignedAt: now,
        releaseReason: notes || null,
      });
      await tm.save(allocation);

      // 7. Update Bed occupancy status
      lockedBed.occupancyStatus = BedOccupancyStatus.OCCUPIED;
      lockedBed.updatedAt = now;
      await tm.save(lockedBed);

      // 8. Audit log
      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'BED_ALLOCATED',
          entityName: 'BedAllocationHistory',
          entityId: allocation.id,
          ipAddress,
          details: {
            requestId,
            bedId,
            bedNumber: lockedBed.bedNumber,
            admissionId,
            admissionReferenceId: lockedAdmission.admissionReferenceId,
            notes: notes || null,
          },
        }),
      );

      allocation.bed = lockedBed;
      allocation.admission = lockedAdmission;
      return allocation;
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string; message?: string };
    if (pgErr?.code === '23505') {
      if (
        pgErr?.constraint === 'idx_one_active_allocation_per_bed' ||
        pgErr?.message?.includes('idx_one_active_allocation_per_bed')
      ) {
        throw new ConflictError(
          'This bed was already allocated to another patient concurrently.',
          'BED_CONCURRENT_ALLOCATION_CONFLICT',
        );
      }
      if (
        pgErr?.constraint === 'idx_one_active_bed_per_admission' ||
        pgErr?.message?.includes('idx_one_active_bed_per_admission')
      ) {
        throw new ConflictError(
          'This admission was already allocated to another bed concurrently.',
          'ADMISSION_CONCURRENT_ALLOCATION_CONFLICT',
        );
      }
    }
    throw err;
  }

  return toBedAllocationHistoryDto(createdAllocation);
}

export async function transferBed(
  currentAllocationId: string,
  targetBedId: string,
  actor: RequestUser,
  ipAddress: string | null,
  requestId: string | null,
  reason?: string,
): Promise<BedAllocationHistoryDto> {
  let newAllocation: BedAllocationHistory;

  try {
    newAllocation = await AppDataSource.transaction(async (tm) => {
      // 1. Fetch current active allocation
      const currentAllocation = await tm.findOne(BedAllocationHistory, {
        where: { id: currentAllocationId, releasedAt: IsNull() },
        relations: ['bed', 'admission'],
      });

      if (!currentAllocation) {
        throw new NotFoundError(
          `Active bed allocation not found with ID ${currentAllocationId}`,
          'ALLOCATION_NOT_FOUND',
        );
      }

      if (currentAllocation.bedId === targetBedId) {
        throw new BadRequestError(
          'Destination bed is identical to the currently allocated bed.',
          'IDENTICAL_BED_TRANSFER',
        );
      }

      // 2. Deadlock-free locking: sort bed IDs lexicographically
      const sourceBedId = currentAllocation.bedId;
      const [firstId, secondId] = [sourceBedId, targetBedId].sort();

      const bedA = await tm.findOne(Bed, {
        where: { id: firstId },
        lock: { mode: 'pessimistic_write' },
      });
      const bedB = await tm.findOne(Bed, {
        where: { id: secondId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!bedA || !bedB) {
        throw new NotFoundError('One or both beds not found', 'BED_NOT_FOUND');
      }

      const sourceBed = sourceBedId === bedA.id ? bedA : bedB;
      const targetBed = targetBedId === bedA.id ? bedA : bedB;

      // Lock admission
      const admission = await tm.findOne(Admission, {
        where: { id: currentAllocation.admissionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!admission || admission.status !== AdmissionStatus.ADMITTED) {
        throw new BadRequestError(
          'Admission is no longer active for transfer',
          'ADMISSION_NOT_ACTIVE',
        );
      }

      // 3. Validate target bed
      if (targetBed.wardId !== sourceBed.wardId) {
        throw new BadRequestError(
          'Target bed belongs to a different ward. Bed transfers must be within the same ward.',
          'WARD_MISMATCH',
        );
      }

      if (targetBed.functioningStatus !== BedFunctioningStatus.FUNCTIONING) {
        throw new ConflictError(
          `Destination bed '${targetBed.bedNumber}' is OUT_OF_SERVICE and cannot accept transfers.`,
          'BED_OUT_OF_SERVICE',
        );
      }

      if (targetBed.cleaningStatus !== BedCleaningStatus.CLEAN) {
        throw new ConflictError(
          `Destination bed '${targetBed.bedNumber}' is not CLEAN (current status: '${targetBed.cleaningStatus}').`,
          'BED_NOT_CLEAN',
        );
      }

      const activeTargetAlloc = await tm.findOne(BedAllocationHistory, {
        where: { bedId: targetBedId, releasedAt: IsNull() },
      });
      if (activeTargetAlloc) {
        throw new ConflictError(
          `Destination bed '${targetBed.bedNumber}' is already occupied.`,
          'BED_ALREADY_OCCUPIED',
        );
      }

      const now = new Date();

      // 4. Close source allocation
      currentAllocation.releasedAt = now;
      currentAllocation.releasedByUserId = actor.id;
      currentAllocation.releaseReason = reason || 'BED_TRANSFER';
      await tm.save(currentAllocation);

      // 5. Update source bed: set occupancy AVAILABLE and cleaningStatus CLEANING_REQUIRED
      sourceBed.occupancyStatus = BedOccupancyStatus.AVAILABLE;
      sourceBed.cleaningStatus = BedCleaningStatus.CLEANING_REQUIRED;
      sourceBed.updatedAt = now;
      await tm.save(sourceBed);

      // 6. Create destination allocation
      const createdTargetAlloc = tm.create(BedAllocationHistory, {
        bedId: targetBedId,
        admissionId: admission.id,
        assignedByUserId: actor.id,
        assignedAt: now,
        releaseReason: null,
      });
      await tm.save(createdTargetAlloc);

      // 7. Update target bed: set occupancy OCCUPIED
      targetBed.occupancyStatus = BedOccupancyStatus.OCCUPIED;
      targetBed.updatedAt = now;
      await tm.save(targetBed);

      // 8. Audit logs for both release and allocation
      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'BED_TRANSFERRED',
          entityName: 'BedAllocationHistory',
          entityId: createdTargetAlloc.id,
          ipAddress,
          details: {
            requestId,
            admissionId: admission.id,
            admissionReferenceId: admission.admissionReferenceId,
            sourceBedId: sourceBed.id,
            sourceBedNumber: sourceBed.bedNumber,
            targetBedId: targetBed.id,
            targetBedNumber: targetBed.bedNumber,
            reason: reason || null,
          },
        }),
      );

      createdTargetAlloc.bed = targetBed;
      createdTargetAlloc.admission = admission;
      return createdTargetAlloc;
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string; message?: string };
    if (pgErr?.code === '23505') {
      if (
        pgErr?.constraint === 'idx_one_active_allocation_per_bed' ||
        pgErr?.message?.includes('idx_one_active_allocation_per_bed')
      ) {
        throw new ConflictError(
          'Target bed was allocated to another patient concurrently during transfer.',
          'BED_CONCURRENT_ALLOCATION_CONFLICT',
        );
      }
    }
    throw err;
  }

  return toBedAllocationHistoryDto(newAllocation);
}

export async function releaseBed(
  allocationId: string,
  actor: RequestUser,
  ipAddress: string | null,
  requestId: string | null,
  reason?: string,
): Promise<BedAllocationHistoryDto> {
  const released = await AppDataSource.transaction(async (tm) => {
    const allocation = await tm.findOne(BedAllocationHistory, {
      where: { id: allocationId, releasedAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });

    if (!allocation) {
      throw new NotFoundError(
        `Active bed allocation not found with ID ${allocationId}`,
        'ALLOCATION_NOT_FOUND',
      );
    }

    const lockedBed = await tm.findOne(Bed, {
      where: { id: allocation.bedId },
      lock: { mode: 'pessimistic_write' },
    });

    const now = new Date();
    allocation.releasedAt = now;
    allocation.releasedByUserId = actor.id;
    allocation.releaseReason = reason || 'BED_RELEASED';
    await tm.save(allocation);

    if (lockedBed) {
      lockedBed.occupancyStatus = BedOccupancyStatus.AVAILABLE;
      lockedBed.cleaningStatus = BedCleaningStatus.CLEANING_REQUIRED;
      lockedBed.updatedAt = now;
      await tm.save(lockedBed);
    }

    await tm.save(
      tm.create(AuditLog, {
        userId: actor.id,
        action: 'BED_RELEASED',
        entityName: 'BedAllocationHistory',
        entityId: allocation.id,
        ipAddress,
        details: {
          requestId,
          bedId: allocation.bedId,
          bedNumber: allocation.bed?.bedNumber,
          admissionId: allocation.admissionId,
          admissionReferenceId: allocation.admission?.admissionReferenceId,
          reason: reason || null,
        },
      }),
    );

    return allocation;
  });

  return toBedAllocationHistoryDto(released);
}

export async function getAdmissionBedHistory(
  admissionId: string,
): Promise<BedAllocationHistoryDto[]> {
  const allocations = await AppDataSource.getRepository(BedAllocationHistory).find({
    where: { admissionId },
    order: { assignedAt: 'DESC' },
    relations: ['bed', 'admission', 'assignedByUser', 'releasedByUser'],
  });

  return allocations.map(toBedAllocationHistoryDto);
}

export async function getActiveAllocationForAdmission(
  admissionId: string,
): Promise<BedAllocationHistoryDto | null> {
  const allocation = await AppDataSource.getRepository(BedAllocationHistory).findOne({
    where: { admissionId, releasedAt: IsNull() },
    relations: ['bed', 'admission', 'assignedByUser'],
  });

  return allocation ? toBedAllocationHistoryDto(allocation) : null;
}
