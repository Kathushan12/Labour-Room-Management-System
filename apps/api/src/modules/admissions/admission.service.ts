import { EntityManager, In } from 'typeorm';
import {
  AdmissionCategory,
  AdmissionDto,
  AdmissionStatus,
  CarePlanState,
  CreateTriageRequest,
  CreateTriageResponse,
  PaginatedAdmissionsResponse,
  Permission,
  RiskFlagDefinitionDto,
  RiskFlagKey,
  StaffAssignmentRole,
  UpdateAdmissionRiskFlagsRequest,
  UserRole,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  AdmissionRiskFlag,
  AuditLog,
  Patient,
  PatientPii,
  PatientStaffAssignment,
  RiskFlagDefinition,
  Ward,
} from '../../database/entities/index.js';
import { blindIndexService } from '../../common/crypto/blind-index.service.js';
import { BadRequestError, ConflictError, ForbiddenError } from '../../common/errors/auth.errors.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { applyEncryptedPatientPii } from '../patients/patient.dto.js';
import { findPatientByNicBlindIndex } from '../patients/patient.repository.js';
import { toAdmissionDto, toAdmissionSummaryDto } from './admission.dto.js';
import {
  findActiveRiskFlagDefinitions,
  findPaginatedAdmissions,
  FindAdmissionsFilter,
} from './admission.repository.js';
import { assertCanAccessAdmission } from './patient-authorization.service.js';

function mapCategoryToInitialCarePlan(category: AdmissionCategory): CarePlanState {
  switch (category) {
    case AdmissionCategory.NORMAL_DELIVERY:
      return CarePlanState.NORMAL_DELIVERY;
    case AdmissionCategory.SCHEDULED_CESAREAN:
      return CarePlanState.SCHEDULED_CESAREAN;
    case AdmissionCategory.OBSERVATION_20_PLUS_WEEKS:
      return CarePlanState.OBSERVATION_20_PLUS_WEEKS;
  }
}

function assertRiskFlagSelectionRules(
  keys: RiskFlagKey[],
  noListedRiskFlagsConfirmed: boolean,
): RiskFlagKey[] {
  const uniqueKeys = Array.from(new Set(keys));
  if (uniqueKeys.length !== keys.length) {
    throw new BadRequestError(
      'Duplicate clinical risk flag keys are not permitted',
      'DUPLICATE_RISK_FLAG',
    );
  }

  if (uniqueKeys.length === 0 && !noListedRiskFlagsConfirmed) {
    throw new BadRequestError(
      'Select applicable clinical risk flags or confirm that no listed risk flags are present',
      'RISK_ASSESSMENT_REQUIRED',
    );
  }

  if (uniqueKeys.length > 0 && noListedRiskFlagsConfirmed) {
    throw new BadRequestError(
      'Cannot simultaneously select clinical risk flags and confirm zero listed risk flags',
      'CONFLICTING_RISK_ASSESSMENT',
    );
  }

  return uniqueKeys;
}

/**
 * Generates concurrency-safe unique Admission Reference IDs using a dedicated PostgreSQL sequence
 * (`ADM-YYYYMM-XXXX`), preventing collisions or deleted-ID reuse across concurrent admissions.
 */
async function generateAdmissionReferenceId(tm: EntityManager, now = new Date()): Promise<string> {
  const rows = (await tm.query(
    `SELECT nextval('seq_admission_reference_number') AS seq_val;`,
  )) as Array<{ seq_val: string | number }>;

  const seqNum = Number(rows[0]?.seq_val ?? 0);
  if (!Number.isFinite(seqNum) || seqNum <= 0) {
    throw new Error('Failed to obtain sequential admission reference number');
  }

  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const suffix = String(seqNum).padStart(4, '0');

  return `ADM-${yyyy}${mm}-${suffix}`;
}

