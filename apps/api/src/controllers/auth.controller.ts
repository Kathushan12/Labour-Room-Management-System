import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthUser, PASSWORD_MIN_LENGTH, UserRole } from '@lrms/shared';
import { toStaffProfileDto } from '../modules/users/user.dto.js';
import { AppDataSource } from '../config/database.js';
import { User, AuditLog, RefreshSession } from '../database/entities/index.js';
import {
  verifyPassword,
  hashPassword,
  validatePasswordInput,
} from '../common/crypto/password.service.js';
import { signAccessToken } from '../common/crypto/jwt.service.js';
import { generateCsrfToken, verifyCsrfToken } from '../common/crypto/csrf.service.js';
import {
  createSession,
  rotateSession,
  revokeFamily,
  hashRefreshToken,
  generateRawRefreshToken,
  buildSessionWindow,
  getRefreshCookieMaxAgeMs,
} from '../services/session.service.js';
import {
  getLockoutRemainingSeconds,
  formatLockoutMessage,
  registerFailedLogin,
  clearFailedLogins,
  LOCKOUT_MINUTES,
} from '../services/account-lockout.service.js';
import { disconnectUserSessions } from '../modules/realtime/realtime.server.js';
import { authRateLimiter } from '../common/middleware/rate-limiter.js';
import {
  UnauthorizedError,
  BadRequestError,
  AccountLockedError,
} from '../common/errors/auth.errors.js';
import { env } from '../config/env.js';

const loginSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `New password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
      .max(128, 'New password cannot exceed 128 characters'),
  })
  .strict();

const REFRESH_COOKIE_NAME = 'refreshToken';
const CSRF_COOKIE_NAME = 'lrms_csrf';

function isCookieSecure(): boolean {
  // Always Secure=true in production; cannot be disabled via environment variables
  return env.NODE_ENV === 'production' ? true : env.COOKIE_SECURE;
}

function getCookieOptions(maxAgeMs?: number) {
  return {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: 'lax' as const,
    path: '/api/v1/auth',
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

function getCsrfCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: false,
    secure: isCookieSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeMs,
  };
}

// Every tab shares the CSRF cookie, so keep a valid one across refreshes; issuing a new one
// would break the double-submit check in tabs still holding the previous value.
function resolveCsrfToken(req: Request): string {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  return typeof existing === 'string' && verifyCsrfToken(existing) ? existing : generateCsrfToken();
}

export function buildAuthUserDto(user: User): AuthUser {
  const staffProfileDto = toStaffProfileDto(user.staffProfile);

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role.name as UserRole,
    email: user.email,
    staffRegistrationId: user.staffProfile?.professionalRegistrationNumber ?? null,
    staffId: user.staffProfile?.staffId ?? null,
    mustChangePassword: user.mustChangePassword,
    passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.toISOString() : null,
    staffProfile: staffProfileDto,
  };
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new BadRequestError('Validation failed', 'VALIDATION_ERROR', parseResult.error.flatten()),
    );
  }

  const { username, password } = parseResult.data;

  try {
    const userRepo = AppDataSource.getRepository(User);
    const auditRepo = AppDataSource.getRepository(AuditLog);

    const user = await userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.staffProfile', 'staffProfile')
      .where('LOWER(user.username) = LOWER(:username)', { username })
      .getOne();

    if (!user || !user.isActive) {
      authRateLimiter.recordFailedAttempt(ip);
      await auditRepo.save(
        auditRepo.create({
          userId: user ? user.id : null,
          action: 'LOGIN_FAILED',
          entityName: 'User',
          entityId: user ? user.id : null,
          ipAddress: ip,
          details: {
            requestId: req.id || null,
            reason: user ? 'Account inactive' : 'User not found',
            attemptedUsername: username,
          },
        }),
      );
      return next(new UnauthorizedError('Invalid username or password', 'INVALID_CREDENTIALS'));
    }

    const lockedForSeconds = getLockoutRemainingSeconds(user);
    if (lockedForSeconds > 0) {
      await auditRepo.save(
        auditRepo.create({
          userId: user.id,
          action: 'LOGIN_FAILED',
          entityName: 'User',
          entityId: user.id,
          ipAddress: ip,
          details: { requestId: req.id || null, reason: 'Account locked' },
        }),
      );
      return next(new AccountLockedError(formatLockoutMessage(lockedForSeconds), lockedForSeconds));
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      authRateLimiter.recordFailedAttempt(ip);
      const outcome = await registerFailedLogin(user.id);
      await auditRepo.save(
        auditRepo.create({
          userId: user.id,
          action: outcome.locked ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
          entityName: 'User',
          entityId: user.id,
          ipAddress: ip,
          details: { requestId: req.id || null, reason: 'Password verification failed' },
        }),
      );
      if (outcome.locked) {
        return next(
          new AccountLockedError(
            formatLockoutMessage(outcome.retryAfterSeconds),
            outcome.retryAfterSeconds,
          ),
        );
      }
      const warning =
        outcome.remainingAttempts <= 2
          ? ` ${outcome.remainingAttempts} attempt${outcome.remainingAttempts === 1 ? '' : 's'} left before the account is locked for ${LOCKOUT_MINUTES} minutes.`
          : '';
      return next(
        new UnauthorizedError(`Invalid username or password.${warning}`, 'INVALID_CREDENTIALS'),
      );
    }

    // Check temporary password expiration ONLY after hash verification passes
    if (
      user.mustChangePassword &&
      user.temporaryPasswordExpiresAt &&
      new Date() > user.temporaryPasswordExpiresAt
    ) {
      await auditRepo.save(
        auditRepo.create({
          userId: user.id,
          action: 'LOGIN_FAILED',
          entityName: 'User',
          entityId: user.id,
          ipAddress: ip,
          details: { requestId: req.id || null, reason: 'Temporary password expired' },
        }),
      );
      return next(
        new UnauthorizedError(
          'Your temporary password has expired. Please contact an administrator to issue a new temporary credential.',
          'TEMPORARY_PASSWORD_EXPIRED',
        ),
      );
    }

    await clearFailedLogins(user);

    // Create session and family
    const { session, rawRefreshToken } = await createSession(user.id);

    // Sign RS256 JWT access token
    const roleName = user.role.name as UserRole;
    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      role: roleName,
      sessionId: session.id,
    });

    const csrfToken = generateCsrfToken();

    const refreshMaxAgeMs = getRefreshCookieMaxAgeMs(session);
    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getCookieOptions(refreshMaxAgeMs));
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(refreshMaxAgeMs));

    // Audit log
    await auditRepo.save(
      auditRepo.create({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        entityName: 'User',
        entityId: user.id,
        ipAddress: ip,
        details: {
          requestId: req.id || null,
          role: roleName,
          mustChangePassword: user.mustChangePassword,
        },
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        user: buildAuthUserDto(user),
        accessToken,
        csrfToken,
        expiresIn: env.JWT_ACCESS_EXPIRATION_SECONDS,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!rawToken) {
    return next(new UnauthorizedError('Refresh token cookie missing', 'REFRESH_TOKEN_MISSING'));
  }

  try {
    const { session: newSession, rawRefreshToken: newRawToken } = await rotateSession(rawToken, ip);

    const userRepo = AppDataSource.getRepository(User);
    const auditRepo = AppDataSource.getRepository(AuditLog);

    const user = await userRepo.findOne({
      where: { id: newSession.userId },
      relations: ['role', 'staffProfile'],
    });

    if (!user || !user.isActive) {
      await revokeFamily(newSession.familyId);
      return next(new UnauthorizedError('User account is inactive or not found', 'USER_INACTIVE'));
    }

    const roleName = user.role.name as UserRole;
    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      role: roleName,
      sessionId: newSession.id,
    });

    const csrfToken = resolveCsrfToken(req);

    const refreshMaxAgeMs = getRefreshCookieMaxAgeMs(newSession);
    if (newRawToken) {
      res.cookie(REFRESH_COOKIE_NAME, newRawToken, getCookieOptions(refreshMaxAgeMs));
    }
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(refreshMaxAgeMs));

    await auditRepo.save(
      auditRepo.create({
        userId: user.id,
        action: 'REFRESH_SUCCESS',
        entityName: 'RefreshSession',
        entityId: newSession.id,
        ipAddress: ip,
        details: { requestId: req.id || null, concurrentRefresh: newRawToken === null },
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        user: buildAuthUserDto(user),
        accessToken,
        csrfToken,
        expiresIn: env.JWT_ACCESS_EXPIRATION_SECONDS,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];

  try {
    if (rawToken) {
      const tokenHash = hashRefreshToken(rawToken);
      const sessionRepo = AppDataSource.getRepository(RefreshSession);
      const auditRepo = AppDataSource.getRepository(AuditLog);

      const session = await sessionRepo.findOne({ where: { tokenHash } });
      if (session) {
        await revokeFamily(session.familyId);
        disconnectUserSessions(session.userId).catch(() => {});
        await auditRepo.save(
          auditRepo.create({
            userId: session.userId,
            action: 'LOGOUT',
            entityName: 'RefreshSession',
            entityId: session.id,
            ipAddress: ip,
            details: { requestId: req.id || null },
          }),
        );
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    res.clearCookie(CSRF_COOKIE_NAME, {
      httpOnly: false,
      secure: isCookieSecure(),
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  // req.user is guaranteed by authenticate middleware
  const user = req.user!;

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        staffRegistrationId: user.staffRegistrationId,
        staffId: user.staffId,
        mustChangePassword: user.mustChangePassword,
        passwordChangedAt: user.passwordChangedAt,
        staffProfile: user.staffProfile,
      },
      permissions: user.permissions,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Allows an authenticated user (including first-login forced password change) to update their password.
 * Verifies current password, forbids reuse, revokes all prior refresh sessions, and issues fresh tokens.
 */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const authUser = req.user!;

  const parseResult = changePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(
      new BadRequestError('Validation failed', 'VALIDATION_ERROR', parseResult.error.flatten()),
    );
  }

  const { currentPassword, newPassword } = parseResult.data;

  const policyValidation = validatePasswordInput(newPassword);
  if (!policyValidation.valid) {
    return next(
      new BadRequestError(
        policyValidation.message || 'Password does not satisfy complexity policy',
        'PASSWORD_POLICY_VIOLATION',
      ),
    );
  }

  try {
    const result = await AppDataSource.transaction(async (transactionManager) => {
      // Lock user row directly without joining nullable relations on FOR UPDATE
      const lockedUser = await transactionManager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .addSelect('user.passwordHash')
        .where('user.id = :id', { id: authUser.id })
        .getOne();

      if (!lockedUser || !lockedUser.isActive) {
        throw new UnauthorizedError('User account is inactive or not found', 'USER_INACTIVE');
      }

      const currentMatches = await verifyPassword(currentPassword, lockedUser.passwordHash);
      if (!currentMatches) {
        throw new UnauthorizedError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
      }

      const sameAsCurrent = await verifyPassword(newPassword, lockedUser.passwordHash);
      if (sameAsCurrent) {
        throw new BadRequestError(
          'New password cannot be the same as your current password',
          'PASSWORD_REUSE_FORBIDDEN',
        );
      }

      const newPasswordHash = await hashPassword(newPassword);
      const now = new Date();

      lockedUser.passwordHash = newPasswordHash;
      lockedUser.mustChangePassword = false;
      lockedUser.passwordChangedAt = now;
      lockedUser.temporaryPasswordExpiresAt = null;
      await transactionManager.save(lockedUser);

      // Revoke ALL prior refresh sessions for this user across all devices
      await transactionManager
        .createQueryBuilder()
        .update(RefreshSession)
        .set({
          isRevoked: true,
          revokedAt: now,
        })
        .where('user_id = :userId AND is_revoked = false', { userId: lockedUser.id })
        .execute();

      // Create brand-new refresh session for this rotated credential state
      const newRawRefreshToken = generateRawRefreshToken();
      const newTokenHash = hashRefreshToken(newRawRefreshToken);

      const newSession = transactionManager.create(RefreshSession, {
        userId: lockedUser.id,
        tokenHash: newTokenHash,
        familyId: crypto.randomUUID(),
        isRevoked: false,
        ...buildSessionWindow(),
      });
      await transactionManager.save(newSession);

      // Record mandatory security audit log inside the same transaction
      await transactionManager.save(
        transactionManager.create(AuditLog, {
          userId: lockedUser.id,
          action: 'USER_PASSWORD_CHANGED',
          entityName: 'User',
          entityId: lockedUser.id,
          ipAddress: ip,
          details: {
            requestId: req.id || null,
            wasMandatoryFirstLoginChange: authUser.mustChangePassword,
            sessionsRevoked: true,
          },
        }),
      );

      // Load full user relations for DTO after save
      const updatedUserWithRelations = await transactionManager.findOneOrFail(User, {
        where: { id: lockedUser.id },
        relations: ['role', 'staffProfile'],
      });

      return {
        user: updatedUserWithRelations,
        newSession,
        newRawRefreshToken,
      };
    });

    const roleName = result.user.role.name as UserRole;
    const accessToken = signAccessToken({
      sub: result.user.id,
      username: result.user.username,
      role: roleName,
      sessionId: result.newSession.id,
    });
    const csrfToken = generateCsrfToken();

    const refreshMaxAgeMs = getRefreshCookieMaxAgeMs(result.newSession);
    res.cookie(REFRESH_COOKIE_NAME, result.newRawRefreshToken, getCookieOptions(refreshMaxAgeMs));
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(refreshMaxAgeMs));

    res.status(200).json({
      success: true,
      data: {
        user: buildAuthUserDto(result.user),
        accessToken,
        csrfToken,
        expiresIn: env.JWT_ACCESS_EXPIRATION_SECONDS,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
