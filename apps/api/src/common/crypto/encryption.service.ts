import crypto from 'crypto';
import { env } from '../../config/env.js';

export interface EncryptedData {
  ciphertext: Buffer;
  nonce: Buffer;
  authTag: Buffer;
  keyVersion: string;
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

export class EncryptionService {
  private readonly defaultKey: Buffer;
  private readonly currentKeyVersion: string = 'v1';

  constructor(hexKey?: string, keyVersion = 'v1') {
    const rawKey = hexKey || env.LRMS_ENCRYPTION_KEY;
    if (!rawKey || rawKey.length !== 64) {
      throw new Error('Encryption key must be exactly 64 hexadecimal characters (32 bytes).');
    }
    this.defaultKey = Buffer.from(rawKey, 'hex');
    this.currentKeyVersion = keyVersion;
  }

  /**
   * Encrypts plaintext string using AES-256-GCM.
   * Generates a unique 12-byte random nonce and returns separate binary components.
   */
  public encrypt(plaintext: string, keyVersion = this.currentKeyVersion): EncryptedData {
    if (typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a string.');
    }

    // 12-byte random nonce per NIST SP 800-38D recommendation for GCM
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.defaultKey, nonce);

    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      nonce,
      authTag,
      keyVersion,
    };
  }

  /**
   * Decrypts binary data using AES-256-GCM.
   * Authenticates ciphertext and tag; throws DecryptionError on tampering or mismatch.
   */
  public decrypt(data: {
    ciphertext: Buffer;
    nonce: Buffer;
    authTag: Buffer;
    keyVersion?: string;
  }): string {
    if (!data.ciphertext || !data.nonce || !data.authTag) {
      throw new DecryptionError('Missing required components for authenticated decryption.');
    }

    if (data.nonce.length !== 12) {
      throw new DecryptionError(
        `Invalid nonce length: expected 12 bytes, got ${data.nonce.length}`,
      );
    }

    if (data.authTag.length !== 16) {
      throw new DecryptionError(
        `Invalid auth tag length: expected 16 bytes, got ${data.authTag.length}`,
      );
    }

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.defaultKey, data.nonce);
      decipher.setAuthTag(data.authTag);

      const decrypted = Buffer.concat([decipher.update(data.ciphertext), decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new DecryptionError(
        `Decryption authentication failed: data may have been tampered with or incorrect key used. (${(error as Error).message})`,
      );
    }
  }

  public getCurrentKeyVersion(): string {
    return this.currentKeyVersion;
  }
}

export const encryptionService = new EncryptionService();