export async function listRiskFlagDefinitions(): Promise<RiskFlagDefinitionDto[]> {
  const defs = await findActiveRiskFlagDefinitions();
  return defs.map((def) => ({
    id: def.id,
    key: def.key,
    label: def.label,
    description: def.description ?? null,
    isActive: def.isActive,
  }));
}

export async function listAdmissions(
  filter: FindAdmissionsFilter,
  actor: RequestUser,
): Promise<PaginatedAdmissionsResponse> {
  const { items, total } = await findPaginatedAdmissions(filter, actor);
  return {
    items: items.map(toAdmissionSummaryDto),
    pagination: {
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filter.limit)),
    },
  };
}

export async function getAdmissionDetail(
  actor: RequestUser,
  admissionId: string,
  ipAddress: string | null,
  requestId: string | null,
): Promise<AdmissionDto> {
  const admission = await assertCanAccessAdmission(
    actor,
    admissionId,
    ipAddress,
    requestId,
    'GET_ADMISSION_DETAIL',
  );
  return toAdmissionDto(admission);
}

/**
 * Atomic Rapid Triage Workflow:
 * - Validates category & explicit risk-flag screening assessment.
 * - Handles optional AES-256-GCM PII & HMAC blind-index duplicate-NIC safeguards.
 * - Generates sequential ADM-YYYYMM-XXXX Reference ID inside ACID transaction.
 * - Rolls back completely if any step or critical audit write fails.
 */
