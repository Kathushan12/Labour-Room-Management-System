import crypto from 'crypto';
import { AppDataSource } from '../config/database.js';
import { RefreshSession, AuditLog } from '../database/entities/index.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../common/errors/auth.errors.js';
import { logger } from '../common/logging/logger.js';

export interface SessionResult {
  session: RefreshSession;
  rawRefreshToken: string;
}

/**
 * Hashes an opaque refresh token using SHA-256 for secure database storage.
 */
export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generates an opaque cryptographically secure 256-bit (32 bytes) hex refresh token.
 */
export function generateRawRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a new refresh session and token family for a user.
 */
export async function createSession(userId: string, familyId?: string): Promise<SessionResult> {
  const sessionRepo = AppDataSource.getRepository(RefreshSession);

  const rawRefreshToken = generateRawRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const actualFamilyId = familyId || crypto.randomUUID();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRATION_DAYS);

  const session = sessionRepo.create({
    userId,
    tokenHash,
    familyId: actualFamilyId,
    isRevoked: false,
    expiresAt,
  });

  await sessionRepo.save(session);

  return { session, rawRefreshToken };
}

/**
 * Rotates an existing refresh token with atomic pessimistic locking and reuse detection.
 * If a revoked token is presented, the entire token family is revoked immediately to prevent replay attacks.
 */
export async function rotateSession(
  rawRefreshToken: string,
  ipAddress?: string,
): Promise<SessionResult> {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    throw new UnauthorizedError('Invalid refresh token provided', 'INVALID_REFRESH_TOKEN');
  }

  const incomingHash = hashRefreshToken(rawRefreshToken);

  const transactionResult = await AppDataSource.transaction(async (transactionManager) => {
    // 1. Lock and fetch the session record
    const session = await transactionManager.findOne(RefreshSession, {
      where: { tokenHash: incomingHash },
      lock: { mode: 'pessimistic_write' },
    });

    if (!session) {
      return { kind: 'NOT_FOUND' as const };
    }

    // 2. Reuse Detection: If already revoked, malicious replay is suspected
    if (session.isRevoked) {
      logger.warn(
        {
          sessionId: session.id,
          familyId: session.familyId,
          userId: session.userId,
          ip: ipAddress,
        },
        'CRITICAL: Refresh token reuse detected! Invalidating complete token family.',
      );

      // Invalidate all sessions in this family
      await transactionManager
        .createQueryBuilder()
        .update(RefreshSession)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
        })
        .where('family_id = :familyId', { familyId: session.familyId })
        .execute();

      // Record high-priority security audit log
      const auditLog = transactionManager.create(AuditLog, {
        userId: session.userId,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        entityName: 'RefreshSession',
        entityId: session.id,
        ipAddress: ipAddress || null,
        details: {
          familyId: session.familyId,
          securityIncident: 'Replay attempt on previously rotated or revoked refresh token',
        },
      });
      await transactionManager.save(auditLog);

      return { kind: 'REUSE_DETECTED' as const, session };
    }

    // 3. Expiration Check
    if (new Date() > session.expiresAt) {
      session.isRevoked = true;
      session.revokedAt = new Date();
      await transactionManager.save(session);
      return { kind: 'EXPIRED' as const };
    }

    // 4. Issue new token and session in the same family
    const newRawToken = generateRawRefreshToken();
    const newHash = hashRefreshToken(newRawToken);

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + env.JWT_REFRESH_EXPIRATION_DAYS);

    const newSession = transactionManager.create(RefreshSession, {
      userId: session.userId,
      tokenHash: newHash,
      familyId: session.familyId,
      isRevoked: false,
      expiresAt: newExpiresAt,
    });

    await transactionManager.save(newSession);

    // 5. Invalidate old session and link replacement
    session.isRevoked = true;
    session.revokedAt = new Date();
    session.replacedBySessionId = newSession.id;
    await transactionManager.save(session);

    return {
      kind: 'SUCCESS' as const,
      session: newSession,
      rawRefreshToken: newRawToken,
    };
  });

  if (transactionResult.kind === 'NOT_FOUND') {
    throw new UnauthorizedError('Refresh token not found', 'INVALID_REFRESH_TOKEN');
  }

  if (transactionResult.kind === 'REUSE_DETECTED') {
    throw new UnauthorizedError(
      'Refresh token reuse detected. All active sessions in this family have been terminated.',
      'REFRESH_TOKEN_REUSE_DETECTED',
    );
  }

  if (transactionResult.kind === 'EXPIRED') {
    throw new UnauthorizedError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
  }

  return {
    session: transactionResult.session,
    rawRefreshToken: transactionResult.rawRefreshToken,
  };
}

/**
 * Revokes a single session by its ID.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const sessionRepo = AppDataSource.getRepository(RefreshSession);
  await sessionRepo.update({ id: sessionId }, { isRevoked: true, revokedAt: new Date() });
}

/**
 * Revokes all sessions belonging to a specific family ID.
 */
export async function revokeFamily(familyId: string): Promise<void> {
  const sessionRepo = AppDataSource.getRepository(RefreshSession);
  await sessionRepo.update({ familyId }, { isRevoked: true, revokedAt: new Date() });
}

/**
 * Revokes all sessions belonging to a specific user ID.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const sessionRepo = AppDataSource.getRepository(RefreshSession);
  await sessionRepo.update({ userId }, { isRevoked: true, revokedAt: new Date() });
}
