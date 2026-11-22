import { Socket } from 'socket.io';
import { verifyAccessToken } from '../../common/crypto/jwt.service.js';
import { AppDataSource } from '../../config/database.js';
import { User, AuditLog } from '../../database/entities/index.js';
import { isAccessSessionActive } from '../../services/session.service.js';
import { UserRole, Permission, ROLE_PERMISSIONS } from '@lrms/shared';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { toStaffProfileDto } from '../users/user.dto.js';
import { logger } from '../../common/logging/logger.js';

export async function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Check socket.handshake.auth.token
    // The web client sends "Bearer <jwt>", so strip the optional scheme prefix.
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      token = authToken.trim().replace(/^Bearer\s+/i, '');
    }

    // 2. Check Authorization header
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    // 3. Check cookies in handshake headers
    if (!token && socket.handshake.headers?.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [k, v] = cookie.trim().split('=');
        if (k === 'access_token' || k === 'token') {
          token = decodeURIComponent(v);
          break;
        }
      }
    }

    if (!token) {
      await logSocketAuthAudit(
        socket,
        null,
        'SOCKET_CONNECTION_REJECTED',
        'Missing authentication credentials',
      );
      return next(
        new Error('UNAUTHORIZED: Authentication credentials required for WebSocket connection'),
      );
    }

    // Verify token
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      await logSocketAuthAudit(
        socket,
        null,
        'SOCKET_CONNECTION_REJECTED',
        'Invalid or expired access token',
      );
      return next(new Error('UNAUTHORIZED: Invalid or expired access token'));
    }

    // Verify user in database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: payload.sub },
      relations: ['role', 'staffProfile'],
    });

    if (!user) {
      await logSocketAuthAudit(
        socket,
        payload.sub,
        'SOCKET_CONNECTION_REJECTED',
        'User account not found',
      );
      return next(new Error('UNAUTHORIZED: User account not found'));
    }

    if (!user.isActive) {
      await logSocketAuthAudit(
        socket,
        user.id,
        'SOCKET_CONNECTION_REJECTED',
        'User account is deactivated',
      );
      return next(new Error('UNAUTHORIZED: User account is deactivated'));
    }

    // Verify session in database (revocation check)
    if (!(await isAccessSessionActive(payload.sessionId))) {
      await logSocketAuthAudit(
        socket,
        user.id,
        'SOCKET_CONNECTION_REJECTED',
        'Session has been revoked or expired',
      );
      return next(new Error('UNAUTHORIZED: Session has been revoked or terminated'));
    }

    const roleName = user.role.name as UserRole;
    const permissions = user.mustChangePassword
      ? [Permission.USERS_CHANGE_PASSWORD]
      : ROLE_PERMISSIONS[roleName] || [];

    const requestUser: RequestUser = {
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
      staffProfile: toStaffProfileDto(user.staffProfile),
      permissions,
    };

    // Attach authenticated user to socket instance
    socket.data.user = requestUser;

    await logSocketAuthAudit(
      socket,
      user.id,
      'SOCKET_CONNECTION_ESTABLISHED',
      'Socket authenticated successfully',
    );
    next();
  } catch (err) {
    logger.error({ service: 'socket-auth', err }, 'Socket authentication error');
    return next(new Error('INTERNAL_ERROR: Socket authentication failed'));
  }
}

async function logSocketAuthAudit(
  socket: Socket,
  userId: string | null,
  action: string,
  reason: string,
): Promise<void> {
  try {
    const auditRepo = AppDataSource.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        userId,
        action,
        entityName: 'SocketConnection',
        entityId: socket.id,
        ipAddress: socket.handshake.address || null,
        details: {
          socketId: socket.id,
          reason,
          headers: {
            origin: socket.handshake.headers?.origin,
            userAgent: socket.handshake.headers?.['user-agent'],
          },
        },
      }),
    );
  } catch {
    // Non-blocking audit logger
  }
}