export async function performRapidTriage(
  actor: RequestUser,
  input: CreateTriageRequest,
  ipAddress: string | null,
  requestId: string | null,
): Promise<CreateTriageResponse> {
  const piiInput = input.optionalPii ?? null;
  const hasAnyPii = Boolean(
    piiInput &&
    ((piiInput.fullName && piiInput.fullName.trim().length > 0) ||
      (piiInput.nic && piiInput.nic.trim().length > 0) ||
      (piiInput.contactPhone && piiInput.contactPhone.trim().length > 0)),
  );

  if (hasAnyPii && !actor.permissions.includes(Permission.ADMISSIONS_ENTER_PII)) {
    throw new ForbiddenError(
      'Missing permission to record patient identifiable information during triage',
      'PERMISSION_DENIED',
    );
  }

  const riskFlagKeys = assertRiskFlagSelectionRules(
    input.riskFlagKeys ?? [],
    Boolean(input.noListedRiskFlagsConfirmed),
  );

  // Check NIC duplicate identity match safely outside rollback boundary so duplicate audits persist
  let existingMatchedPatientId: string | null = null;
  const cleanNic = piiInput?.nic ? piiInput.nic.trim() : '';

  if (cleanNic.length > 0) {
    const nicBlindIndex = blindIndexService.computeBlindIndex(cleanNic, 'nic');
    if (nicBlindIndex) {
      const existingMatch = await findPatientByNicBlindIndex(nicBlindIndex);
      if (existingMatch) {
        const auditRepo = AppDataSource.getRepository(AuditLog);
        await auditRepo.save(
          auditRepo.create({
            userId: actor.id,
            action: 'PATIENT_DUPLICATE_MATCH_DETECTED',
            entityName: 'Patient',
            entityId: existingMatch.patient.id,
            ipAddress,
            details: {
              requestId,
              context: 'RAPID_TRIAGE',
              linkConfirmed: Boolean(input.linkExistingPatient),
            },
          }),
        );

        const activeAdmissionCount = await AppDataSource.getRepository(Admission).count({
          where: {
            patientId: existingMatch.patient.id,
            status: AdmissionStatus.ADMITTED,
          },
        });

        if (activeAdmissionCount > 0) {
          throw new ConflictError(
            'A patient matching this National Identity Card already has an active admission.',
            'DUPLICATE_ACTIVE_ADMISSION',
          );
        }

        if (!input.linkExistingPatient) {
          throw new ConflictError(
            'An existing historical patient record matches this National Identity Card. Confirm linking to the existing patient record to create a new admission without overwriting stored identity details.',
            'DUPLICATE_PATIENT_MATCH',
          );
        }

        existingMatchedPatientId = existingMatch.patient.id;
      }
    }
  }

  let result: { admission: AdmissionDto; patientId: string; linkedExistingPatient: boolean };
  try {
    result = await AppDataSource.transaction(async (tm) => {
      const activeWard = await tm.findOne(Ward, {
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });

      if (!activeWard) {
        throw new BadRequestError(
          'No active Labour Room ward is configured in the database',
          'WARD_NOT_INITIALIZED',
        );
      }

      // Validate all submitted risk flags against active reference table definitions
      const definitions =
        riskFlagKeys.length > 0
          ? await tm.find(RiskFlagDefinition, {
              where: { key: In(riskFlagKeys), isActive: true },
            })
          : [];

      if (definitions.length !== riskFlagKeys.length) {
        const foundSet = new Set(definitions.map((d) => d.key));
        const invalidKeys = riskFlagKeys.filter((k) => !foundSet.has(k));
        throw new BadRequestError(
          `Invalid or inactive risk flag identifier(s): ${invalidKeys.join(', ')}`,
          'INVALID_RISK_FLAG',
        );
      }

      const now = new Date();
      let finalPatientId: string;
      let linkedExistingPatient = false;

      if (existingMatchedPatientId) {
        // Link explicitly to historical patient record WITHOUT overwriting existing PII
        const lockedExisting = await tm.findOneOrFail(Patient, {
          where: { id: existingMatchedPatientId },
          lock: { mode: 'pessimistic_write' },
        });
        finalPatientId = lockedExisting.id;
        linkedExistingPatient = true;
      } else {
        const newPatient = tm.create(Patient, {});
        await tm.save(newPatient);
        finalPatientId = newPatient.id;

        if (hasAnyPii && piiInput) {
          const pii = tm.create(PatientPii, { patientId: newPatient.id });
          applyEncryptedPatientPii(pii, {
            fullName: piiInput.fullName ?? null,
            nic: piiInput.nic ?? null,
            contactPhone: piiInput.contactPhone ?? null,
          });
          await tm.save(pii);
        }

        await tm.save(
          tm.create(AuditLog, {
            userId: actor.id,
            action: 'PATIENT_CREATED',
            entityName: 'Patient',
            entityId: newPatient.id,
            ipAddress,
            details: {
              requestId,
              hasOptionalPii: hasAnyPii,
              encryptionMode: hasAnyPii ? 'AES-256-GCM' : 'NONE',
            },
          }),
        );
      }

      const admissionReferenceId = await generateAdmissionReferenceId(tm, now);

      const admission = tm.create(Admission, {
        admissionReferenceId,
        wardId: activeWard.id,
        patientId: finalPatientId,
        admittedByUserId: actor.id,
        admissionCategory: input.admissionCategory,
        currentCarePlan: mapCategoryToInitialCarePlan(input.admissionCategory),
        status: AdmissionStatus.ADMITTED,
        admittedAt: now,
        dischargedAt: null,
        noListedRiskFlagsConfirmed: Boolean(input.noListedRiskFlagsConfirmed),
        riskAssessmentCompletedAt: now,
      });
      await tm.save(admission);

      for (const def of definitions) {
        const flag = tm.create(AdmissionRiskFlag, {
          admissionId: admission.id,
          riskFlagDefinitionId: def.id,
          flaggedByUserId: actor.id,
          notes: input.riskFlagNotes?.[def.key] ?? null,
          isActive: true,
        });
        await tm.save(flag);

        await tm.save(
          tm.create(AuditLog, {
            userId: actor.id,
            action: 'RISK_FLAG_ADDED',
            entityName: 'Admission',
            entityId: admission.id,
            ipAddress,
            details: {
              requestId,
              admissionReferenceId,
              riskFlagKey: def.key,
            },
          }),
        );
      }

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'ADMISSION_CREATED',
          entityName: 'Admission',
          entityId: admission.id,
          ipAddress,
          details: {
            requestId,
            admissionReferenceId,
            patientId: finalPatientId,
            linkedExistingPatient,
          },
        }),
      );

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'ADMISSION_CATEGORY_RECORDED',
          entityName: 'Admission',
          entityId: admission.id,
          ipAddress,
          details: {
            requestId,
            admissionReferenceId,
            admissionCategory: input.admissionCategory,
          },
        }),
      );

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'TRIAGE_COMPLETED',
          entityName: 'Admission',
          entityId: admission.id,
          ipAddress,
          details: {
            requestId,
            admissionReferenceId,
            riskFlagCount: definitions.length,
            noListedRiskFlagsConfirmed: Boolean(input.noListedRiskFlagsConfirmed),
            hasOptionalPii: hasAnyPii,
          },
        }),
      );

      // Phase 8: Clinical Responsibility Assignment
      // Ensure admitting nurse has an active ward assignment for the ward
      if (actor.role === UserRole.NURSE_STAFF) {
        await tm.query(
          `INSERT INTO staff_ward_assignments (user_id, ward_id, assigned_at, is_active, assigned_by_user_id, notes)
           VALUES ($1, $2, $3, true, $4, 'Auto-assigned upon admission triage')
           ON CONFLICT (user_id, ward_id) WHERE is_active = true AND ended_at IS NULL
           DO NOTHING;`,
          [actor.id, activeWard.id, now, actor.id],
        );

        const nurseAssignment = tm.create(PatientStaffAssignment, {
          admissionId: admission.id,
          staffId: actor.id,
          assignmentRole: StaffAssignmentRole.PRIMARY_NURSE,
          assignedByUserId: actor.id,
          assignedAt: now,
        });
        await tm.save(nurseAssignment);

        await tm.save(
          tm.create(AuditLog, {
            userId: actor.id,
            action: 'PATIENT_STAFF_ASSIGNED',
            entityName: 'PatientStaffAssignment',
            entityId: nurseAssignment.id,
            ipAddress,
            details: {
              requestId,
              admissionId: admission.id,
              admissionReferenceId,
              staffId: actor.id,
              assignmentRole: StaffAssignmentRole.PRIMARY_NURSE,
              context: 'INITIAL_TRIAGE_ASSIGNMENT',
            },
          }),
        );
      }

      const hydrated = await tm.findOneOrFail(Admission, {
        where: { id: admission.id },
        relations: [
          'admittedByUser',
          'patient',
          'patient.pii',
          'riskFlags',
          'riskFlags.definition',
          'riskFlags.flaggedByUser',
        ],
      });

      return {
        admission: toAdmissionDto(hydrated),
        patientId: finalPatientId,
        linkedExistingPatient,
      };
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string; detail?: string; message?: string };
    if (
      pgErr?.code === '23505' &&
      (pgErr?.constraint === 'uq_patient_pii_nic_blind_index' ||
        pgErr?.detail?.includes('nic_blind_index') ||
        pgErr?.message?.includes('uq_patient_pii_nic_blind_index'))
    ) {
      throw new ConflictError(
        'A patient record with this National Identity Card already exists or was registered concurrently. Please verify and link the existing patient record.',
        'DUPLICATE_NIC_CONFLICT',
      );
    }
    throw err;
  }

  return result;
}

