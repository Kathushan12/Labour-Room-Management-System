import { Request, Response, NextFunction } from 'express';
import { listWards, getWardById, createWard, updateWard, getWardBedBoard } from './ward.service.js';
import { createWardSchema, updateWardSchema, wardIdParamSchema } from './ward.schemas.js';

export async function listWardsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wards = await listWards();
    res.status(200).json({
      success: true,
      data: { items: wards },
    });
  } catch (err) {
    next(err);
  }
}

export async function getWardByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = wardIdParamSchema.parse(req.params);
    const ward = await getWardById(id);
    res.status(200).json({
      success: true,
      data: ward,
    });
  } catch (err) {
    next(err);
  }
}

export async function createWardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createWardSchema.parse(req.body);
    const ward = await createWard(
      input,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );
    res.status(201).json({
      success: true,
      data: ward,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateWardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = wardIdParamSchema.parse(req.params);
    const input = updateWardSchema.parse(req.body);
    const ward = await updateWard(
      id,
      input,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );
    res.status(200).json({
      success: true,
      data: ward,
    });
  } catch (err) {
    next(err);
  }
}

export async function getWardBedBoardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = wardIdParamSchema.parse(req.params);
    const bedBoard = await getWardBedBoard(id, req.user!);
    res.status(200).json({
      success: true,
      data: bedBoard,
    });
  } catch (err) {
    next(err);
  }
}
