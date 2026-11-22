import { Router } from 'express';
import { z } from 'zod';
import { Permission, UserRole } from '@lrms/shared';
import {
  authenticate,
  requirePermission,
  requireRole,
} from '../../common/middleware/auth.middleware.js';
import { listAuditLogs } from './audit.service.js';

const querySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    action: z
      .string()
      .trim()
      .regex(/^[A-Z_]{1,100}$/, 'Invalid action filter')
      .optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  })
  .strict();

export const auditRouter = Router();

// REQ-9.6: audit logs are admin-only.
auditRouter.use(authenticate, requireRole([UserRole.ADMIN]));

auditRouter.get(
  '/',
  requirePermission(Permission.REPORTS_VIEW_AUDIT_LOGS),
  async (req, res, next) => {
    try {
      const filter = querySchema.parse(req.query);
      res.status(200).json({ success: true, data: await listAuditLogs(filter) });
    } catch (err) {
      next(err);
    }
  },
);
