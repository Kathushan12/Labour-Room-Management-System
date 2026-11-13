import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../../config/env.js';
import { logger } from '../logging/logger.js';

export interface RsaKeyPair {
  privateKey: string;
  publicKey: string;
}

let cachedKeys: RsaKeyPair | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveKeysDirectory(): string {
  // Search for .keys directory at project root or current working dir
  const candidatePaths = [
    path.resolve(process.cwd(), '.keys'),
    path.resolve(process.cwd(), '../../.keys'),
    path.resolve(__dirname, '../../../../.keys'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Default to repo root if run from apps/api, or cwd/.keys
  const rootDir = fs.existsSync(path.resolve(process.cwd(), '../../package.json'))
    ? path.resolve(process.cwd(), '../../.keys')
    : path.resolve(process.cwd(), '.keys');

  return rootDir;
}

/**
 * Loads or generates the 2048-bit RSA key pair used for RS256 JWT signing.
 */
export function getKeyPair(): RsaKeyPair {
  if (cachedKeys) {
    return cachedKeys;
  }

  // Check if keys are provided directly via environment variables
  if (env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY) {
    cachedKeys = {
      privateKey: env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      publicKey: env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
    };
    return cachedKeys;
  }

  const keysDir = resolveKeysDirectory();
  const privateKeyPath = path.join(keysDir, 'jwt-rsa-private.pem');
  const publicKeyPath = path.join(keysDir, 'jwt-rsa-public.pem');

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    cachedKeys = { privateKey, publicKey };
    return cachedKeys;
  }

  // Auto-generate 2048-bit RSA keypair in development/testing
  logger.info('Generating new 2048-bit RSA keypair for RS256 JWT signing...');
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
  fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

  cachedKeys = { privateKey, publicKey };
  return cachedKeys;
}

export function getPrivateKey(): string {
  return getKeyPair().privateKey;
}

export function getPublicKey(): string {
  return getKeyPair().publicKey;
}
