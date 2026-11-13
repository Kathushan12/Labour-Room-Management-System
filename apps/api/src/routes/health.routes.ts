import { Router, Request, Response, IRouter } from 'express';
import { checkDatabaseConnection } from '../config/database.js';
import { HealthLiveResponse, HealthReadyResponse, ApiResponse } from '@lrms/shared';

export const healthRouter: IRouter = Router();

// Liveness probe: Returns 200 if Express process is alive
healthRouter.get('/live', (_req: Request, res: Response) => {
  const liveData: HealthLiveResponse = {
    status: 'ok',
    service: 'lrms-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };

  const response: ApiResponse<HealthLiveResponse> = {
    success: true,
    data: liveData,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

// Readiness probe: Checks real PostgreSQL connectivity
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();

  const readyData: HealthReadyResponse = {
    status: dbStatus.connected ? 'ready' : 'not_ready',
    service: 'lrms-api',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  };

  if (!dbStatus.connected) {
    const errorResponse: ApiResponse<HealthReadyResponse> = {
      success: false,
      data: readyData,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database dependency is unavailable',
        details: dbStatus.error,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(503).json(errorResponse);
    return;
  }

  const successResponse: ApiResponse<HealthReadyResponse> = {
    success: true,
    data: readyData,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(successResponse);
});
