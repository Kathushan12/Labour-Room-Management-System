import {
  PatientAdmissionHistoryDto,
  PatientDto,
  PatientLookupResponse,
  PatientPiiDto,
  PatientSummaryDto,
  UpdatePatientPiiRequest,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import { AuditLog, Patient, PatientPii } from '../../database/entities/index.js';
import { blindIndexService } from '../../common/crypto/blind-index.service.js';
import { ConflictError } from '../../common/errors/auth.errors.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { assertCanAccessPatient } from '../admissions/patient-authorization.service.js';
import { toAdmissionSummaryDto } from '../admissions/admission.dto.js';
import {
  applyEncryptedPatientPii,
  decryptPatientPii,
  toPatientDto,
  toPatientSummaryDto,
} from './patient.dto.js';
import {
  findAuthorizedPatientAdmissions,
  findPatientByNicBlindIndex,
  findPatientRelatedAudits,
} from './patient.repository.js';

export async function getPatientMasterRecord(
  actor: RequestUser,
  patientId: string,
  ipAddress: string | null,
  requestId: string | null,
): Promise<PatientDto> {
  const patient = await assertCanAccessPatient(
    actor,
    patientId,
    ipAddress,
    requestId,
    'GET_PATIENT_MASTER',
  );

  const admissions = await findAuthorizedPatientAdmissions(patient.id, actor);
  const audits = await findPatientRelatedAudits(
    patient.id,
    admissions.map((a) => a.id),
  );

  return toPatientDto(
    patient,
    admissions.map((a) => toAdmissionSummaryDto(a)),
    audits,
  );
}

export async function getPatientAdmissionsHistory(
  actor: RequestUser,
  patientId: string,
  ipAddress: string | null,
  requestId: string | null,
): Promise<PatientAdmissionHistoryDto> {
  const patient = await assertCanAccessPatient(
    actor,
    patientId,
    ipAddress,
    requestId,
    'GET_PATIENT_ADMISSIONS',
  );

  const admissions = await findAuthorizedPatientAdmissions(patient.id, actor);

  return {
    patient: toPatientSummaryDto(patient),
    admissions: admissions.map((a) => toAdmissionSummaryDto(a)),
  };
}

/**
 * Explicitly audited patient PII decryption & disclosure.
 * Strictly requires Permission.PATIENTS_VIEW_PII and patient-level authorization.
 */
export async function revealPatientPii(
  actor: RequestUser,
  patientId: string,
  ipAddress: string | null,
  requestId: string | null,
): Promise<PatientPiiDto> {
  const patient = await assertCanAccessPatient(
    actor,
    patientId,
    ipAddress,
    requestId,
    'REVEAL_PATIENT_PII',
  );

  const disclosed = decryptPatientPii(patient.pii);

  // Persist immutable PII disclosure audit record (strictly zero plaintext PII in details)
  const auditRepo = AppDataSource.getRepository(AuditLog);
  await auditRepo.save(
    auditRepo.create({
      userId: actor.id,
      action: 'PATIENT_PII_ACCESSED',
      entityName: 'Patient',
      entityId: patient.id,
      ipAddress,
      details: {
        requestId,
        actorRole: actor.role,
        disclosedFieldsPresent: {
          fullName: Boolean(disclosed.fullName),
          nic: Boolean(disclosed.nic),
          contactPhone: Boolean(disclosed.contactPhone),
        },
      },
    }),
  );

  return disclosed;
}

/**
 * Adds or updates optional encrypted patient identity fields post-admission.
 * Enforces patient-level access, NIC blind-index uniqueness check, and AES-256-GCM encryption.
 */
export async function updatePatientPii(
  actor: RequestUser,
  patientId: string,
  input: UpdatePatientPiiRequest,
  ipAddress: string | null,
  requestId: string | null,
): Promise<PatientSummaryDto> {
  // Check authorization upfront before opening transaction
  await assertCanAccessPatient(actor, patientId, ipAddress, requestId, 'UPDATE_PATIENT_PII');

  // Pre-compute NIC duplicate collision check outside rollback so audit survives on 409
  if (input.nic !== undefined && input.nic !== null && input.nic.trim().length > 0) {
    const candidateIndex = blindIndexService.computeBlindIndex(input.nic, 'nic');
    if (candidateIndex) {
      const existingMatch = await findPatientByNicBlindIndex(candidateIndex);
      if (existingMatch && existingMatch.patient.id !== patientId) {
        const auditRepo = AppDataSource.getRepository(AuditLog);
        await auditRepo.save(
          auditRepo.create({
            userId: actor.id,
            action: 'PATIENT_DUPLICATE_MATCH_DETECTED',
            entityName: 'Patient',
            entityId: patientId,
            ipAddress,
            details: {
              requestId,
              matchedOtherPatientId: existingMatch.patient.id,
              context: 'UPDATE_PATIENT_PII',
            },
          }),
        );
        throw new ConflictError(
          'Provided NIC matches an existing separate patient record. Automatic merging is disabled.',
          'DUPLICATE_NIC_CONFLICT',
        );
      }
    }
  }

  try {
    const savedPatient = await AppDataSource.transaction(async (tm) => {
      const lockedPatient = await tm.findOneOrFail(Patient, {
        where: { id: patientId },
        lock: { mode: 'pessimistic_write' },
      });

      let pii = await tm.findOne(PatientPii, {
        where: { patientId: lockedPatient.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!pii) {
        pii = tm.create(PatientPii, { patientId: lockedPatient.id });
      }

      const { updatedFields } = applyEncryptedPatientPii(pii, {
        fullName: input.fullName,
        nic: input.nic,
        contactPhone: input.contactPhone,
      });

      await tm.save(pii);
      lockedPatient.updatedAt = new Date();
      await tm.save(lockedPatient);
      lockedPatient.pii = pii;

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'PATIENT_PROFILE_UPDATED',
          entityName: 'Patient',
          entityId: lockedPatient.id,
          ipAddress,
          details: {
            requestId,
            updatedFieldNames: updatedFields,
            encryptionMode: 'AES-256-GCM',
          },
        }),
      );

      return lockedPatient;
    });

    return toPatientSummaryDto(savedPatient);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string; detail?: string; message?: string };
    if (
      pgErr?.code === '23505' &&
      (pgErr?.constraint === 'uq_patient_pii_nic_blind_index' ||
        pgErr?.detail?.includes('nic_blind_index') ||
        pgErr?.message?.includes('uq_patient_pii_nic_blind_index'))
    ) {
      throw new ConflictError(
        'Provided NIC matches an existing separate patient record. Automatic merging is disabled.',
        'DUPLICATE_NIC_CONFLICT',
      );
    }
    throw err;
  }
}

/**
 * Authorized exact-match NIC lookup via HMAC-SHA256 blind index.
 * Strictly returns only patients the caller already has patient-level authorization to access,
 * never leaking existence of unauthorized records.
 */
export async function lookupPatientByNic(
  actor: RequestUser,
  nic: string,
  ipAddress: string | null,
  requestId: string | null,
): Promise<PatientLookupResponse> {
  const blindIndex = blindIndexService.computeBlindIndex(nic, 'nic');
  if (!blindIndex) {
    return { matches: [] };
  }

  const matched = await findPatientByNicBlindIndex(blindIndex);
  if (!matched) {
    return { matches: [] };
  }

  try {
    const authorizedPatient = await assertCanAccessPatient(
      actor,
      matched.patient.id,
      ipAddress,
      requestId,
      'BLIND_INDEX_LOOKUP',
    );
    return { matches: [toPatientSummaryDto(authorizedPatient)] };
  } catch {
    // Non-disclosing: do not confirm existence of matching patient to unauthorized caller
    return { matches: [] };
  }
}
