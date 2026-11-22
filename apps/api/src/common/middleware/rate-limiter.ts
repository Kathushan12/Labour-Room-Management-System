import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';

interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000;

/**
 * Per-IP throttle on failed logins. Per-account lockout (REQ-1.4) is persisted on the user
 * row instead, so it survives restarts; losing this in-memory throttle on restart is harmless.
 */
class InMemoryRateLimiter {
  private ipRecords = new Map<string, RateLimitRecord>();

  constructor() {
    setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    ).unref();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.ipRecords.entries()) {
      if (now > record.resetAt) {
        this.ipRecords.delete(key);
      }
    }
  }

  public recordFailedAttempt(ip: string): void {
    const now = Date.now();
    const ipRec = this.ipRecords.get(ip);
    if (!ipRec || now > ipRec.resetAt) {
      this.ipRecords.set(ip, { attempts: 1, resetAt: now + WINDOW_MS });
    } else {
      ipRec.attempts += 1;
    }
  }

  public checkLimit(
    ip: string,
    maxIpAttempts = env.LOGIN_IP_MAX_FAILED_ATTEMPTS,
  ): { limited: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const ipRec = this.ipRecords.get(ip);
    if (ipRec && now < ipRec.resetAt && ipRec.attempts >= maxIpAttempts) {
      return { limited: true, retryAfterSeconds: Math.ceil((ipRec.resetAt - now) / 1000) };
    }
    return { limited: false };
  }

  public clearAll(): void {
    this.ipRecords.clear();
  }
}

export const authRateLimiter = new InMemoryRateLimiter();

/**
 * Express middleware to enforce auth rate limiting before handling login requests.
 */
export function loginRateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const result = authRateLimiter.checkLimit(ip);
  if (result.limited) {
    const retryAfterSeconds = result.retryAfterSeconds ?? 60;
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: `Too many failed sign-in attempts from this device. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        details: { retryAfterSeconds },
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
