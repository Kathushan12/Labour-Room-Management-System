import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './common/logging/logger.js';
import { requestIdMiddleware } from './common/middleware/request-id.js';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { patientRouter } from './modules/patients/patient.routes.js';
import { admissionRouter } from './modules/admissions/admission.routes.js';
import { wardRouter } from './modules/wards/ward.routes.js';
import { bedRouter } from './modules/beds/bed.routes.js';
import { bedAllocationRouter } from './modules/bed-allocations/bed-allocation.routes.js';
import { patientAssignmentRouter } from './modules/patient-assignments/patient-assignment.routes.js';

export function createApp(): Express {
  const app = express();

  // Basic security headers
  app.use(helmet());

  // Strict CORS in development / production
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token'],
    }),
  );

  // Cookie parsing
  app.use(cookieParser());

  // Request parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request ID tracing
  app.use(requestIdMiddleware);

  // Structured HTTP logging
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id || 'unknown',
      autoLogging: {
        ignore: (req) => req.url?.includes('/health/live'), // Don't spam logs with liveness checks
      },
    }),
  );

  // API v1 Routes
  const apiV1Router = express.Router();
  apiV1Router.use('/health', healthRouter);
  apiV1Router.use('/auth', authRouter);
  apiV1Router.use('/users', userRouter);
  apiV1Router.use('/patients', patientRouter);
  apiV1Router.use('/admissions', admissionRouter);
  apiV1Router.use('/wards', wardRouter);
  apiV1Router.use('/beds', bedRouter);
  apiV1Router.use('/bed-allocations', bedAllocationRouter);
  apiV1Router.use('/patient-assignments', patientAssignmentRouter);

  app.use('/api/v1', apiV1Router);

  // Catch-all 404 handler
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}
