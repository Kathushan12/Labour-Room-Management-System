import { AdmissionCategory, AdmissionStatus, RiskFlagKey } from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import { Admission, RiskFlagDefinition } from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { AllowedAdmissionSortField } from './admission.schemas.js';
import { applyAdmissionVisibilityScope } from './patient-authorization.service.js';

export interface FindAdmissionsFilter {
  page: number;
  limit: number;
  search?: string;
  category?: AdmissionCategory;
  status?: AdmissionStatus;
  riskFlagKey?: RiskFlagKey;
  fromDate?: Date;
  toDate?: Date;
  sortBy: AllowedAdmissionSortField;
  sortOrder: 'ASC' | 'DESC';
}

const ADMISSION_SORT_ALLOWLIST: Record<AllowedAdmissionSortField, string> = {
  admittedAt: 'admission.admittedAt',
  admissionReferenceId: 'admission.admissionReferenceId',
  admissionCategory: 'admission.admissionCategory',
  status: 'admission.status',
  createdAt: 'admission.createdAt',
};

function escapeIlikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

export async function findActiveRiskFlagDefinitions(): Promise<RiskFlagDefinition[]> {
  return AppDataSource.getRepository(RiskFlagDefinition).find({
    where: { isActive: true },
    order: { createdAt: 'ASC', key: 'ASC' },
  });
}

export async function findPaginatedAdmissions(
  filter: FindAdmissionsFilter,
  actor: RequestUser,
): Promise<{ items: Admission[]; total: number }> {
  const repo = AppDataSource.getRepository(Admission);
  const qb = repo
    .createQueryBuilder('admission')
    .leftJoinAndSelect('admission.admittedByUser', 'admittedByUser')
    .leftJoin('admission.patient', 'patient')
    .addSelect(['patient.id'])
    .leftJoin('patient.pii', 'pii')
    .addSelect([
      'pii.id',
      'pii.fullNameCiphertext',
      'pii.nicCiphertext',
      'pii.contactPhoneCiphertext',
    ])
    .leftJoinAndSelect('admission.riskFlags', 'riskFlags')
    .leftJoinAndSelect('riskFlags.definition', 'definition')
    .leftJoinAndSelect('riskFlags.flaggedByUser', 'flaggedByUser');

  // Enforce patient-level access scope on non-admin clinicians
  applyAdmissionVisibilityScope(qb, actor, 'admission');

  // Reference ID search only (never plaintext PII SQL search)
  if (filter.search && filter.search.length > 0) {
    const pattern = `%${escapeIlikePattern(filter.search)}%`;
    qb.andWhere(`admission.admissionReferenceId ILIKE :pattern ESCAPE '\\'`, { pattern });
  }

  if (filter.category) {
    qb.andWhere('admission.admissionCategory = :category', { category: filter.category });
  }

  if (filter.status) {
    qb.andWhere('admission.status = :status', { status: filter.status });
  }

  if (filter.fromDate) {
    qb.andWhere('admission.admittedAt >= :fromDate', { fromDate: filter.fromDate });
  }

  if (filter.toDate) {
    qb.andWhere('admission.admittedAt <= :toDate', { toDate: filter.toDate });
  }

  if (filter.riskFlagKey) {
    qb.andWhere(
      `EXISTS (
        SELECT 1
        FROM admission_risk_flags arf
        JOIN risk_flag_definitions rfd ON rfd.id = arf.risk_flag_definition_id
        WHERE arf.admission_id = admission.id
          AND arf.is_active = TRUE
          AND rfd.key = :riskFlagKey
      )`,
      { riskFlagKey: filter.riskFlagKey },
    );
  }

  const sortCol = ADMISSION_SORT_ALLOWLIST[filter.sortBy] || 'admission.admittedAt';
  qb.orderBy(sortCol, filter.sortOrder);
  qb.addOrderBy('admission.id', 'ASC');

  qb.skip((filter.page - 1) * filter.limit).take(filter.limit);

  const [items, total] = await qb.getManyAndCount();
  return { items, total };
}
