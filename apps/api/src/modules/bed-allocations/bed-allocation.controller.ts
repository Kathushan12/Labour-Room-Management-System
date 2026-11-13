import { Request, Response, NextFunction } from 'express';
import {
  allocateBed,
  transferBed,
  releaseBed,
  getAdmissionBedHistory,
} from './bed-allocation.service.js';
import {
  allocationIdParamSchema,
  allocateBedSchema,
  admissionAllocateBedSchema,
  transferBedSchema,
  releaseBedSchema,
} from './bed-allocation.schemas.js';
import { admissionIdParamSchema } from '../admissions/admission.schemas.js';

export async function allocateBedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = allocateBedSchema.parse(req.body);
    const allocation = await allocateBed(
      input.admissionId,
      input.bedId,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      input.notes,
    );
    res.status(201).json({
      success: true,
      data: allocation,
    });
  } catch (err) {
    next(err);
  }
}

export async function admissionAllocateBedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = admissionIdParamSchema.parse(req.params);
    const input = admissionAllocateBedSchema.parse(req.body);
    const allocation = await allocateBed(
      id,
      input.bedId,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      input.notes,
    );
    res.status(201).json({
      success: true,
      data: allocation,
    });
  } catch (err) {
    next(err);
  }
}

export async function transferBedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = allocationIdParamSchema.parse(req.params);
    const input = transferBedSchema.parse(req.body);
    const allocation = await transferBed(
      id,
      input.targetBedId,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      input.reason,
    );
    res.status(200).json({
      success: true,
      data: allocation,
    });
  } catch (err) {
    next(err);
  }
}

export async function releaseBedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = allocationIdParamSchema.parse(req.params);
    const input = releaseBedSchema.parse(req.body || {});
    const allocation = await releaseBed(
      id,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      input.reason,
    );
    res.status(200).json({
      success: true,
      data: allocation,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdmissionBedHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = admissionIdParamSchema.parse(req.params);
    const history = await getAdmissionBedHistory(id);
    res.status(200).json({
      success: true,
      data: { items: history },
    });
  } catch (err) {
    next(err);
  }
}
