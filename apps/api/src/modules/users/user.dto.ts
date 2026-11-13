import {
  StaffProfileDto,
  UserListItemDto,
  UserDetailDto,
  StaffAssignmentHistoryItemDto,
  UserAuditEntryDto,
  UserRole,
} from '@lrms/shared';
import {
  User,
  StaffProfile,
  PatientStaffAssignment,
  AuditLog,
} from '../../database/entities/index.js';
import { encryptionService } from '../../common/crypto/encryption.service.js';

/**
 * Encrypts staff contact number with AES-256-GCM into separate binary BYTEA columns,
 * or clears encrypted fields when contactNumber is null or empty.
 */
export function applyEncryptedContactNumber(
  profile: StaffProfile,
  contactNumber: string | null | undefined,
): void {
  if (contactNumber === undefined) {
    return;
  }

  const normalized = contactNumber ? contactNumber.trim() : '';
  if (!normalized) {
    profile.contactNumberCiphertext = null;
    profile.contactNumberNonce = null;
    profile.contactNumberAuthTag = null;
    profile.keyVersion = encryptionService.getCurrentKeyVersion();
    return;
  }

  const encrypted = encryptionService.encrypt(normalized);
  profile.contactNumberCiphertext = encrypted.ciphertext;
  profile.contactNumberNonce = encrypted.nonce;
  profile.contactNumberAuthTag = encrypted.authTag;
  profile.keyVersion = encrypted.keyVersion;
}

/**
 * Decrypts AES-256-GCM staff contact number from binary columns when present.
 */
export function decryptStaffContactNumber(profile: StaffProfile): string | null {
  if (
    !profile.contactNumberCiphertext ||
    !profile.contactNumberNonce ||
    !profile.contactNumberAuthTag
  ) {
    return null;
  }

  return encryptionService.decrypt({
    ciphertext: profile.contactNumberCiphertext,
    nonce: profile.contactNumberNonce,
    authTag: profile.contactNumberAuthTag,
    keyVersion: profile.keyVersion,
  });
}

export function toStaffProfileDto(
  profile: StaffProfile | null | undefined,
): StaffProfileDto | null {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    staffId: profile.staffId ?? null,
    professionalRegistrationBody: profile.professionalRegistrationBody ?? null,
    professionalRegistrationNumber: profile.professionalRegistrationNumber ?? null,
    contactNumber: decryptStaffContactNumber(profile),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function toUserListItemDto(user: User): UserListItemDto {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email ?? null,
    role: user.role.name as UserRole,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.toISOString() : null,
    temporaryPasswordExpiresAt: user.temporaryPasswordExpiresAt
      ? user.temporaryPasswordExpiresAt.toISOString()
      : null,
    staffProfile: toStaffProfileDto(user.staffProfile),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toUserDetailDto(
  user: User,
  assignments: PatientStaffAssignment[],
  audits: AuditLog[],
): UserDetailDto {
  const assignmentHistory: StaffAssignmentHistoryItemDto[] = assignments.map((assignment) => ({
    id: assignment.id,
    admissionId: assignment.admissionId,
    admissionReferenceId: assignment.admission?.admissionReferenceId ?? null,
    assignmentRole: assignment.assignmentRole,
    assignedAt: assignment.assignedAt.toISOString(),
    unassignedAt: assignment.unassignedAt ? assignment.unassignedAt.toISOString() : null,
  }));

  const auditHistory: UserAuditEntryDto[] = audits.map((log) => ({
    id: log.id,
    actorUserId: log.userId ?? null,
    actorUsername: log.user?.username ?? null,
    action: log.action,
    entityName: log.entityName,
    entityId: log.entityId ?? null,
    details: log.details ?? null,
    ipAddress: log.ipAddress ?? null,
    createdAt: log.createdAt.toISOString(),
  }));

  return {
    ...toUserListItemDto(user),
    assignmentHistory,
    auditHistory,
  };
}
