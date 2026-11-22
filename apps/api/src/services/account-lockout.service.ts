import { AppDataSource } from '../config/database.js';
import { User } from '../database/entities/index.js';

// REQ-1.4: lock the account for 15 minutes after 5 consecutive failed logins.
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export interface FailedLoginOutcome {
  locked: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

export function getLockoutRemainingSeconds(user: Pick<User, 'lockedUntil'>): number {
  if (!user.lockedUntil) return 0;
  const remainingMs = user.lockedUntil.getTime() - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export function formatLockoutMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Account locked after ${MAX_FAILED_LOGIN_ATTEMPTS} failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

/**
 * Counts a failed password for an existing account. Stored in the database so a lock
 * survives API restarts and applies across instances.
 */
export async function registerFailedLogin(userId: string): Promise<FailedLoginOutcome> {
  const userRepo = AppDataSource.getRepository(User);

  await userRepo
    .createQueryBuilder()
    .update(User)
    .set({ failedLoginAttempts: () => 'failed_login_attempts + 1' })
    .where('id = :id', { id: userId })
    .execute();

  const current = await userRepo.findOne({
    where: { id: userId },
    select: { id: true, failedLoginAttempts: true },
  });
  const attempts = current?.failedLoginAttempts ?? 0;

  if (attempts < MAX_FAILED_LOGIN_ATTEMPTS) {
    return {
      locked: false,
      remainingAttempts: MAX_FAILED_LOGIN_ATTEMPTS - attempts,
      retryAfterSeconds: 0,
    };
  }

  const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
  await userRepo.update({ id: userId }, { failedLoginAttempts: 0, lockedUntil });

  return { locked: true, remainingAttempts: 0, retryAfterSeconds: LOCKOUT_MINUTES * 60 };
}

export async function clearFailedLogins(
  user: Pick<User, 'id' | 'failedLoginAttempts' | 'lockedUntil'>,
): Promise<void> {
  if (user.failedLoginAttempts === 0 && !user.lockedUntil) return;
  await AppDataSource.getRepository(User).update(
    { id: user.id },
    { failedLoginAttempts: 0, lockedUntil: null },
  );
}
