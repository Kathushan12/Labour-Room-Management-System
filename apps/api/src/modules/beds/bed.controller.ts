import { Request, Response, NextFunction } from 'express';
import {
  listBeds,
  getBed,
  createBed,
  updateBedMaintenance,
  startBedCleaning,
  completeBedCleaning,
  getBedCleaningHistory,
} from './bed.service.js';
import {
  bedIdParamSchema,
  wardIdParamForBedsSchema,
  createBedSchema,
  updateMaintenanceSchema,
  cleaningActionSchema,
} from './bed.schemas.js';

export async function listBedsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { wardId } = wardIdParamForBedsSchema.parse(req.params);
    const beds = await listBeds(wardId, req.user!);
    res.status(200).json({
      success: true,
      data: { items: beds },
    });
  } catch (err) {
    next(err);
  }
}

export async function getBedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = bedIdParamSchema.parse(req.params);
    const bed = await getBed(id, req.user!);
    res.status(200).json({
      success: true,
      data: bed,
    });
  } catch (err) {
    next(err);
  }
}

export async function createBedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { wardId } = wardIdParamForBedsSchema.parse(req.params);
    const input = createBedSchema.parse(req.body);
    const bed = await createBed(
      wardId,
      input,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );
    res.status(201).json({
      success: true,
      data: bed,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateBedMaintenanceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = bedIdParamSchema.parse(req.params);
    const input = updateMaintenanceSchema.parse(req.body);
    const bed = await updateBedMaintenance(
      id,
      input,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );
    res.status(200).json({
      success: true,
      data: bed,
    });
  } catch (err) {
    next(err);
  }
}

export async function startBedCleaningHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = bedIdParamSchema.parse(req.params);
    const input = cleaningActionSchema.parse(req.body || {});
    const bed = await startBedCleaning(
      id,
      input.notes,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );
    res.status(200).json({
      success: true,
      data: bed,
    });
  } catch (err) {
    next(err);
  }
}

export async function completeBedCleaningHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = bedIdParamSchema.parse(req.params);
    const input = cleaningActionSchema.parse(req.body || {});
    const bed = await completeBedCleaning(
      id,
      input.notes,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );
    res.status(200).json({
      success: true,
      data: bed,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBedCleaningHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = bedIdParamSchema.parse(req.params);
    const history = await getBedCleaningHistory(id);
    res.status(200).json({
      success: true,
      data: { items: history },
    });
  } catch (err) {
    next(err);
  }
}
