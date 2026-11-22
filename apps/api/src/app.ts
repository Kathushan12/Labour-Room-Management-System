import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { webOriginCors } from './common/web-origin.js';
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
import { clinicalObservationRoutes } from './modules/clinical-observations/clinical-observation.routes.js';
import { clinicalCareRoutes } from './modules/clinical-care/clinical-care.routes.js';
import { notificationRoutes } from './modules/realtime/notification.routes.js';
import postpartumDeliveryRoutes from './modules/postpartum-delivery/delivery.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';

export function createApp(): Express {
  const app = express();

  // Basic security headers
  app.use(helmet());

  // Strict CORS in development / production
  app.use(
    cors({
      origin: webOriginCors,
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
  apiV1Router.use('/analytics', analyticsRouter);
  apiV1Router.use('/audit-logs', auditRouter);
  apiV1Router.use('/notifications', notificationRoutes);
  apiV1Router.use('/admissions', admissionRouter);
  apiV1Router.use('/wards', wardRouter);
  apiV1Router.use('/beds', bedRouter);
  apiV1Router.use('/bed-allocations', bedAllocationRouter);
  apiV1Router.use('/patient-assignments', patientAssignmentRouter);
  apiV1Router.use('/', clinicalObservationRoutes);
  apiV1Router.use('/', clinicalCareRoutes);
  apiV1Router.use('/', postpartumDeliveryRoutes);

  app.use('/api/v1', apiV1Router);

  // Catch-all 404 handler
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}
