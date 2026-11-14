import { Router } from 'express';
import { Permission } from '@lrms/shared';
import { authenticate, requirePermission } from '../../common/middleware/auth.middleware.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { AppDataSource } from '../../config/database.js';

const router = Router();
const analyticsService = new AnalyticsService(AppDataSource);
const controller = new AnalyticsController(analyticsService);

// All analytics endpoints require valid authentication
router.use(authenticate);

// 1. Overview KPIs
router.get('/overview', requirePermission(Permission.ANALYTICS_VIEW), controller.getOverview);

// 2. Admission Analytics
router.get(
  '/admissions',
  requirePermission(Permission.ANALYTICS_ADMISSIONS_VIEW),
  controller.getAdmissions,
);

// 3. Delivery Analytics
router.get(
  '/deliveries',
  requirePermission(Permission.ANALYTICS_DELIVERIES_VIEW),
  controller.getDeliveries,
);

// 4. Newborn Analytics
router.get(
  '/newborns',
  requirePermission(Permission.ANALYTICS_DELIVERIES_VIEW),
  controller.getNewborns,
);

// 5. Bed Utilization & Turnover
router.get('/beds', requirePermission(Permission.ANALYTICS_BEDS_VIEW), controller.getBeds);

// 6. Average Length of Stay (ALOS)
router.get('/alos', requirePermission(Permission.ANALYTICS_ALOS_VIEW), controller.getAlos);

// 7. Staffing & Workload
router.get(
  '/staffing',
  requirePermission(Permission.ANALYTICS_STAFFING_VIEW),
  controller.getStaffing,
);

// 8. Clinical Alert & Escalation Response
router.get(
  '/clinical-alerts',
  requirePermission(Permission.ANALYTICS_ALERTS_VIEW),
  controller.getClinicalAlerts,
);

// 9. System Health & Infrastructure Telemetry
router.get(
  '/system-health',
  requirePermission(Permission.ANALYTICS_VIEW),
  controller.getSystemHealth,
);

// 10. Reports Catalog
router.get('/reports', requirePermission(Permission.ANALYTICS_VIEW), controller.getReportsCatalog);

// 11. Report Export (CSV / Print HTML)
router.get(
  '/reports/:reportType/export',
  requirePermission(Permission.ANALYTICS_EXPORT),
  controller.exportReport,
);
router.get('/export', requirePermission(Permission.ANALYTICS_EXPORT), controller.exportReport);

export { router as analyticsRouter };
export default router;
