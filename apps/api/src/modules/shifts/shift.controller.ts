import { Request, Response, NextFunction } from 'express';
import { shiftService } from './shift.service.js';
import { shiftHandoverService } from './shift-handover.service.js';
import {
  createShiftSchema,
  updateShiftSchema,
  assignStaffToShiftSchema,
  cancelShiftStaffAssignmentSchema,
} from './shift.schemas.js';
import { ShiftStatus } from '@lrms/shared';
import { BadRequestError } from '../../common/errors/auth.errors.js';

export class ShiftController {
  public async listShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId } = req.params;
      const { fromDate, toDate, status } = req.query;
      const shifts = await shiftService.listShifts(
        wardId,
        fromDate as string | undefined,
        toDate as string | undefined,
        status as ShiftStatus | undefined,
      );
      res.status(200).json({ success: true, data: shifts });
    } catch (err) {
      next(err);
    }
  }

  public async getShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId, shiftId } = req.params;
      const shift = await shiftService.getShiftById(wardId, shiftId);
      res.status(200).json({ success: true, data: shift });
    } catch (err) {
      next(err);
    }
  }

  public async createShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId } = req.params;
      const parsedResult = createShiftSchema.safeParse(req.body);
      if (!parsedResult.success) {
        throw new BadRequestError(
          parsedResult.error.errors.map((e) => e.message).join(', '),
          'VALIDATION_ERROR',
        );
      }
      const shift = await shiftService.createShift(
        wardId,
        parsedResult.data,
        req.user!,
        req.ip ?? null,
        req.id ? String(req.id) : null,
      );
      res.status(201).json({ success: true, data: shift });
    } catch (err) {
      next(err);
    }
  }

  public async updateShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId, shiftId } = req.params;
      const parsedResult = updateShiftSchema.safeParse(req.body);
      if (!parsedResult.success) {
        throw new BadRequestError(
          parsedResult.error.errors.map((e) => e.message).join(', '),
          'VALIDATION_ERROR',
        );
      }
      const shift = await shiftService.updateShift(
        wardId,
        shiftId,
        parsedResult.data,
        req.user!,
        req.ip ?? null,
        req.id ? String(req.id) : null,
      );
      res.status(200).json({ success: true, data: shift });
    } catch (err) {
      next(err);
    }
  }

  public async assignStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId, shiftId } = req.params;
      const parsedResult = assignStaffToShiftSchema.safeParse(req.body);
      if (!parsedResult.success) {
        throw new BadRequestError(
          parsedResult.error.errors.map((e) => e.message).join(', '),
          'VALIDATION_ERROR',
        );
      }
      const assignment = await shiftService.assignStaffToShift(
        wardId,
        shiftId,
        parsedResult.data,
        req.user!,
        req.ip ?? null,
        req.id ? String(req.id) : null,
      );
      res.status(201).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  }

  public async cancelStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId, shiftId, assignmentId } = req.params;
      const parsedResult = cancelShiftStaffAssignmentSchema.safeParse(req.body);
      if (!parsedResult.success) {
        throw new BadRequestError(
          parsedResult.error.errors.map((e) => e.message).join(', '),
          'VALIDATION_ERROR',
        );
      }
      const assignment = await shiftService.cancelShiftStaffAssignment(
        wardId,
        shiftId,
        assignmentId,
        parsedResult.data,
        req.user!,
        req.ip ?? null,
        req.id ? String(req.id) : null,
      );
      res.status(200).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  }

  public async getOnDutyRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId } = req.params;
      const onDuty = await shiftService.getOnDutyStaff(wardId);
      res.status(200).json({ success: true, data: onDuty });
    } catch (err) {
      next(err);
    }
  }

  // Handovers
  public async listHandovers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shiftId } = req.params;
      const handovers = await shiftHandoverService.listHandovers(shiftId);
      res.status(200).json({ success: true, data: handovers });
    } catch (err) {
      next(err);
    }
  }

  public async createHandover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shiftId } = req.params;
      const handover = await shiftHandoverService.createHandover(
        shiftId,
        req.body,
        req.user!,
        req.ip ?? null,
        req.id ? String(req.id) : null,
      );
      res.status(201).json({ success: true, data: handover });
    } catch (err) {
      next(err);
    }
  }

  public async acknowledgeHandover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shiftId, handoverId } = req.params;
      const handover = await shiftHandoverService.acknowledgeHandover(
        shiftId,
        handoverId,
        req.body,
        req.user!,
        req.ip ?? null,
        req.id ? String(req.id) : null,
      );
      res.status(200).json({ success: true, data: handover });
    } catch (err) {
      next(err);
    }
  }
}

export const shiftController = new ShiftController();
