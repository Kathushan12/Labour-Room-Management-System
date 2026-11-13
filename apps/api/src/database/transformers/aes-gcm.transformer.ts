import { ValueTransformer } from 'typeorm';
import { encryptionService, DecryptionError } from '../../common/crypto/encryption.service.js';

export { DecryptionError };

/**
 * Single-column composite string ValueTransformer: <iv_hex>:<auth_tag_hex>:<ciphertext_base64>
 * Provided for compatibility where single-column encrypted text storage is utilized.
 * For primary PatientPii records, separate binary BYTEA columns are used directly.
 */
export class AesGcmTransformer implements ValueTransformer {
  public to(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const encrypted = encryptionService.encrypt(value);
    return `${encrypted.nonce.toString('hex')}:${encrypted.authTag.toString('hex')}:${encrypted.ciphertext.toString('base64')}`;
  }

  public from(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parts = value.split(':');
    if (parts.length !== 3) {
      throw new DecryptionError('Invalid encrypted format: expected nonce:authTag:ciphertext');
    }

    const [nonceHex, tagHex, ciphertextBase64] = parts;
    if (!nonceHex || !tagHex || !ciphertextBase64) {
      throw new DecryptionError('Encrypted payload is missing required components');
    }

    const nonce = Buffer.from(nonceHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');

    return encryptionService.decrypt({ ciphertext, nonce, authTag });
  }
}
