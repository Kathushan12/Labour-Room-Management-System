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
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'Internal server error';

  if (err.name === 'ZodError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = err.message || 'Validation error';
  }

  logger.error(
    {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode,
      errorCode,
      err: err.stack,
    },
    'Request failed with error',
  );

  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}