export async function updateAdmissionRiskFlags(
  actor: RequestUser,
  admissionId: string,
  input: UpdateAdmissionRiskFlagsRequest,
  ipAddress: string | null,
  requestId: string | null,
): Promise<AdmissionDto> {
  const targetKeys = assertRiskFlagSelectionRules(
    input.riskFlagKeys,
    Boolean(input.noListedRiskFlagsConfirmed),
  );

  return AppDataSource.transaction(async (tm) => {
    await assertCanAccessAdmission(
      actor,
      admissionId,
      ipAddress,
      requestId,
      'UPDATE_RISK_FLAGS',
      tm,
    );

    const lockedAdmission = await tm.findOneOrFail(Admission, {
      where: { id: admissionId },
      lock: { mode: 'pessimistic_write' },
    });

    if (lockedAdmission.status !== AdmissionStatus.ADMITTED) {
      throw new BadRequestError(
        'Clinical risk flags can only be updated while an admission is active',
        'ADMISSION_NOT_ACTIVE',
      );
    }

    const definitions =
      targetKeys.length > 0
        ? await tm.find(RiskFlagDefinition, {
            where: { key: In(targetKeys), isActive: true },
          })
        : [];

    if (definitions.length !== targetKeys.length) {
      const foundSet = new Set(definitions.map((d) => d.key));
      const invalidKeys = targetKeys.filter((k) => !foundSet.has(k));
      throw new BadRequestError(
        `Invalid or inactive risk flag identifier(s): ${invalidKeys.join(', ')}`,
        'INVALID_RISK_FLAG',
      );
    }

    const currentActiveFlags = await tm.find(AdmissionRiskFlag, {
      where: { admissionId: lockedAdmission.id, isActive: true },
      relations: ['definition'],
    });

    const targetKeySet = new Set(targetKeys);
    const currentByKey = new Map(currentActiveFlags.map((f) => [f.definition.key, f]));
    const now = new Date();

    // 1. Deactivate removed risk flags cleanly while preserving history
    for (const existingFlag of currentActiveFlags) {
      if (!targetKeySet.has(existingFlag.definition.key)) {
        existingFlag.isActive = false;
        existingFlag.deactivatedAt = now;
        existingFlag.deactivatedByUserId = actor.id;
        await tm.save(existingFlag);

        await tm.save(
          tm.create(AuditLog, {
            userId: actor.id,
            action: 'RISK_FLAG_REMOVED',
            entityName: 'Admission',
            entityId: lockedAdmission.id,
            ipAddress,
            details: {
              requestId,
              admissionReferenceId: lockedAdmission.admissionReferenceId,
              riskFlagKey: existingFlag.definition.key,
              reason: input.reason ?? null,
            },
          }),
        );
      }
    }

    // 2. Add newly enabled risk flags or update notes on retained active flags
    for (const def of definitions) {
      const existingActive = currentByKey.get(def.key);
      const nextNote = input.riskFlagNotes?.[def.key] ?? null;

      if (existingActive) {
        if (input.riskFlagNotes && def.key in input.riskFlagNotes) {
          existingActive.notes = nextNote;
          await tm.save(existingActive);
        }
      } else {
        const addedFlag = tm.create(AdmissionRiskFlag, {
          admissionId: lockedAdmission.id,
          riskFlagDefinitionId: def.id,
          flaggedByUserId: actor.id,
          notes: nextNote,
          isActive: true,
        });
        await tm.save(addedFlag);

        await tm.save(
          tm.create(AuditLog, {
            userId: actor.id,
            action: 'RISK_FLAG_ADDED',
            entityName: 'Admission',
            entityId: lockedAdmission.id,
            ipAddress,
            details: {
              requestId,
              admissionReferenceId: lockedAdmission.admissionReferenceId,
              riskFlagKey: def.key,
              reason: input.reason ?? null,
            },
          }),
        );
      }
    }

    lockedAdmission.noListedRiskFlagsConfirmed = Boolean(input.noListedRiskFlagsConfirmed);
    lockedAdmission.riskAssessmentCompletedAt = now;
    await tm.save(lockedAdmission);

    const hydrated = await tm.findOneOrFail(Admission, {
      where: { id: lockedAdmission.id },
      relations: [
        'admittedByUser',
        'patient',
        'patient.pii',
        'riskFlags',
        'riskFlags.definition',
        'riskFlags.flaggedByUser',
      ],
    });

    return toAdmissionDto(hydrated);
  });
}
