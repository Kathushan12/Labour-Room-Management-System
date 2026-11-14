import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthUser, UserRole } from '@lrms/shared';
import { toStaffProfileDto } from '../modules/users/user.dto.js';
import { AppDataSource } from '../config/database.js';
import { User, AuditLog, RefreshSession } from '../database/entities/index.js';
import {
  verifyPassword,
  hashPassword,
  validatePasswordInput,
} from '../common/crypto/password.service.js';
import { signAccessToken } from '../common/crypto/jwt.service.js';
import { generateCsrfToken } from '../common/crypto/csrf.service.js';
import {
  createSession,
  rotateSession,
  revokeSession,
  hashRefreshToken,
  generateRawRefreshToken,
} from '../services/session.service.js';
import { disconnectUserSessions } from '../modules/realtime/realtime.server.js';
import { authRateLimiter } from '../common/middleware/rate-limiter.js';
import { UnauthorizedError, BadRequestError } from '../common/errors/auth.errors.js';
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
      .min(10, 'New password must be at least 10 characters long')
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

function getCsrfCookieOptions() {
  return {
    httpOnly: false,
    secure: isCookieSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
  };
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
      authRateLimiter.recordFailedAttempt(ip, username);
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

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      authRateLimiter.recordFailedAttempt(ip, username);
      await auditRepo.save(
        auditRepo.create({
          userId: user.id,
          action: 'LOGIN_FAILED',
          entityName: 'User',
          entityId: user.id,
          ipAddress: ip,
          details: { requestId: req.id || null, reason: 'Password verification failed' },
        }),
      );
      return next(new UnauthorizedError('Invalid username or password', 'INVALID_CREDENTIALS'));
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

    // Reset rate limiter on successful login
    authRateLimiter.resetUser(user.username);

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

    // Set refresh token cookie
    const refreshMaxAgeMs = env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getCookieOptions(refreshMaxAgeMs));
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

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
      await revokeSession(newSession.id);
      return next(new UnauthorizedError('User account is inactive or not found', 'USER_INACTIVE'));
    }

    const roleName = user.role.name as UserRole;
    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      role: roleName,
      sessionId: newSession.id,
    });

    const csrfToken = generateCsrfToken();

    const refreshMaxAgeMs = env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    res.cookie(REFRESH_COOKIE_NAME, newRawToken, getCookieOptions(refreshMaxAgeMs));
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    await auditRepo.save(
      auditRepo.create({
        userId: user.id,
        action: 'REFRESH_SUCCESS',
        entityName: 'RefreshSession',
        entityId: newSession.id,
        ipAddress: ip,
        details: { requestId: req.id || null },
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
        await revokeSession(session.id);
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
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + env.JWT_REFRESH_EXPIRATION_DAYS);

      const newSession = transactionManager.create(RefreshSession, {
        userId: lockedUser.id,
        tokenHash: newTokenHash,
        familyId: crypto.randomUUID(),
        isRevoked: false,
        expiresAt: newExpiresAt,
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

    const refreshMaxAgeMs = env.JWT_REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    res.cookie(REFRESH_COOKIE_NAME, result.newRawRefreshToken, getCookieOptions(refreshMaxAgeMs));
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

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
