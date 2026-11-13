import { blindIndexService } from '../../common/crypto/blind-index.service.js';

/**
 * Computes deterministic HMAC-SHA256 blind index for searchable PII fields.
 * Returns hexadecimal string for text-based indexes or legacy lookups.
 */
export function computeBlindIndex(
  value: string | null | undefined,
  _saltOrKey?: string,
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  // Default to fieldType 'nic' for general blind indexing
  return blindIndexService.computeBlindIndexHex(value, 'nic');
}
