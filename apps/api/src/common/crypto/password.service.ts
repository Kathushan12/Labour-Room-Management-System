import crypto from 'crypto';
import argon2, { HashOptions } from 'argon2';

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz';
const NUMERIC_CHARS = '23456789';
const SPECIAL_CHARS = '!@#$%^&*-_=+?';
const ALL_CHARS = UPPERCASE_CHARS + LOWERCASE_CHARS + NUMERIC_CHARS + SPECIAL_CHARS;

export interface PasswordPolicyResult {
  valid: boolean;
  message?: string;
}

/**
 * OWASP-compliant Argon2id parameters:
 * Memory: 32 MiB (32768 KiB) >= OWASP min 19 MiB
 * Iterations: 3 >= OWASP min 2
 * Parallelism: 1 (threads)
 * Type: Argon2id (hybrid resistant to both side-channel and GPU cracking attacks)
 */
export const ARGON2_OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 32768,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
};

/**
 * Validates a plaintext password against the LRMS hospital security policy:
 * - Minimum 10 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one numeric digit
 * - At least one special symbol
 */
export function validatePasswordInput(password: string): PasswordPolicyResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < 10) {
    return { valid: false, message: 'Password must be at least 10 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password cannot exceed 128 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one numeric digit' };
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  const validation = validatePasswordInput(password);
  if (!validation.valid) {
    throw new Error(validation.message || 'Password does not meet complexity requirements');
  }

  return argon2.hash(password, { ...ARGON2_OPTIONS, raw: false });
}

/**
 * Securely verifies a plaintext password against a stored Argon2id hash.
 * Constant-time comparison handled internally by argon2 library.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }

  try {
    return await argon2.verify(hash, password);
  } catch {
    // Malformed hash or comparison error
    return false;
  }
}

/**
 * Checks if the existing hash needs to be recomputed because algorithm parameters were upgraded.
 */
export function needsRehash(hash: string): boolean {
  try {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  } catch {
    return true;
  }
}

/**
 * Generates a cryptographically random temporary password using crypto.randomInt
 * guaranteed to satisfy hospital password complexity rules.
 */
export function generateTemporaryPassword(length = 14): string {
  const effectiveLength = Math.max(length, 12);
  const chars: string[] = [
    UPPERCASE_CHARS[crypto.randomInt(UPPERCASE_CHARS.length)],
    LOWERCASE_CHARS[crypto.randomInt(LOWERCASE_CHARS.length)],
    NUMERIC_CHARS[crypto.randomInt(NUMERIC_CHARS.length)],
    SPECIAL_CHARS[crypto.randomInt(SPECIAL_CHARS.length)],
  ];

  while (chars.length < effectiveLength) {
    chars.push(ALL_CHARS[crypto.randomInt(ALL_CHARS.length)]);
  }

  // Fisher-Yates shuffle using cryptographically secure randomInt
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
