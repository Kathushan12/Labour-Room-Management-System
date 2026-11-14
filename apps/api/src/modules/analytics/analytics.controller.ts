import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { analyticsQuerySchema, exportQuerySchema } from './analytics.schemas.js';

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const data = await this.analyticsService.getOverview(query);
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getAdmissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const data = await this.analyticsService.getAdmissions(query);
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getDeliveries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const data = await this.analyticsService.getDeliveries(query);
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getNewborns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const data = await this.analyticsService.getNewborns(query);
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getBeds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const data = await this.analyticsService.getBeds(query);
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getAlos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const data = await this.analyticsService.getAlos(query);
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getStaffing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const data = await this.analyticsService.getStaffing(query);
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getClinicalAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = analyticsQuerySchema.parse(req.query);
      const data = await this.analyticsService.getClinicalAlerts(query);
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getSystemHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.analyticsService.getSystemHealth();
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  getReportsCatalog = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = this.analyticsService.getReportsCatalog();
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };

  exportReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = exportQuerySchema.parse({
        ...req.query,
        reportType: req.params.reportType || req.query.reportType,
      });

      const userId = (req as any).user?.id || 'system-export';
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await this.analyticsService.exportReport(query, userId, ipAddress);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.content);
    } catch (err) {
      next(err);
    }
  };
}

