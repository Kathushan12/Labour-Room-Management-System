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

export interface RotationResult {
  session: RefreshSession;
  /** Null when a concurrent refresh already rotated the token; the cookie must be left as is. */
  rawRefreshToken: string | null;
}

export interface SessionWindow {
  sessionStartedAt: Date;
  expiresAt: Date;
}

const MINUTE_MS = 60 * 1000;

// A rotated token presented again within this window is a concurrent refresh from another
// tab or a retried request, not a replay, so it gets the current session instead of revocation.
export const REFRESH_REUSE_GRACE_MS = 30 * 1000;

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

export function getAbsoluteExpiry(sessionStartedAt: Date): Date {
  return new Date(sessionStartedAt.getTime() + env.SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * MINUTE_MS);
}

/**
 * Each refresh extends the idle deadline (REQ-1.5: 60 min) but never past the absolute
 * limit measured from login (REQ-1.5: 12 h).
 */
export function buildSessionWindow(sessionStartedAt: Date = new Date()): SessionWindow {
  const idleExpiry = Date.now() + env.SESSION_IDLE_TIMEOUT_MINUTES * MINUTE_MS;
  const absoluteExpiry = getAbsoluteExpiry(sessionStartedAt).getTime();
  return { sessionStartedAt, expiresAt: new Date(Math.min(idleExpiry, absoluteExpiry)) };
}

/** Refresh cookie lives until the absolute limit; the idle limit is enforced server-side. */
export function getRefreshCookieMaxAgeMs(session: RefreshSession): number {
  return Math.max(getAbsoluteExpiry(session.sessionStartedAt).getTime() - Date.now(), 1000);
}

/**
 * Creates a new refresh session and token family for a user.
 */
export async function createSession(userId: string, familyId?: string): Promise<SessionResult> {
  const sessionRepo = AppDataSource.getRepository(RefreshSession);

  const rawRefreshToken = generateRawRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const actualFamilyId = familyId || crypto.randomUUID();

  const session = sessionRepo.create({
    userId,
    tokenHash,
    familyId: actualFamilyId,
    isRevoked: false,
    ...buildSessionWindow(),
  });

  await sessionRepo.save(session);

  return { session, rawRefreshToken };
}

/**
 * Rotates an existing refresh token with atomic pessimistic locking and reuse detection.
 * A rotated token replayed after the grace window revokes the whole token family.
 */
