import {
  UserRole,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserProfileRequest,
  ReissueCredentialResponse,
  PaginatedUsersResponse,
  UserListItemDto,
  UserDetailDto,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import { env } from '../../config/env.js';
import {
  User,
  Role,
  StaffProfile,
  RefreshSession,
  AuditLog,
} from '../../database/entities/index.js';
import { generateTemporaryPassword, hashPassword } from '../../common/crypto/password.service.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/auth.errors.js';
import {
  FindUsersFilter,
  findPaginatedUsers,
  findUserWithProfileById,
  findStaffAssignmentHistory,
  findUserTargetAuditHistory,
} from './user.repository.js';
import {
  applyEncryptedContactNumber,
  decryptStaffContactNumber,
  toUserListItemDto,
  toUserDetailDto,
} from './user.dto.js';

export async function listUsers(filter: FindUsersFilter): Promise<PaginatedUsersResponse> {
  const { items, total } = await findPaginatedUsers(filter);

  return {
    items: items.map(toUserListItemDto),
    pagination: {
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filter.limit)),
    },
  };
}

export async function getUserDetail(userId: string): Promise<UserDetailDto> {
  const user = await findUserWithProfileById(userId);
  if (!user) {
    throw new NotFoundError('User account not found', 'USER_NOT_FOUND');
  }

  const [assignments, audits] = await Promise.all([
    findStaffAssignmentHistory(user.id),
    findUserTargetAuditHistory(user.id),
  ]);

  return toUserDetailDto(user, assignments, audits);
}

export async function createUser(
  actorUserId: string,
  input: CreateUserRequest,
  ipAddress: string | null,
  requestId: string | null,
): Promise<CreateUserResponse> {
  const temporaryPassword = generateTemporaryPassword(14);
  const passwordHash = await hashPassword(temporaryPassword);
  const tempPasswordExpiresAt = new Date(
    Date.now() + env.TEMP_PASSWORD_EXPIRATION_HOURS * 60 * 60 * 1000,
  );

  const createdUser = await AppDataSource.transaction(async (tm) => {
    const roleEntity = await tm.findOne(Role, { where: { name: input.role } });
    if (!roleEntity) {
      throw new BadRequestError(`Invalid role: ${input.role}`, 'INVALID_ROLE');
    }

    const existingUser = await tm
      .createQueryBuilder(User, 'u')
      .where('LOWER(u.username) = LOWER(:username)', { username: input.username })
      .getOne();

    if (existingUser) {
      throw new ConflictError(
        `Username '${input.username}' is already in use`,
        'USERNAME_ALREADY_EXISTS',
      );
    }

    const user = tm.create(User, {
      username: input.username,
      fullName: input.fullName,
      email: input.email ?? null,
      passwordHash,
      roleId: roleEntity.id,
      isActive: true,
      mustChangePassword: true,
      passwordChangedAt: null,
      temporaryPasswordExpiresAt: tempPasswordExpiresAt,
    });
    await tm.save(user);

    const staffProfile = tm.create(StaffProfile, {
      userId: user.id,
      staffId: input.staffId ?? null,
      professionalRegistrationBody: input.professionalRegistrationBody ?? null,
      professionalRegistrationNumber: input.professionalRegistrationNumber ?? null,
    });
    applyEncryptedContactNumber(staffProfile, input.contactNumber ?? null);
    await tm.save(staffProfile);

    await tm.save(
      tm.create(AuditLog, {
        userId: actorUserId,
        action: 'USER_CREATED',
        entityName: 'User',
        entityId: user.id,
        ipAddress,
        details: {
          requestId,
          targetUsername: user.username,
          assignedRole: roleEntity.name,
          hasStaffProfile: true,
        },
      }),
    );

    await tm.save(
      tm.create(AuditLog, {
        userId: actorUserId,
        action: 'USER_INITIAL_CREDENTIAL_ISSUED',
        entityName: 'User',
        entityId: user.id,
        ipAddress,
        details: {
          requestId,
          targetUsername: user.username,
          expiresAt: tempPasswordExpiresAt.toISOString(),
          reissue: false,
        },
      }),
    );

    return tm.findOneOrFail(User, {
      where: { id: user.id },
      relations: ['role', 'staffProfile'],
    });
  });

  return {
    user: toUserListItemDto(createdUser),
    temporaryPassword,
    temporaryPasswordExpiresAt: tempPasswordExpiresAt.toISOString(),
  };
}

