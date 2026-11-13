import { Request, Response, NextFunction } from 'express';
import { verifyCsrfToken } from '../crypto/csrf.service.js';
import { env } from '../../config/env.js';

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP methods do not require CSRF verification
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Origin / Referer validation if present
  const origin = req.headers.origin || req.headers.referer;
  if (origin && !origin.startsWith(env.WEB_ORIGIN)) {
    // In dev / test we permit localhost if origin matches
    const originUrl = new URL(origin);
    const configuredUrl = new URL(env.WEB_ORIGIN);
    if (originUrl.host !== configuredUrl.host) {
      res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_ORIGIN_MISMATCH',
          message: 'Origin header does not match configured application origin',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  const headerToken = req.headers['x-csrf-token'] as string | undefined;
  const cookieToken = req.cookies?.['lrms_csrf'] as string | undefined;

  if (!headerToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'Missing required X-CSRF-Token header',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // If cookie exists, header must match cookie (Double-Submit Pattern)
  if (cookieToken && headerToken !== cookieToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'CSRF token mismatch between header and cookie',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Verify HMAC signature
  if (!verifyCsrfToken(headerToken)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_CSRF_TOKEN',
        message: 'Invalid or forged CSRF token',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
