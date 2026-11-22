import { UserRole } from '../enums/index.js';

export interface AuditLogEntryDto {
  id: string;
  createdAt: string;
  userId: string | null;
  actorUsername: string | null;
  actorFullName: string | null;
  actorRole: UserRole | null;
  action: string;
  entityName: string;
  entityId: string | null;
  ipAddress: string | null;
  details: Record<string, unknown> | null;
}

export interface PaginatedAuditLogsResponse {
  items: AuditLogEntryDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
