import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission, ROLE_PERMISSIONS, StaffProfileDto } from '@lrms/shared';
import { verifyAccessToken } from '../crypto/jwt.service.js';
import { AppDataSource } from '../../config/database.js';
import { User, AuditLog } from '../../database/entities/index.js';
import { isAccessSessionActive } from '../../services/session.service.js';
import { UnauthorizedError, ForbiddenError } from '../errors/auth.errors.js';
import { toStaffProfileDto } from '../../modules/users/user.dto.js';

export interface RequestUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  sessionId: string;
  email: string | null;
  staffRegistrationId: string | null;
  staffId: string | null;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
  staffProfile: StaffProfileDto | null;
  permissions: Permission[];
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export interface AuthenticateOptions {
  allowPendingPasswordChange?: boolean;
}

async function recordAccessDeniedAudit(
  req: Request,
  userId: string | null,
  reason: string,
  requiredCapability?: string,
): Promise<void> {
  const auditRepo = AppDataSource.getRepository(AuditLog);
  const ip = req.ip || req.socket.remoteAddress || null;

  await auditRepo.save(
    auditRepo.create({
      userId,
      action: 'USER_ACCESS_DENIED',
      entityName: 'RouteAccess',
      entityId: userId,
      ipAddress: ip,
      details: {
        requestId: req.id || null,
        method: req.method,
        path: req.originalUrl,
        reason,
        ...(requiredCapability ? { requiredCapability } : {}),
      },
    }),
  );
}

/**
 * Factory creating authentication middleware.
 * By default rejects accounts with pending mandatory password change unless opted in.
 */
export function createAuthenticateMiddleware(options: AuthenticateOptions = {}) {
  return async function authenticateMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(
        new UnauthorizedError('Missing or malformed Authorization header', 'AUTH_HEADER_MISSING'),
      );
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return next(new UnauthorizedError('Bearer token value is missing', 'TOKEN_MISSING'));
    }

    try {
      const payload = verifyAccessToken(token);

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { id: payload.sub },
        relations: ['role', 'staffProfile'],
      });

      if (!user) {
        return next(new UnauthorizedError('User account not found', 'USER_NOT_FOUND'));
      }

      if (!user.isActive) {
        return next(new UnauthorizedError('User account is deactivated', 'USER_DEACTIVATED'));
      }

      if (!(await isAccessSessionActive(payload.sessionId))) {
        return next(
          new UnauthorizedError('Session is invalid or has been terminated', 'SESSION_REVOKED'),
        );
      }

      const roleName = user.role.name as UserRole;
      const effectivePermissions = user.mustChangePassword
        ? [Permission.USERS_CHANGE_PASSWORD]
        : ROLE_PERMISSIONS[roleName] || [];

      const staffProfileDto = toStaffProfileDto(user.staffProfile);

      req.user = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: roleName,
        sessionId: payload.sessionId,
        email: user.email,
        staffRegistrationId: user.staffProfile?.professionalRegistrationNumber ?? null,
        staffId: user.staffProfile?.staffId ?? null,
        mustChangePassword: user.mustChangePassword,
        passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.toISOString() : null,
        staffProfile: staffProfileDto,
        permissions: effectivePermissions,
      };

      // Server-enforced forced password change gate
      if (user.mustChangePassword && !options.allowPendingPasswordChange) {
        await recordAccessDeniedAudit(
          req,
          user.id,
          'Mandatory password change pending',
          'PASSWORD_CHANGE_COMPLETED',
        );
        return next(
          new ForbiddenError(
            'Password change required before accessing hospital modules.',
            'PASSWORD_CHANGE_REQUIRED',
          ),
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Standard authentication middleware: rejects unauthenticated, inactive, revoked,
 * or must-change-password accounts.
 */
export const authenticate = createAuthenticateMiddleware({ allowPendingPasswordChange: false });

/**
 * Authentication middleware permitting accounts in pending password-change state
 * (strictly restricted to /auth/me and /auth/change-password).
 */
export const authenticateAllowPendingPasswordChange = createAuthenticateMiddleware({
  allowPendingPasswordChange: true,
});

/**
 * Middleware factory that enforces role membership and records USER_ACCESS_DENIED audits.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(
        new UnauthorizedError('Authentication required before checking role', 'UNAUTHENTICATED'),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      try {
        await recordAccessDeniedAudit(
          req,
          req.user.id,
          `Role '${req.user.role}' is not authorized`,
          allowedRoles.join(','),
        );
      } catch (auditErr) {
        return next(auditErr);
      }

      return next(
        new ForbiddenError(
          `Access denied. Role '${req.user.role}' lacks permission for this resource.`,
          'ROLE_NOT_AUTHORIZED',
        ),
      );
    }

    next();
  };
}

/**
 * Middleware factory that enforces at least one specified permission grant and records USER_ACCESS_DENIED audits.
 */
export function requireAnyPermission(requiredPermissions: Permission[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(
        new UnauthorizedError(
          'Authentication required before checking permission',
          'UNAUTHENTICATED',
        ),
      );
    }

    const hasAny = requiredPermissions.some((perm) => req.user!.permissions.includes(perm));
    if (!hasAny) {
      const capLabel = requiredPermissions.join(' | ');
      try {
        await recordAccessDeniedAudit(
          req,
          req.user.id,
          `Missing permission '${capLabel}'`,
          capLabel,
        );
      } catch (auditErr) {
        return next(auditErr);
      }

      return next(
        new ForbiddenError(
          `Access denied. Missing required permission: '${capLabel}'`,
          'PERMISSION_DENIED',
        ),
      );
    }

    next();
  };
}

/**
 * Middleware factory that enforces a single permission grant and records USER_ACCESS_DENIED audits.
 */
export function requirePermission(requiredPermission: Permission) {
  return requireAnyPermission([requiredPermission]);
}
