import { Request, Response, NextFunction } from 'express';
import { wardStaffService } from './ward-staff.service.js';
import { assignStaffToWardSchema, endStaffWardAssignmentSchema } from './ward-staff.schemas.js';

export class WardStaffController {
  public async listWardStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId } = req.params;
      const activeOnly = req.query.activeOnly === 'true';
      const staff = await wardStaffService.listWardStaff(wardId, activeOnly);
      res.status(200).json({ success: true, data: staff });
    } catch (err) {
      next(err);
    }
  }

  public async assignStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId } = req.params;
      const parsed = assignStaffToWardSchema.parse(req.body);
      const assignment = await wardStaffService.assignStaffToWard(
        wardId,
        parsed,
        req.user!,
        req.ip ?? null,
        req.id ? String(req.id) : null,
      );
      res.status(201).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  }

  public async endAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId, assignmentId } = req.params;
      const parsed = endStaffWardAssignmentSchema.parse(req.body);
      const assignment = await wardStaffService.endStaffWardAssignment(
        wardId,
        assignmentId,
        parsed,
        req.user!,
        req.ip ?? null,
        req.id ? String(req.id) : null,
      );
      res.status(200).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  }
}

export const wardStaffController = new WardStaffController();