export async function rotateSession(
  rawRefreshToken: string,
  ipAddress?: string,
): Promise<RotationResult> {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    throw new UnauthorizedError('Invalid refresh token provided', 'INVALID_REFRESH_TOKEN');
  }

  const incomingHash = hashRefreshToken(rawRefreshToken);

  const transactionResult = await AppDataSource.transaction(async (transactionManager) => {
    const session = await transactionManager.findOne(RefreshSession, {
      where: { tokenHash: incomingHash },
      lock: { mode: 'pessimistic_write' },
    });

    if (!session) {
      return { kind: 'NOT_FOUND' as const };
    }

    const now = new Date();

    if (session.isRevoked) {
      // Logout, password change or admin revocation: the session simply ended.
      if (!session.replacedBySessionId) {
        return { kind: 'REVOKED' as const };
      }

      const rotatedAgoMs = now.getTime() - (session.revokedAt ?? now).getTime();
      if (rotatedAgoMs <= REFRESH_REUSE_GRACE_MS) {
        const current = await transactionManager.findOne(RefreshSession, {
          where: { familyId: session.familyId, isRevoked: false },
          order: { createdAt: 'DESC' },
        });
        if (current && current.expiresAt > now) {
          return { kind: 'GRACE' as const, session: current };
        }
        return { kind: 'REVOKED' as const };
      }

      logger.warn(
        {
          sessionId: session.id,
          familyId: session.familyId,
          userId: session.userId,
          ip: ipAddress,
        },
        'CRITICAL: Refresh token reuse detected! Invalidating complete token family.',
      );

      await transactionManager
        .createQueryBuilder()
        .update(RefreshSession)
        .set({ isRevoked: true, revokedAt: now })
        .where('family_id = :familyId AND is_revoked = false', { familyId: session.familyId })
        .execute();

      const auditLog = transactionManager.create(AuditLog, {
        userId: session.userId,
        action: 'REFRESH_TOKEN_REUSE_DETECTED',
        entityName: 'RefreshSession',
        entityId: session.id,
        ipAddress: ipAddress || null,
        details: {
          familyId: session.familyId,
          securityIncident: 'Replay attempt on previously rotated refresh token',
        },
      });
      await transactionManager.save(auditLog);

      return { kind: 'REUSE_DETECTED' as const };
    }

    const absoluteReached = now >= getAbsoluteExpiry(session.sessionStartedAt);
    if (absoluteReached || now > session.expiresAt) {
      session.isRevoked = true;
      session.revokedAt = now;
      await transactionManager.save(session);
      return { kind: absoluteReached ? ('ABSOLUTE_TIMEOUT' as const) : ('IDLE_TIMEOUT' as const) };
    }

    const newRawToken = generateRawRefreshToken();
    const newSession = transactionManager.create(RefreshSession, {
      userId: session.userId,
      tokenHash: hashRefreshToken(newRawToken),
      familyId: session.familyId,
      isRevoked: false,
      ...buildSessionWindow(session.sessionStartedAt),
    });

    await transactionManager.save(newSession);

    session.isRevoked = true;
    session.revokedAt = now;
    session.replacedBySessionId = newSession.id;
    await transactionManager.save(session);

    return {
      kind: 'SUCCESS' as const,
      session: newSession,
      rawRefreshToken: newRawToken,
    };
  });

  switch (transactionResult.kind) {
    case 'NOT_FOUND':
      throw new UnauthorizedError('Refresh token not found', 'INVALID_REFRESH_TOKEN');
    case 'REVOKED':
      throw new UnauthorizedError('This session has been signed out', 'SESSION_REVOKED');
    case 'REUSE_DETECTED':
      throw new UnauthorizedError(
        'Refresh token reuse detected. All active sessions in this family have been terminated.',
        'REFRESH_TOKEN_REUSE_DETECTED',
      );
    case 'IDLE_TIMEOUT':
      throw new UnauthorizedError(
        `Signed out after ${env.SESSION_IDLE_TIMEOUT_MINUTES} minutes of inactivity`,
        'SESSION_IDLE_TIMEOUT',
      );
    case 'ABSOLUTE_TIMEOUT':
      throw new UnauthorizedError(
        `Your ${env.SESSION_ABSOLUTE_TIMEOUT_HOURS}-hour session has ended`,
        'SESSION_ABSOLUTE_TIMEOUT',
      );
    case 'GRACE':
      return { session: transactionResult.session, rawRefreshToken: null };
    case 'SUCCESS':
      return {
        session: transactionResult.session,
        rawRefreshToken: transactionResult.rawRefreshToken,
      };
  }
}

/**
 * Whether an access token bound to this session row may still be used. Rotation revokes the
 * row but keeps the family alive, so tokens issued before another tab refreshed stay valid
 * until they expire; logout, reuse detection and timeouts end the whole family.
 */
export async function isAccessSessionActive(sessionId: string): Promise<boolean> {
  const sessionRepo = AppDataSource.getRepository(RefreshSession);
  const session = await sessionRepo.findOne({ where: { id: sessionId } });
  if (!session) return false;

  const now = new Date();
  if (!session.isRevoked) return session.expiresAt > now;
  if (!session.replacedBySessionId) return false;

  const activeCount = await sessionRepo
    .createQueryBuilder('s')
    .where('s.family_id = :familyId', { familyId: session.familyId })
    .andWhere('s.is_revoked = false')
    .andWhere('s.expires_at > :now', { now })
    .getCount();
  return activeCount > 0;
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
  await sessionRepo.update(
    { familyId, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() },
  );
}

/**
 * Revokes all sessions belonging to a specific user ID.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const sessionRepo = AppDataSource.getRepository(RefreshSession);
  await sessionRepo.update({ userId }, { isRevoked: true, revokedAt: new Date() });
}
