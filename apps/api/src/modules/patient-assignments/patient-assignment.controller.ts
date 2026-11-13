import { Request, Response, NextFunction } from 'express';
import { patientAssignmentService } from './patient-assignment.service.js';
import {
  assignPatientStaffSchema,
  transferPatientStaffSchema,
  endPatientStaffAssignmentSchema,
} from './patient-assignment.schemas.js';

export class PatientAssignmentController {
  public async getStaffResponsibility(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { admissionId } = req.params;
      const resp = await patientAssignmentService.getAdmissionStaffResponsibility(admissionId);
      res.status(200).json({ success: true, data: resp });
    } catch (err) {
      next(err);
    }
  }

  public async assignStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { admissionId } = req.params;
      const parsed = assignPatientStaffSchema.parse(req.body);
      const assignment = await patientAssignmentService.assignPatientStaff(
        admissionId,
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

  public async transferStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { admissionId } = req.params;
      const parsed = transferPatientStaffSchema.parse(req.body);
      const assignment = await patientAssignmentService.transferPatientStaff(
        admissionId,
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

  public async endAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { admissionId, assignmentId } = req.params;
      const parsed = endPatientStaffAssignmentSchema.parse(req.body);
      const assignment = await patientAssignmentService.endPatientStaffAssignment(
        admissionId,
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

  public async listUnassignedAdmissions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { wardId } = req.query;
      const unassigned = await patientAssignmentService.listUnassignedAdmissions(
        wardId as string | undefined,
      );
      res.status(200).json({ success: true, data: unassigned });
    } catch (err) {
      next(err);
    }
  }
}

export const patientAssignmentController = new PatientAssignmentController();
