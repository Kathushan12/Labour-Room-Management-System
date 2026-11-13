import {
  PatientDto,
  PatientPiiDto,
  PatientSummaryDto,
  PatientAuditSummaryEntryDto,
  AdmissionSummaryDto,
} from '@lrms/shared';
import { Patient, PatientPii, AuditLog } from '../../database/entities/index.js';
import { encryptionService } from '../../common/crypto/encryption.service.js';
import { blindIndexService } from '../../common/crypto/blind-index.service.js';

function normalizeNullableText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Encrypts optional patient identity fields into AES-256-GCM binary columns
 * and computes independent HMAC-SHA256 blind indexes where approved.
 */
export function applyEncryptedPatientPii(
  pii: PatientPii,
  input: {
    fullName?: string | null;
    nic?: string | null;
    contactPhone?: string | null;
  },
): { updatedFields: string[]; normalizedNic: string | null; nicBlindIndex: Buffer | null } {
  const updatedFields: string[] = [];

  if (input.fullName !== undefined) {
    const cleanName = normalizeNullableText(input.fullName);
    if (cleanName) {
      const enc = encryptionService.encrypt(cleanName);
      pii.fullNameCiphertext = enc.ciphertext;
      pii.fullNameNonce = enc.nonce;
      pii.fullNameAuthTag = enc.authTag;
      pii.keyVersion = enc.keyVersion;
    } else {
      pii.fullNameCiphertext = null;
      pii.fullNameNonce = null;
      pii.fullNameAuthTag = null;
    }
    updatedFields.push('fullName');
  }

  let normalizedNic: string | null = null;
  let nicBlindIndex: Buffer | null = pii.nicBlindIndex ?? null;

  if (input.nic !== undefined) {
    const cleanNic = normalizeNullableText(input.nic);
    if (cleanNic) {
      normalizedNic = blindIndexService.normalize(cleanNic, 'nic');
      const enc = encryptionService.encrypt(normalizedNic);
      pii.nicCiphertext = enc.ciphertext;
      pii.nicNonce = enc.nonce;
      pii.nicAuthTag = enc.authTag;
      pii.keyVersion = enc.keyVersion;
      nicBlindIndex = blindIndexService.computeBlindIndex(normalizedNic, 'nic');
      pii.nicBlindIndex = nicBlindIndex;
    } else {
      pii.nicCiphertext = null;
      pii.nicNonce = null;
      pii.nicAuthTag = null;
      pii.nicBlindIndex = null;
      nicBlindIndex = null;
    }
    updatedFields.push('nic');
  }

  if (input.contactPhone !== undefined) {
    const cleanPhone = normalizeNullableText(input.contactPhone);
    if (cleanPhone) {
      const enc = encryptionService.encrypt(cleanPhone);
      pii.contactPhoneCiphertext = enc.ciphertext;
      pii.contactPhoneNonce = enc.nonce;
      pii.contactPhoneAuthTag = enc.authTag;
      pii.keyVersion = enc.keyVersion;
      pii.contactPhoneBlindIndex = blindIndexService.computeBlindIndex(cleanPhone, 'phone');
    } else {
      pii.contactPhoneCiphertext = null;
      pii.contactPhoneNonce = null;
      pii.contactPhoneAuthTag = null;
      pii.contactPhoneBlindIndex = null;
    }
    updatedFields.push('contactPhone');
  }

  return { updatedFields, normalizedNic, nicBlindIndex };
}

/**
 * Decrypts AES-256-GCM patient PII fields strictly for audited authorized disclosure.
 */
export function decryptPatientPii(pii: PatientPii | null | undefined): PatientPiiDto {
  if (!pii) {
    return {
      fullName: null,
      nic: null,
      contactPhone: null,
      keyVersion: encryptionService.getCurrentKeyVersion(),
      updatedAt: new Date(0).toISOString(),
    };
  }

  const fullName =
    pii.fullNameCiphertext && pii.fullNameNonce && pii.fullNameAuthTag
      ? encryptionService.decrypt({
          ciphertext: pii.fullNameCiphertext,
          nonce: pii.fullNameNonce,
          authTag: pii.fullNameAuthTag,
          keyVersion: pii.keyVersion,
        })
      : null;

  const nic =
    pii.nicCiphertext && pii.nicNonce && pii.nicAuthTag
      ? encryptionService.decrypt({
          ciphertext: pii.nicCiphertext,
          nonce: pii.nicNonce,
          authTag: pii.nicAuthTag,
          keyVersion: pii.keyVersion,
        })
      : null;

  const contactPhone =
    pii.contactPhoneCiphertext && pii.contactPhoneNonce && pii.contactPhoneAuthTag
      ? encryptionService.decrypt({
          ciphertext: pii.contactPhoneCiphertext,
          nonce: pii.contactPhoneNonce,
          authTag: pii.contactPhoneAuthTag,
          keyVersion: pii.keyVersion,
        })
      : null;

  return {
    fullName,
    nic,
    contactPhone,
    keyVersion: pii.keyVersion,
    updatedAt: pii.updatedAt.toISOString(),
  };
}

export function toPatientSummaryDto(patient: Patient): PatientSummaryDto {
  const pii = patient.pii;
  const hasFullName = Boolean(pii?.fullNameCiphertext);
  const hasNic = Boolean(pii?.nicCiphertext);
  const hasContactPhone = Boolean(pii?.contactPhoneCiphertext);

  return {
    id: patient.id,
    hasPii: hasFullName || hasNic || hasContactPhone,
    hasFullName,
    hasNic,
    hasContactPhone,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

export function toPatientAuditEntryDto(log: AuditLog): PatientAuditSummaryEntryDto {
  return {
    id: log.id,
    actorUserId: log.userId ?? null,
    actorUsername: log.user?.username ?? null,
    action: log.action,
    entityName: log.entityName,
    entityId: log.entityId ?? null,
    details: log.details ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

export function toPatientDto(
  patient: Patient,
  admissions: AdmissionSummaryDto[],
  audits: AuditLog[],
): PatientDto {
  return {
    ...toPatientSummaryDto(patient),
    admissionCount: admissions.length,
    admissions,
    auditHistory: audits.map(toPatientAuditEntryDto),
  };
}
