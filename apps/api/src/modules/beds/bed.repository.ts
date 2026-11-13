import { AppDataSource } from '../../config/database.js';
import { Bed } from '../../database/entities/Bed.js';
import { BedAllocationHistory } from '../../database/entities/BedAllocationHistory.js';
import { BedCleaningRecord } from '../../database/entities/BedCleaningRecord.js';
import { IsNull } from 'typeorm';

export async function findBedsByWard(wardId: string): Promise<Bed[]> {
  return AppDataSource.getRepository(Bed).find({
    where: { wardId },
    order: { bedNumber: 'ASC' },
    relations: ['ward'],
  });
}

export async function findBedById(bedId: string): Promise<Bed | null> {
  return AppDataSource.getRepository(Bed).findOne({
    where: { id: bedId },
    relations: ['ward'],
  });
}

export async function findBedByWardAndNumber(
  wardId: string,
  bedNumber: string,
): Promise<Bed | null> {
  return AppDataSource.getRepository(Bed).findOne({
    where: { wardId, bedNumber },
  });
}

export async function findActiveAllocationForBed(
  bedId: string,
): Promise<BedAllocationHistory | null> {
  return AppDataSource.getRepository(BedAllocationHistory).findOne({
    where: {
      bedId,
      releasedAt: IsNull(),
    },
    relations: [
      'admission',
      'admission.patient',
      'admission.patient.pii',
      'admission.riskFlags',
      'admission.riskFlags.definition',
      'assignedByUser',
    ],
  });
}

export async function findLastCleaningRecordForBed(
  bedId: string,
): Promise<BedCleaningRecord | null> {
  return AppDataSource.getRepository(BedCleaningRecord).findOne({
    where: { bedId },
    order: { startedAt: 'DESC' },
    relations: ['startedByUser', 'completedByUser'],
  });
}

export async function findActiveCleaningRecordForBed(
  bedId: string,
): Promise<BedCleaningRecord | null> {
  return AppDataSource.getRepository(BedCleaningRecord).findOne({
    where: {
      bedId,
      status: 'IN_PROGRESS',
    },
    order: { startedAt: 'DESC' },
    relations: ['startedByUser'],
  });
}

export async function findCleaningHistoryForBed(
  bedId: string,
  limit = 20,
): Promise<BedCleaningRecord[]> {
  return AppDataSource.getRepository(BedCleaningRecord).find({
    where: { bedId },
    order: { startedAt: 'DESC' },
    take: limit,
    relations: ['startedByUser', 'completedByUser'],
  });
}
