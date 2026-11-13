import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private ipRecords = new Map<string, RateLimitRecord>();
  private userRecords = new Map<string, RateLimitRecord>();

  // Cleanup expired entries periodically (every 5 minutes)
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
    for (const [key, record] of this.userRecords.entries()) {
      if (now > record.resetAt) {
        this.userRecords.delete(key);
      }
    }
  }

  public recordFailedAttempt(ip: string, username?: string, windowMs = 15 * 60 * 1000): void {
    const now = Date.now();

    // Record IP
    const ipRec = this.ipRecords.get(ip);
    if (!ipRec || now > ipRec.resetAt) {
      this.ipRecords.set(ip, { attempts: 1, resetAt: now + windowMs });
    } else {
      ipRec.attempts += 1;
    }

    // Record Username if present
    if (username) {
      const normalizedUser = username.toLowerCase().trim();
      const userRec = this.userRecords.get(normalizedUser);
      if (!userRec || now > userRec.resetAt) {
        this.userRecords.set(normalizedUser, { attempts: 1, resetAt: now + windowMs });
      } else {
        userRec.attempts += 1;
      }
    }
  }

  public resetUser(username: string): void {
    this.userRecords.delete(username.toLowerCase().trim());
  }

  public checkLimit(
    ip: string,
    username?: string,
    maxIpAttempts = 20,
    maxUserAttempts = 5,
  ): { limited: boolean; retryAfterSeconds?: number; reason?: string } {
    const now = Date.now();

    // Check IP
    const ipRec = this.ipRecords.get(ip);
    if (ipRec && now < ipRec.resetAt && ipRec.attempts >= maxIpAttempts) {
      const retryAfterSeconds = Math.ceil((ipRec.resetAt - now) / 1000);
      return {
        limited: true,
        retryAfterSeconds,
        reason: 'Too many requests from this IP address. Please try again later.',
      };
    }

    // Check Username
    if (username) {
      const userRec = this.userRecords.get(username.toLowerCase().trim());
      if (userRec && now < userRec.resetAt && userRec.attempts >= maxUserAttempts) {
        const retryAfterSeconds = Math.ceil((userRec.resetAt - now) / 1000);
        return {
          limited: true,
          retryAfterSeconds,
          reason: 'Too many failed login attempts for this account. Please try again later.',
        };
      }
    }

    return { limited: false };
  }

  public clearAll(): void {
    this.ipRecords.clear();
    this.userRecords.clear();
  }
}

export const authRateLimiter = new InMemoryRateLimiter();

/**
 * Express middleware to enforce auth rate limiting before handling login requests.
 */
export function loginRateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const username = req.body?.username;

  const result = authRateLimiter.checkLimit(ip, username);
  if (result.limited) {
    res.setHeader('Retry-After', result.retryAfterSeconds?.toString() || '60');
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: result.reason || 'Too many requests. Please try again later.',
        details: { retryAfterSeconds: result.retryAfterSeconds },
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
