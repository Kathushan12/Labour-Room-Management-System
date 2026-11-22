import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger.js';
import { ApiResponse } from '@lrms/shared';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isZod = err.name === 'ZodError';
  const statusCode = isZod ? 400 : err.statusCode || 500;
  // SEC-8: unexpected errors (including database errors) never reach the user verbatim.
  const isInternal = statusCode >= 500;
  let errorCode = isInternal ? 'INTERNAL_SERVER_ERROR' : err.code || 'REQUEST_FAILED';
  let message = isInternal
    ? 'An unexpected error occurred. Please try again.'
    : err.message || 'Request failed';
  let details = isInternal ? undefined : err.details;

  if (isZod) {
    errorCode = 'VALIDATION_ERROR';
    const zodErr = err as unknown as { issues?: { message: string }[]; flatten: () => unknown };
    message = zodErr.issues?.[0]?.message ?? 'Validation failed';
    details = zodErr.flatten();
  }

  logger.error(
    {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorCode: err.code || errorCode,
      err: err.stack,
    },
    'Request failed with error',
  );

  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}
