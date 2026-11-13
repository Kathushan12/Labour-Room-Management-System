import crypto from 'crypto';
import { env } from '../../config/env.js';

export type BlindIndexFieldType = 'nic' | 'phone';

export class BlindIndexService {
  private readonly hmacKey: Buffer;

  constructor(secretKey?: string) {
    const rawKey = secretKey || env.LRMS_HMAC_KEY || env.LRMS_BLIND_INDEX_SALT;
    if (!rawKey || rawKey.length < 32) {
      throw new Error(
        'HMAC secret key must provide at least 32 characters of high-entropy key material.',
      );
    }
    this.hmacKey = Buffer.from(rawKey, 'utf8');
  }

  /**
   * Field-specific normalization.
   * - NIC: Trims whitespace and converts to uppercase (standard Sri Lankan NIC format: 9 digits + V/X or 12 digits).
   * - Phone: Strips all non-digit characters to produce clean digit sequence.
   */
  public normalize(value: string, fieldType: BlindIndexFieldType): string {
    const trimmed = value.trim();
    if (fieldType === 'nic') {
      return trimmed.toUpperCase();
    }
    if (fieldType === 'phone') {
      return trimmed.replace(/\D/g, '');
    }
    return trimmed;
  }

  /**
   * Computes an HMAC-SHA256 blind index as a 32-byte binary Buffer for BYTEA storage.
   */
  public computeBlindIndex(
    value: string | null | undefined,
    fieldType: BlindIndexFieldType,
  ): Buffer | null {
    if (value === null || value === undefined || value.trim() === '') {
      return null;
    }

    const normalized = this.normalize(value, fieldType);
    const hmac = crypto.createHmac('sha256', this.hmacKey);
    hmac.update(normalized, 'utf8');
    return hmac.digest();
  }

  /**
   * Computes blind index as a hexadecimal string (for query comparisons or string representations).
   */
  public computeBlindIndexHex(
    value: string | null | undefined,
    fieldType: BlindIndexFieldType,
  ): string | null {
    const buf = this.computeBlindIndex(value, fieldType);
    return buf ? buf.toString('hex') : null;
  }
}

export const blindIndexService = new BlindIndexService();
