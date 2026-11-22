import {
  BedBoardSummaryDto,
  BedCleaningStatus,
  BedDisplayStatus,
  BedDto,
  BedFunctioningStatus,
  BedOccupancyStatus,
  CreateWardRequest,
  UpdateWardRequest,
  WardDto,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import { Ward } from '../../database/entities/Ward.js';
import { Bed } from '../../database/entities/Bed.js';
import { BedAllocationHistory } from '../../database/entities/BedAllocationHistory.js';
import { BedCleaningRecord } from '../../database/entities/BedCleaningRecord.js';
import { AuditLog } from '../../database/entities/AuditLog.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { IsNull } from 'typeorm';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/auth.errors.js';
import { toWardDto } from './ward.dto.js';
import {
  countActiveAllocationsByWard,
  countRegisteredBedsByWard,
  findAllWards,
  findWardByCode,
  findWardById,
} from './ward.repository.js';
import { escalationAlertService } from '../clinical-care/escalation-alert.service.js';

export async function listWards(): Promise<WardDto[]> {
  const wards = await findAllWards();
  const dtos: WardDto[] = [];
  for (const ward of wards) {
    const registeredBedsCount = await countRegisteredBedsByWard(ward.id);
    dtos.push(toWardDto(ward, registeredBedsCount));
  }
  return dtos;
}

export async function getWardById(id: string): Promise<WardDto> {
  const ward = await findWardById(id);
  if (!ward) {
    throw new NotFoundError(`Ward not found with ID ${id}`, 'WARD_NOT_FOUND');
  }
  const registeredBedsCount = await countRegisteredBedsByWard(ward.id);
  return toWardDto(ward, registeredBedsCount);
}

export async function createWard(
  input: CreateWardRequest,
  actor: RequestUser,
  ipAddress: string | null,
  requestId: string | null,
): Promise<WardDto> {
  const existingCode = await findWardByCode(input.code);
  if (existingCode) {
    throw new ConflictError(
      `A ward with code '${input.code}' already exists`,
      'DUPLICATE_WARD_CODE',
    );
  }

  const ward = await AppDataSource.transaction(async (tm) => {
    const newWard = tm.create(Ward, {
      name: input.name,
      code: input.code,
      totalPhysicalBeds: input.totalPhysicalBeds,
      isActive: true,
    });
    await tm.save(newWard);

    await tm.save(
      tm.create(AuditLog, {
        userId: actor.id,
        action: 'WARD_CREATED',
        entityName: 'Ward',
        entityId: newWard.id,
        ipAddress,
        details: {
          requestId,
          code: newWard.code,
          name: newWard.name,
          totalPhysicalBeds: newWard.totalPhysicalBeds,
        },
      }),
    );

    return newWard;
  });

  return toWardDto(ward, 0);
}

export async function updateWard(
  id: string,
  input: UpdateWardRequest,
  actor: RequestUser,
  ipAddress: string | null,
  requestId: string | null,
): Promise<WardDto> {
  const savedWard = await AppDataSource.transaction(async (tm) => {
    const lockedWard = await tm.findOne(Ward, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!lockedWard) {
      throw new NotFoundError(`Ward not found with ID ${id}`, 'WARD_NOT_FOUND');
    }

    const registeredCount = await tm.count(Bed, { where: { wardId: id } });

    // Validate capacity change against registered beds
    if (input.totalPhysicalBeds !== undefined) {
      if (input.totalPhysicalBeds < registeredCount) {
        throw new BadRequestError(
          `Cannot reduce ward capacity to ${input.totalPhysicalBeds} beds because ${registeredCount} physical beds are currently registered. Remove or reassign beds before reducing capacity.`,
          'CAPACITY_BELOW_REGISTERED_BEDS',
        );
      }
      lockedWard.totalPhysicalBeds = input.totalPhysicalBeds;
    }

    // Validate ward deactivation against active allocations
    if (input.isActive === false) {
      const activeAllocations = await countActiveAllocationsByWard(id, tm);
      if (activeAllocations > 0) {
        throw new ConflictError(
          `Cannot deactivate ward while ${activeAllocations} active bed allocation(s) exist. Transfer or release all patients first.`,
          'ACTIVE_ALLOCATIONS_EXIST',
        );
      }
      lockedWard.isActive = false;
    } else if (input.isActive === true) {
      lockedWard.isActive = true;
    }

    if (input.name !== undefined) {
      lockedWard.name = input.name;
    }

    const previousAlertTimeoutSeconds = lockedWard.alertTimeoutSeconds;
    if (input.alertTimeoutSeconds !== undefined) {
      lockedWard.alertTimeoutSeconds = input.alertTimeoutSeconds;
    }

    lockedWard.updatedAt = new Date();
    await tm.save(lockedWard);

    await tm.save(
      tm.create(AuditLog, {
        userId: actor.id,
        action: 'WARD_UPDATED',
        entityName: 'Ward',
        entityId: lockedWard.id,
        ipAddress,
        details: {
          requestId,
          updatedFields: Object.keys(input),
          totalPhysicalBeds: lockedWard.totalPhysicalBeds,
          isActive: lockedWard.isActive,
          ...(input.alertTimeoutSeconds !== undefined && {
            alertTimeoutSeconds: lockedWard.alertTimeoutSeconds,
            previousAlertTimeoutSeconds,
          }),
        },
      }),
    );

    return lockedWard;
  });

  const registeredBedsCount = await countRegisteredBedsByWard(savedWard.id);
  return toWardDto(savedWard, registeredBedsCount);
}

export async function getWardBedBoard(
  wardId: string,
  _actor: RequestUser,
): Promise<BedBoardSummaryDto> {
  const ward = await findWardById(wardId);
  if (!ward) {
    throw new NotFoundError(`Ward not found with ID ${wardId}`, 'WARD_NOT_FOUND');
  }

  // Load all beds in the ward ordered by bedNumber
  const beds = await AppDataSource.getRepository(Bed).find({
    where: { wardId },
    order: { bedNumber: 'ASC' },
  });

  const bedDtos: BedDto[] = [];
  let functioningCount = 0;
  let availableCount = 0;
  let occupiedCount = 0;
  let cleaningCount = 0;
  let outOfServiceCount = 0;

  for (const bed of beds) {
    // 1. Check for active bed allocation
    const activeAllocation = await AppDataSource.getRepository(BedAllocationHistory).findOne({
      where: {
        bedId: bed.id,
        releasedAt: IsNull(),
      },
      relations: [
        'admission',
        'admission.riskFlags',
        'admission.riskFlags.definition',
        'assignedByUser',
      ],
    });

    // 2. Check for last cleaning record
    const lastCleaning = await AppDataSource.getRepository(BedCleaningRecord).findOne({
      where: { bedId: bed.id },
      order: { startedAt: 'DESC' },
      relations: ['startedByUser', 'completedByUser'],
    });

    // 3. Compute separated Display Status
    // Priority: OUT_OF_SERVICE > OCCUPIED > CLEANING > AVAILABLE
    let displayStatus: BedDisplayStatus;
    if (bed.functioningStatus === BedFunctioningStatus.OUT_OF_SERVICE) {
      displayStatus = BedDisplayStatus.OUT_OF_SERVICE;
      outOfServiceCount++;
    } else {
      functioningCount++;
      if (activeAllocation) {
        displayStatus = BedDisplayStatus.OCCUPIED;
        occupiedCount++;
      } else if (
        bed.cleaningStatus === BedCleaningStatus.CLEANING_REQUIRED ||
        bed.cleaningStatus === BedCleaningStatus.IN_PROGRESS
      ) {
        displayStatus = BedDisplayStatus.CLEANING;
        cleaningCount++;
      } else {
        displayStatus = BedDisplayStatus.AVAILABLE;
        availableCount++;
      }
    }

    // Determine patient display name
    let activeAllocationDto = null;
    if (activeAllocation) {

      const activeFlags = (activeAllocation.admission?.riskFlags || [])
        .filter((f) => f.isActive && f.definition)
        .map((f) => f.definition.label);

      activeAllocationDto = {
        id: activeAllocation.id,
        admissionId: activeAllocation.admissionId,
        admissionReferenceId: activeAllocation.admission.admissionReferenceId,
        patientId: activeAllocation.admission.patientId,
        patientDisplayName: activeAllocation.admission.admissionReferenceId,
        admissionCategory: activeAllocation.admission.admissionCategory,
        currentCarePlan: activeAllocation.admission.currentCarePlan,
        admittedAt: activeAllocation.admission.admittedAt.toISOString(),
        allocatedAt: activeAllocation.assignedAt.toISOString(),
        assignedByUserId: activeAllocation.assignedByUserId,
        assignedByUserName:
          activeAllocation.assignedByUser?.fullName ||
          activeAllocation.assignedByUser?.username ||
          'Staff',
        riskFlags: activeFlags,
      };
    }

    const lastCleaningDto = lastCleaning
      ? {
          id: lastCleaning.id,
          bedId: lastCleaning.bedId,
          startedByUserId: lastCleaning.startedByUserId,
          startedByUserName:
            lastCleaning.startedByUser?.fullName || lastCleaning.startedByUser?.username || 'Staff',
          startedAt: lastCleaning.startedAt.toISOString(),
          completedByUserId: lastCleaning.completedByUserId,
          completedByUserName:
            lastCleaning.completedByUser?.fullName ||
            lastCleaning.completedByUser?.username ||
            null,
          completedAt: lastCleaning.completedAt ? lastCleaning.completedAt.toISOString() : null,
          status: lastCleaning.status,
          notes: lastCleaning.notes,
          createdAt: lastCleaning.createdAt.toISOString(),
          updatedAt: lastCleaning.updatedAt.toISOString(),
        }
      : null;

    bedDtos.push({
      id: bed.id,
      wardId: bed.wardId,
      wardCode: ward.code,
      wardName: ward.name,
      bedNumber: bed.bedNumber,
      functioningStatus: bed.functioningStatus,
      occupancyStatus: activeAllocation ? BedOccupancyStatus.OCCUPIED : bed.occupancyStatus,
      cleaningStatus: bed.cleaningStatus,
      displayStatus,
      currentAllocation: activeAllocationDto,
      lastCleaning: lastCleaningDto,
      activeAlert: null,
      createdAt: bed.createdAt.toISOString(),
      updatedAt: bed.updatedAt.toISOString(),
    });
  }

  const occupiedAdmissionIds = bedDtos
    .map((b) => b.currentAllocation?.admissionId)
    .filter((id): id is string => !!id);
  const alertsByAdmission =
    await escalationAlertService.getActiveAlertsByAdmission(occupiedAdmissionIds);
  for (const dto of bedDtos) {
    const admissionId = dto.currentAllocation?.admissionId;
    if (admissionId) dto.activeAlert = alertsByAdmission.get(admissionId) ?? null;
  }

  return {
    wardId: ward.id,
    wardName: ward.name,
    wardCode: ward.code,
    totalPhysicalBeds: ward.totalPhysicalBeds,
    registeredBedsCount: beds.length,
    functioningBedsCount: functioningCount,
    availableBedsCount: availableCount,
    occupiedBedsCount: occupiedCount,
    cleaningBedsCount: cleaningCount,
    outOfServiceBedsCount: outOfServiceCount,
    beds: bedDtos,
  };
}
