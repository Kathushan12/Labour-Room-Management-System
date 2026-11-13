import jwt from 'jsonwebtoken';
import { UserRole } from '@lrms/shared';
import { env } from '../../config/env.js';
import { getPrivateKey, getPublicKey } from './key-manager.js';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export class JwtServiceError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'JwtServiceError';
  }
}

/**
 * Signs a short-lived RS256 JWT access token.
 */
export function signAccessToken(
  payload: Pick<AccessTokenPayload, 'sub' | 'username' | 'role' | 'sessionId'>,
): string {
  const privateKey = getPrivateKey();

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: env.JWT_ACCESS_EXPIRATION_SECONDS,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

/**
 * Verifies and decodes an RS256 JWT access token.
 * Strictly enforces RS256 algorithm to prevent algorithm confusion attacks.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const publicKey = getPublicKey();

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as AccessTokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new JwtServiceError('Access token has expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JwtServiceError(error.message, 'INVALID_TOKEN');
    }
    throw new JwtServiceError('Could not verify access token', 'TOKEN_VERIFICATION_FAILED');
  }
}
