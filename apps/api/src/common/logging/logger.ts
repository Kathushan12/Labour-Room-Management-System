import pino from 'pino';
import { env } from '../../config/env.js';

export const PII_LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  'currentPassword',
  '*.currentPassword',
  'newPassword',
  '*.newPassword',
  'temporaryPassword',
  '*.temporaryPassword',
  'passwordHash',
  '*.passwordHash',
  'tokenHash',
  '*.tokenHash',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'csrfToken',
  '*.csrfToken',
  'nic',
  '*.nic',
  'req.body.nic',
  'fullName',
  '*.fullName',
  'req.body.fullName',
  'contactPhone',
  '*.contactPhone',
  'req.body.contactPhone',
  'optionalPii',
  '*.optionalPii',
  'req.body.optionalPii',
  'contactNumber',
  '*.contactNumber',
  'contact_number',
  '*.contact_number',
  'req.body.contactNumber',
  '*.staffProfile.contactNumber',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: PII_LOG_REDACT_PATHS,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});
