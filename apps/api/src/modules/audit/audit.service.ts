import { AuditLogEntryDto, PaginatedAuditLogsResponse, UserRole } from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import { AuditLog } from '../../database/entities/index.js';

export interface AuditLogFilter {
  page: number;
  limit: number;
  action?: string;
  fromDate?: string;
  toDate?: string;
}

// Free-text clinical notes are kept out of the admin view (REQ-1.10).
const HIDDEN_DETAIL_KEYS = new Set(['clinicalResponseNotes', 'clinicalReason', 'notes']);

function toEntryDto(log: AuditLog): AuditLogEntryDto {
  const details = log.details
    ? Object.fromEntries(
        Object.entries(log.details).filter(([key]) => !HIDDEN_DETAIL_KEYS.has(key)),
      )
    : null;
  return {
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    userId: log.userId,
    actorUsername: log.user?.username ?? null,
    actorFullName: log.user?.fullName ?? null,
    actorRole: (log.user?.role?.name as UserRole | undefined) ?? null,
    action: log.action,
    entityName: log.entityName,
    entityId: log.entityId,
    ipAddress: log.ipAddress,
    details,
  };
}

/** REQ-9.6: read-only view of the audit log. Entries cannot be edited or deleted (DB trigger). */
export async function listAuditLogs(filter: AuditLogFilter): Promise<PaginatedAuditLogsResponse> {
  const qb = AppDataSource.getRepository(AuditLog)
    .createQueryBuilder('log')
    .leftJoinAndSelect('log.user', 'user')
    .leftJoinAndSelect('user.role', 'role')
    .orderBy('log.createdAt', 'DESC')
    .skip((filter.page - 1) * filter.limit)
    .take(filter.limit);

  if (filter.action) qb.andWhere('log.action = :action', { action: filter.action });
  if (filter.fromDate) qb.andWhere('log.createdAt >= :from', { from: new Date(filter.fromDate) });
  if (filter.toDate) qb.andWhere('log.createdAt < :to', { to: new Date(filter.toDate) });

  const [items, total] = await qb.getManyAndCount();
  return {
    items: items.map(toEntryDto),
    pagination: {
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filter.limit)),
    },
  };
}
