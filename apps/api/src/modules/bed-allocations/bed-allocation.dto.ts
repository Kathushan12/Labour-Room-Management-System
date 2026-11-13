import { BedAllocationHistoryDto } from '@lrms/shared';
import { BedAllocationHistory } from '../../database/entities/BedAllocationHistory.js';

export function toBedAllocationHistoryDto(
  allocation: BedAllocationHistory,
): BedAllocationHistoryDto {
  return {
    id: allocation.id,
    bedId: allocation.bedId,
    bedNumber: allocation.bed?.bedNumber || '',
    admissionId: allocation.admissionId,
    admissionReferenceId: allocation.admission?.admissionReferenceId || '',
    assignedByUserId: allocation.assignedByUserId,
    assignedByUserName:
      allocation.assignedByUser?.fullName || allocation.assignedByUser?.username || 'Staff',
    assignedAt: allocation.assignedAt.toISOString(),
    releasedByUserId: allocation.releasedByUserId,
    releasedByUserName:
      allocation.releasedByUser?.fullName || allocation.releasedByUser?.username || null,
    releasedAt: allocation.releasedAt ? allocation.releasedAt.toISOString() : null,
    releaseReason: allocation.releaseReason,
    createdAt: allocation.createdAt.toISOString(),
  };
}