export async function updateUserProfile(
  actorUserId: string,
  targetUserId: string,
  input: UpdateUserProfileRequest,
  ipAddress: string | null,
  requestId: string | null,
): Promise<UserListItemDto> {
  const updatedUser = await AppDataSource.transaction(async (tm) => {
    const user = await tm.findOne(User, {
      where: { id: targetUserId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new NotFoundError('User account not found', 'USER_NOT_FOUND');
    }

    const changedFields: string[] = [];

    if (input.fullName !== undefined && input.fullName !== user.fullName) {
      user.fullName = input.fullName;
      changedFields.push('fullName');
    }

    if (input.email !== undefined && input.email !== user.email) {
      user.email = input.email;
      changedFields.push('email');
    }

    await tm.save(user);

    let profile = await tm.findOne(StaffProfile, {
      where: { userId: user.id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!profile) {
      profile = tm.create(StaffProfile, { userId: user.id });
    }

    if (input.staffId !== undefined && input.staffId !== profile.staffId) {
      profile.staffId = input.staffId;
      changedFields.push('staffId');
    }

    if (
      input.professionalRegistrationBody !== undefined &&
      input.professionalRegistrationBody !== profile.professionalRegistrationBody
    ) {
      profile.professionalRegistrationBody = input.professionalRegistrationBody;
      changedFields.push('professionalRegistrationBody');
    }

    if (
      input.professionalRegistrationNumber !== undefined &&
      input.professionalRegistrationNumber !== profile.professionalRegistrationNumber
    ) {
      profile.professionalRegistrationNumber = input.professionalRegistrationNumber;
      changedFields.push('professionalRegistrationNumber');
    }

    if (input.contactNumber !== undefined) {
      const currentContact = decryptStaffContactNumber(profile);
      const nextContact = input.contactNumber ? input.contactNumber.trim() : null;
      if (nextContact !== currentContact) {
        applyEncryptedContactNumber(profile, nextContact);
        changedFields.push('contactNumber');
      }
    }

    await tm.save(profile);

    await tm.save(
      tm.create(AuditLog, {
        userId: actorUserId,
        action: 'USER_PROFILE_UPDATED',
        entityName: 'User',
        entityId: user.id,
        ipAddress,
        details: {
          requestId,
          targetUsername: user.username,
          changedFields,
        },
      }),
    );

    return tm.findOneOrFail(User, {
      where: { id: user.id },
      relations: ['role', 'staffProfile'],
    });
  });

  return toUserListItemDto(updatedUser);
}

export async function updateUserStatus(
  actorUserId: string,
  targetUserId: string,
  isActive: boolean,
  reason: string | null | undefined,
  ipAddress: string | null,
  requestId: string | null,
): Promise<UserListItemDto> {
  if (actorUserId === targetUserId && !isActive) {
    throw new ForbiddenError(
      'Administrators cannot deactivate their own active account',
      'SELF_DEACTIVATION_FORBIDDEN',
    );
  }

  const updatedUser = await AppDataSource.transaction(async (tm) => {
    // Lock the ADMIN role row first to serialize concurrent admin deactivations/demotions cleanly
    const adminRole = await tm.findOneOrFail(Role, {
      where: { name: UserRole.ADMIN },
      lock: { mode: 'pessimistic_write' },
    });

    const user = await tm.findOne(User, {
      where: { id: targetUserId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new NotFoundError('User account not found', 'USER_NOT_FOUND');
    }

    const targetRole = await tm.findOneOrFail(Role, { where: { id: user.roleId } });

    if (!isActive && targetRole.name === UserRole.ADMIN && user.isActive) {
      const remainingActiveAdmins = await tm
        .createQueryBuilder(User, 'u')
        .where('u.roleId = :adminRoleId AND u.isActive = true AND u.id != :targetUserId', {
          adminRoleId: adminRole.id,
          targetUserId: user.id,
        })
        .getCount();

      if (remainingActiveAdmins < 1) {
        throw new ConflictError(
          'Cannot deactivate the last active administrator account in the system',
          'LAST_ACTIVE_ADMIN_PROTECTED',
        );
      }
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;
    await tm.save(user);

    // Revoke all refresh sessions on deactivation (and never restore sessions on reactivation)
    let sessionsRevoked = false;
    if (!isActive) {
      await tm
        .createQueryBuilder()
        .update(RefreshSession)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
        })
        .where('user_id = :userId AND is_revoked = false', { userId: user.id })
        .execute();
      sessionsRevoked = true;
    }

    await tm.save(
      tm.create(AuditLog, {
        userId: actorUserId,
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityName: 'User',
        entityId: user.id,
        ipAddress,
        details: {
          requestId,
          targetUsername: user.username,
          previousStatus,
          newStatus: isActive,
          sessionsRevoked,
          reason: reason ?? null,
        },
      }),
    );

    return tm.findOneOrFail(User, {
      where: { id: user.id },
      relations: ['role', 'staffProfile'],
    });
  });

  return toUserListItemDto(updatedUser);
}

export async function updateUserRole(
  actorUserId: string,
  targetUserId: string,
  newRole: UserRole,
  reason: string | null | undefined,
  ipAddress: string | null,
  requestId: string | null,
): Promise<UserListItemDto> {
  if (actorUserId === targetUserId) {
    throw new ForbiddenError(
      'Administrators cannot modify their own assigned system role',
      'SELF_ROLE_CHANGE_FORBIDDEN',
    );
  }

  const updatedUser = await AppDataSource.transaction(async (tm) => {
    // Lock the ADMIN role row first to serialize concurrent last-admin checks cleanly
    const adminRole = await tm.findOneOrFail(Role, {
      where: { name: UserRole.ADMIN },
      lock: { mode: 'pessimistic_write' },
    });

    const newRoleEntity = await tm.findOne(Role, { where: { name: newRole } });
    if (!newRoleEntity) {
      throw new BadRequestError(`Invalid role specified: ${newRole}`, 'INVALID_ROLE');
    }

    const user = await tm.findOne(User, {
      where: { id: targetUserId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new NotFoundError('User account not found', 'USER_NOT_FOUND');
    }

    const previousRoleEntity = await tm.findOneOrFail(Role, { where: { id: user.roleId } });

    if (previousRoleEntity.name === newRole) {
      throw new BadRequestError(`User already holds the role '${newRole}'`, 'ROLE_UNCHANGED');
    }

    // Last-active-admin protection when demoting an active ADMIN to a non-admin role
    if (previousRoleEntity.name === UserRole.ADMIN && user.isActive && newRole !== UserRole.ADMIN) {
      const remainingActiveAdmins = await tm
        .createQueryBuilder(User, 'u')
        .where('u.roleId = :adminRoleId AND u.isActive = true AND u.id != :targetUserId', {
          adminRoleId: adminRole.id,
          targetUserId: user.id,
        })
        .getCount();

      if (remainingActiveAdmins < 1) {
        throw new ConflictError(
          'Cannot demote the last active administrator account in the system',
          'LAST_ACTIVE_ADMIN_PROTECTED',
        );
      }
    }

    user.roleId = newRoleEntity.id;
    await tm.save(user);

    // Immediately revoke all existing refresh sessions so updated permissions require fresh auth
    await tm
      .createQueryBuilder()
      .update(RefreshSession)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
      })
      .where('user_id = :userId AND is_revoked = false', { userId: user.id })
      .execute();

    await tm.save(
      tm.create(AuditLog, {
        userId: actorUserId,
        action: 'USER_ROLE_CHANGED',
        entityName: 'User',
        entityId: user.id,
        ipAddress,
        details: {
          requestId,
          targetUsername: user.username,
          previousRole: previousRoleEntity.name,
          newRole: newRoleEntity.name,
          sessionsRevoked: true,
          reason: reason ?? null,
        },
      }),
    );

    return tm.findOneOrFail(User, {
      where: { id: user.id },
      relations: ['role', 'staffProfile'],
    });
  });

  return toUserListItemDto(updatedUser);
}

export async function reissueTemporaryPassword(
  actorUserId: string,
  targetUserId: string,
  ipAddress: string | null,
  requestId: string | null,
): Promise<ReissueCredentialResponse> {
  if (actorUserId === targetUserId) {
    throw new BadRequestError(
      'Administrators must use the change-password flow to update their own password',
      'USE_CHANGE_PASSWORD',
    );
  }

  const temporaryPassword = generateTemporaryPassword(14);
  const passwordHash = await hashPassword(temporaryPassword);
  const tempPasswordExpiresAt = new Date(
    Date.now() + env.TEMP_PASSWORD_EXPIRATION_HOURS * 60 * 60 * 1000,
  );

  const updatedUser = await AppDataSource.transaction(async (tm) => {
    const user = await tm.findOne(User, {
      where: { id: targetUserId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!user) {
      throw new NotFoundError('User account not found', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new ConflictError(
        'Cannot issue a temporary password for a deactivated account. Reactivate the account first.',
        'USER_INACTIVE',
      );
    }

    user.passwordHash = passwordHash;
    user.mustChangePassword = true;
    user.temporaryPasswordExpiresAt = tempPasswordExpiresAt;
    await tm.save(user);

    // Revoke all active sessions so only the newly issued temporary password works
    await tm
      .createQueryBuilder()
      .update(RefreshSession)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
      })
      .where('user_id = :userId AND is_revoked = false', { userId: user.id })
      .execute();

    await tm.save(
      tm.create(AuditLog, {
        userId: actorUserId,
        action: 'USER_INITIAL_CREDENTIAL_ISSUED',
        entityName: 'User',
        entityId: user.id,
        ipAddress,
        details: {
          requestId,
          targetUsername: user.username,
          expiresAt: tempPasswordExpiresAt.toISOString(),
          reissue: true,
          sessionsRevoked: true,
        },
      }),
    );

    return tm.findOneOrFail(User, {
      where: { id: user.id },
      relations: ['role', 'staffProfile'],
    });
  });

  return {
    user: toUserListItemDto(updatedUser),
    temporaryPassword,
    temporaryPasswordExpiresAt: tempPasswordExpiresAt.toISOString(),
  };
}
