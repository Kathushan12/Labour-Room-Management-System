import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Look for .env in current directory or root directory
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
const localEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const DEV_DEFAULT_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const DEV_DEFAULT_HMAC_KEY = 'lrms_dev_hmac_secret_key_minimum_32_characters_long_for_security';
const DEV_DEFAULT_CSRF_SECRET = 'lrms_csrf_secret_key_minimum_32_characters_for_protection';

const baseEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z
      .string()
      .default('4000')
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
        message: 'PORT must be a valid port number (1-65535)',
      }),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine((val) => val.startsWith('postgres://') || val.startsWith('postgresql://'), {
        message: 'DATABASE_URL must be a valid PostgreSQL connection string',
      }),
    WEB_ORIGIN: z.string().default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    LRMS_ENCRYPTION_KEY: z
      .string()
      .length(64, 'LRMS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
      .regex(/^[0-9a-fA-F]+$/, 'LRMS_ENCRYPTION_KEY must contain valid hexadecimal characters')
      .default(DEV_DEFAULT_ENCRYPTION_KEY),
    LRMS_HMAC_KEY: z
      .string()
      .min(32, 'LRMS_HMAC_KEY must be at least 32 characters (minimum 256 bits of key material)')
      .default(DEV_DEFAULT_HMAC_KEY),
    LRMS_BLIND_INDEX_SALT: z.string().optional(),
    JWT_ACCESS_EXPIRATION_SECONDS: z
      .string()
      .default('900')
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'JWT_ACCESS_EXPIRATION_SECONDS must be a positive integer',
      }),
    JWT_REFRESH_EXPIRATION_DAYS: z
      .string()
      .default('7')
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'JWT_REFRESH_EXPIRATION_DAYS must be a positive integer',
      }),
    TEMP_PASSWORD_EXPIRATION_HOURS: z
      .string()
      .default('24')
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val >= 1 && val <= 168, {
        message: 'TEMP_PASSWORD_EXPIRATION_HOURS must be an integer between 1 and 168',
      }),
    JWT_ISSUER: z.string().default('lrms-api'),
    JWT_AUDIENCE: z.string().default('lrms-web'),
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_PUBLIC_KEY: z.string().optional(),
    CSRF_SECRET: z
      .string()
      .min(32, 'CSRF_SECRET must be at least 32 characters')
      .default(DEV_DEFAULT_CSRF_SECRET),
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Cookie Security enforcement in production
    if (data.NODE_ENV === 'production' && data.COOKIE_SECURE === 'false') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE cannot be disabled (false) when NODE_ENV is production',
      });
    }

    // 2. Reject development default secrets in production
    if (data.NODE_ENV === 'production') {
      if (data.LRMS_ENCRYPTION_KEY.toLowerCase() === DEV_DEFAULT_ENCRYPTION_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['LRMS_ENCRYPTION_KEY'],
          message: 'Production must not use the default development AES encryption key',
        });
      }
      if (data.LRMS_HMAC_KEY === DEV_DEFAULT_HMAC_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['LRMS_HMAC_KEY'],
          message: 'Production must not use the default development HMAC secret key',
        });
      }
      if (data.CSRF_SECRET === DEV_DEFAULT_CSRF_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CSRF_SECRET'],
          message: 'Production must not use the default development CSRF secret',
        });
      }
    }

    // 3. Enforce strict cryptographic secret separation across independent primitives
    const normalizedAesHex = data.LRMS_ENCRYPTION_KEY.toLowerCase();
    const aesBinaryUtf8 = Buffer.from(data.LRMS_ENCRYPTION_KEY, 'hex').toString('utf8');

    const secrets: Array<{ name: string; value: string; altValue?: string }> = [
      { name: 'LRMS_ENCRYPTION_KEY', value: normalizedAesHex, altValue: aesBinaryUtf8 },
      { name: 'LRMS_HMAC_KEY', value: data.LRMS_HMAC_KEY.trim() },
      { name: 'CSRF_SECRET', value: data.CSRF_SECRET.trim() },
    ];

    if (data.LRMS_BLIND_INDEX_SALT && data.LRMS_BLIND_INDEX_SALT.trim().length > 0) {
      secrets.push({
        name: 'LRMS_BLIND_INDEX_SALT',
        value: data.LRMS_BLIND_INDEX_SALT.trim(),
      });
    }

    if (data.JWT_PRIVATE_KEY && data.JWT_PRIVATE_KEY.trim().length > 0) {
      secrets.push({
        name: 'JWT_PRIVATE_KEY',
        value: data.JWT_PRIVATE_KEY.trim(),
      });
    }

    for (let i = 0; i < secrets.length; i++) {
      for (let j = i + 1; j < secrets.length; j++) {
        const a = secrets[i];
        const b = secrets[j];
        // Allow LRMS_HMAC_KEY and LRMS_BLIND_INDEX_SALT only if not cross-reused with AES/CSRF/JWT
        const isHmacAlias =
          (a.name === 'LRMS_HMAC_KEY' && b.name === 'LRMS_BLIND_INDEX_SALT') ||
          (b.name === 'LRMS_HMAC_KEY' && a.name === 'LRMS_BLIND_INDEX_SALT');
        if (isHmacAlias) continue;

        const sameDirect = a.value.toLowerCase() === b.value.toLowerCase();
        const sameAlt =
          (a.altValue && a.altValue === b.value) || (b.altValue && b.altValue === a.value);

        if (sameDirect || sameAlt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [b.name],
            message: `${b.name} must be strictly distinct from ${a.name} (secret reuse is prohibited)`,
          });
        }
      }
    }
  });

const envSchema = baseEnvSchema.transform((data) => ({
  ...data,
  // Always true in production regardless of raw COOKIE_SECURE input
  COOKIE_SECURE: data.NODE_ENV === 'production' ? true : data.COOKIE_SECURE === 'true',
}));

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: NodeJS.ProcessEnv = process.env): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error(`\n[FATAL] Invalid environment configuration:\n${errorDetails}\n`);
    throw new Error(`Environment validation failed:\n${errorDetails}`);
  }
  return result.data;
}

export const env = validateEnv();
