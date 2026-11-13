import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { UserRole } from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  AuditLog,
  Patient,
  PatientStaffAssignment,
} from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { ForbiddenError, NotFoundError } from '../../common/errors/auth.errors.js';

async function recordPatientAccessDeniedAudit(
  actor: RequestUser,
  entityName: 'Patient' | 'Admission',
  entityId: string,
  ipAddress: string | null,
  requestId: string | null,
  reason: string,
): Promise<void> {
  try {
    const auditRepo = AppDataSource.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        userId: actor.id,
        action: 'PATIENT_ACCESS_DENIED',
        entityName,
        entityId,
        ipAddress,
        details: {
          requestId,
          actorRole: actor.role,
          reason,
        },
      }),
    );
  } catch {
    // Do not mask the primary 403 Forbidden if audit write fails
  }
}

/**
 * Applies role-aware patient-level row scoping onto an Admissions query.
 * - ADMIN: permitted ONLY for de-identified summary register (never PII).
 * - DOCTOR & NURSE_STAFF (Phase 8): strictly limited to admissions with an active PatientStaffAssignment.
 */
export function applyAdmissionVisibilityScope(
  qb: SelectQueryBuilder<Admission>,
  actor: RequestUser,
  alias = 'admission',
): void {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (actor.role === UserRole.DOCTOR || actor.role === UserRole.NURSE_STAFF) {
    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM patient_staff_assignments psa
        WHERE psa.admission_id = ${alias}.id
          AND psa.staff_id = :scopeActorId
          AND psa.unassigned_at IS NULL
      )`,
      { scopeActorId: actor.id },
    );
    return;
  }

  // Default-deny for any unrecognized role
  qb.andWhere('1 = 0');
}

/**
 * Verifies patient-level access to a specific admission episode.
 * Emergency overrides are intentionally NOT active in Phase 6 until doctor on-duty status
 * and override governance workflows are introduced in later phases.
 */
export async function assertCanAccessAdmission(
  actor: RequestUser,
  admissionId: string,
  ipAddress: string | null,
  requestId: string | null,
  context = 'ADMISSION_ACCESS',
  tm?: EntityManager,
): Promise<Admission> {
  // Admins do not hold individual clinical patient/admission record access
  if (actor.role === UserRole.ADMIN) {
    await recordPatientAccessDeniedAudit(
      actor,
      'Admission',
      admissionId,
      ipAddress,
      requestId,
      `${context}:ADMIN_PATIENT_LEVEL_DENIED`,
    );
    throw new ForbiddenError(
      'Administrators are restricted from accessing individual patient admission records',
      'PATIENT_ACCESS_DENIED',
    );
  }

  const manager = tm ?? AppDataSource.manager;
  const admission = await manager.findOne(Admission, {
    where: { id: admissionId },
    relations: [
      'admittedByUser',
      'patient',
      'patient.pii',
      'riskFlags',
      'riskFlags.definition',
      'riskFlags.flaggedByUser',
    ],
  });

  if (!admission) {
    throw new NotFoundError('Admission record not found', 'ADMISSION_NOT_FOUND');
  }

  const activeAssignmentCount = await manager
    .createQueryBuilder(PatientStaffAssignment, 'psa')
    .where(
      'psa.admissionId = :admissionId AND psa.staffId = :staffId AND psa.unassignedAt IS NULL',
      {
        admissionId: admission.id,
        staffId: actor.id,
      },
    )
    .getCount();

  if (activeAssignmentCount > 0) {
    return admission;
  }

  await recordPatientAccessDeniedAudit(
    actor,
    'Admission',
    admission.id,
    ipAddress,
    requestId,
    `${context}:UNASSIGNED_CLINICIAN`,
  );

  throw new ForbiddenError(
    'Access denied: you are not assigned to this admission episode',
    'PATIENT_ACCESS_DENIED',
  );
}

/**
 * Verifies patient-level access to a Patient master record (and any PII action).
 */
export async function assertCanAccessPatient(
  actor: RequestUser,
  patientId: string,
  ipAddress: string | null,
  requestId: string | null,
  context = 'PATIENT_ACCESS',
  tm?: EntityManager,
): Promise<Patient> {
  // Strictly default-deny ADMIN from viewing or modifying individual patient records / PII
  if (actor.role === UserRole.ADMIN) {
    await recordPatientAccessDeniedAudit(
      actor,
      'Patient',
      patientId,
      ipAddress,
      requestId,
      `${context}:ADMIN_PATIENT_LEVEL_DENIED`,
    );
    throw new ForbiddenError(
      'Administrators cannot access patient master records or identifiable data',
      'PATIENT_ACCESS_DENIED',
    );
  }

  const manager = tm ?? AppDataSource.manager;
  const patient = await manager.findOne(Patient, {
    where: { id: patientId },
    relations: ['pii'],
  });

  if (!patient) {
    throw new NotFoundError('Patient record not found', 'PATIENT_NOT_FOUND');
  }

  const qb = manager
    .createQueryBuilder(Admission, 'admission')
    .where('admission.patientId = :patientId', { patientId: patient.id });

  applyAdmissionVisibilityScope(qb, actor, 'admission');

  const authorizedAdmissionsCount = await qb.getCount();
  if (authorizedAdmissionsCount > 0) {
    return patient;
  }

  await recordPatientAccessDeniedAudit(
    actor,
    'Patient',
    patient.id,
    ipAddress,
    requestId,
    `${context}:UNASSIGNED_PATIENT`,
  );

  throw new ForbiddenError(
    'Access denied: no authorized admission link exists for this patient record',
    'PATIENT_ACCESS_DENIED',
  );
}
