import {
  BedCleaningRecordDto,
  BedCleaningStatus,
  BedDisplayStatus,
  BedDto,
  BedFunctioningStatus,
  BedOccupancyStatus,
} from '@lrms/shared';
import { Bed } from '../../database/entities/Bed.js';
import { BedCleaningRecord } from '../../database/entities/BedCleaningRecord.js';
import { BedAllocationHistory } from '../../database/entities/BedAllocationHistory.js';
import { decryptPatientPii } from '../patients/patient.dto.js';

export function toBedCleaningRecordDto(record: BedCleaningRecord): BedCleaningRecordDto {
  return {
    id: record.id,
    bedId: record.bedId,
    startedByUserId: record.startedByUserId,
    startedByUserName: record.startedByUser?.fullName || record.startedByUser?.username || 'Staff',
    startedAt: record.startedAt.toISOString(),
    completedByUserId: record.completedByUserId,
    completedByUserName:
      record.completedByUser?.fullName || record.completedByUser?.username || null,
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    status: record.status,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toBedDto(
  bed: Bed,
  activeAllocation: BedAllocationHistory | null = null,
  lastCleaning: BedCleaningRecord | null = null,
  canViewPii = false,
): BedDto {
  // Compute display status priority: OUT_OF_SERVICE > OCCUPIED > CLEANING > AVAILABLE
  let displayStatus: BedDisplayStatus;
  if (bed.functioningStatus === BedFunctioningStatus.OUT_OF_SERVICE) {
    displayStatus = BedDisplayStatus.OUT_OF_SERVICE;
  } else if (activeAllocation) {
    displayStatus = BedDisplayStatus.OCCUPIED;
  } else if (
    bed.cleaningStatus === BedCleaningStatus.CLEANING_REQUIRED ||
    bed.cleaningStatus === BedCleaningStatus.IN_PROGRESS
  ) {
    displayStatus = BedDisplayStatus.CLEANING;
  } else {
    displayStatus = BedDisplayStatus.AVAILABLE;
  }

  let activeAllocationDto = null;
  if (activeAllocation) {
    let displayName = 'Patient';
    const patientPii = activeAllocation.admission?.patient?.pii;
    if (patientPii && canViewPii) {
      try {
        const decrypted = decryptPatientPii(patientPii);
        if (decrypted.fullName) {
          displayName = decrypted.fullName;
        }
      } catch {
        // Fallback to Patient
      }
    }

    const activeFlags = (activeAllocation.admission?.riskFlags || [])
      .filter((f) => f.isActive && f.definition)
      .map((f) => f.definition.label);

    activeAllocationDto = {
      id: activeAllocation.id,
      admissionId: activeAllocation.admissionId,
      admissionReferenceId: activeAllocation.admission.admissionReferenceId,
      patientId: activeAllocation.admission.patientId,
      patientDisplayName: displayName,
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

  return {
    id: bed.id,
    wardId: bed.wardId,
    wardCode: bed.ward?.code,
    wardName: bed.ward?.name,
    bedNumber: bed.bedNumber,
    functioningStatus: bed.functioningStatus,
    occupancyStatus: activeAllocation ? BedOccupancyStatus.OCCUPIED : bed.occupancyStatus,
    cleaningStatus: bed.cleaningStatus,
    displayStatus,
    currentAllocation: activeAllocationDto,
    lastCleaning: lastCleaning ? toBedCleaningRecordDto(lastCleaning) : null,
    createdAt: bed.createdAt.toISOString(),
    updatedAt: bed.updatedAt.toISOString(),
  };
}
