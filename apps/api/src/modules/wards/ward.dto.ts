import { WardDto, WardSummaryDto } from '@lrms/shared';
import { Ward } from '../../database/entities/Ward.js';

export function toWardDto(ward: Ward, registeredBedsCount = 0): WardDto {
  return {
    id: ward.id,
    name: ward.name,
    code: ward.code,
    totalPhysicalBeds: ward.totalPhysicalBeds,
    isActive: ward.isActive,
    registeredBedsCount,
    createdAt: ward.createdAt.toISOString(),
    updatedAt: ward.updatedAt.toISOString(),
  };
}

export function toWardSummaryDto(
  ward: Ward,
  counts: {
    registeredBedsCount: number;
    functioningBedsCount: number;
    availableBedsCount: number;
    occupiedBedsCount: number;
    cleaningBedsCount: number;
    outOfServiceBedsCount: number;
  },
): WardSummaryDto {
  return {
    id: ward.id,
    name: ward.name,
    code: ward.code,
    totalPhysicalBeds: ward.totalPhysicalBeds,
    isActive: ward.isActive,
    ...counts,
  };
}
