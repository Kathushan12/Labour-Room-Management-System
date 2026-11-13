import { UserRole } from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import { User, PatientStaffAssignment, AuditLog } from '../../database/entities/index.js';
import { AllowedSortField } from './user.schemas.js';

export interface FindUsersFilter {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  status?: 'ACTIVE' | 'INACTIVE';
  sortBy: AllowedSortField;
  sortOrder: 'ASC' | 'DESC';
}

const SORT_COLUMN_ALLOWLIST: Record<AllowedSortField, string> = {
  username: 'user.username',
  fullName: 'user.fullName',
  role: 'role.name',
  isActive: 'user.isActive',
  createdAt: 'user.createdAt',
  updatedAt: 'user.updatedAt',
};

function escapeIlikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

export async function findPaginatedUsers(
  filter: FindUsersFilter,
): Promise<{ items: User[]; total: number }> {
  const userRepo = AppDataSource.getRepository(User);
  const qb = userRepo
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role')
    .leftJoinAndSelect('user.staffProfile', 'staffProfile');

  if (filter.search && filter.search.length > 0) {
    const pattern = `%${escapeIlikePattern(filter.search)}%`;
    qb.andWhere(
      `(
        user.username ILIKE :pattern ESCAPE '\\' OR
        user.fullName ILIKE :pattern ESCAPE '\\' OR
        COALESCE(staffProfile.staffId, '') ILIKE :pattern ESCAPE '\\' OR
        COALESCE(staffProfile.professionalRegistrationNumber, '') ILIKE :pattern ESCAPE '\\'
      )`,
      { pattern },
    );
  }

  if (filter.role) {
    qb.andWhere('role.name = :role', { role: filter.role });
  }

  if (filter.status === 'ACTIVE') {
    qb.andWhere('user.isActive = :isActive', { isActive: true });
  } else if (filter.status === 'INACTIVE') {
    qb.andWhere('user.isActive = :isActive', { isActive: false });
  }

  const sortColumn = SORT_COLUMN_ALLOWLIST[filter.sortBy] || 'user.createdAt';
  qb.orderBy(sortColumn, filter.sortOrder);
  qb.addOrderBy('user.id', 'ASC'); // Deterministic tie-breaker

  qb.skip((filter.page - 1) * filter.limit).take(filter.limit);

  const [items, total] = await qb.getManyAndCount();
  return { items, total };
}

export async function findUserWithProfileById(id: string): Promise<User | null> {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo.findOne({
    where: { id },
    relations: ['role', 'staffProfile'],
  });
}

export async function findStaffAssignmentHistory(
  userId: string,
  limit = 25,
): Promise<PatientStaffAssignment[]> {
  const assignmentRepo = AppDataSource.getRepository(PatientStaffAssignment);
  return assignmentRepo
    .createQueryBuilder('assignment')
    .leftJoin('assignment.admission', 'admission')
    .addSelect(['admission.id', 'admission.admissionReferenceId'])
    .where('assignment.staffId = :userId', { userId })
    .orderBy('assignment.assignedAt', 'DESC')
    .take(limit)
    .getMany();
}

export async function findUserTargetAuditHistory(
  targetUserId: string,
  limit = 25,
): Promise<AuditLog[]> {
  const auditRepo = AppDataSource.getRepository(AuditLog);
  return auditRepo
    .createQueryBuilder('log')
    .leftJoin('log.user', 'actor')
    .addSelect(['actor.id', 'actor.username'])
    .where(
      '(log.entityId = :entityIdStr AND log.entityName = :entityName) OR log.userId = :actorUserUuid',
      {
        entityIdStr: targetUserId,
        entityName: 'User',
        actorUserUuid: targetUserId,
      },
    )
    .orderBy('log.createdAt', 'DESC')
    .take(limit)
    .getMany();
}
