import { AppError } from '../middleware/error-handler.js';

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;
  code: string;

  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = code;
  }
}

export class ForbiddenError extends Error implements AppError {
  statusCode = 403;
  code: string;

  constructor(message = 'Access forbidden', code = 'FORBIDDEN') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = code;
  }
}

export class AccountLockedError extends Error implements AppError {
  statusCode = 423;
  code = 'ACCOUNT_LOCKED';
  details: { retryAfterSeconds: number };

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'AccountLockedError';
    this.details = { retryAfterSeconds };
  }
}

export class BadRequestError extends Error implements AppError {
  statusCode = 400;
  code: string;
  details?: unknown;

  constructor(message = 'Invalid request', code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = 'BadRequestError';
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code: string;

  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code: string;
  details?: unknown;

  constructor(message = 'Conflict detected', code = 'CONFLICT', details?: unknown) {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
    this.details = details;
  }
}
