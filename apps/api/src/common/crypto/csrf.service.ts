import crypto from 'crypto';
import { env } from '../../config/env.js';

/**
 * Generates an HMAC-signed CSRF token using Double-Submit Cookie pattern.
 */
export function generateCsrfToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', env.CSRF_SECRET).update(token).digest('hex');
  return `${token}.${signature}`;
}

/**
 * Validates the HMAC signature of a CSRF token.
 */
export function verifyCsrfToken(csrfToken: string): boolean {
  if (!csrfToken || typeof csrfToken !== 'string') {
    return false;
  }

  const parts = csrfToken.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [token, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', env.CSRF_SECRET)
    .update(token)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedSigBuffer = Buffer.from(expectedSignature, 'utf8');

  if (sigBuffer.length !== expectedSigBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedSigBuffer);
}
