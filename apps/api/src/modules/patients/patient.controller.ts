import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@lrms/shared';
import { BadRequestError } from '../../common/errors/auth.errors.js';
import {
  patientIdParamSchema,
  patientLookupSchema,
  updatePatientPiiSchema,
} from './patient.schemas.js';
import * as patientService from './patient.service.js';

function getReqContext(req: Request) {
  return {
    ip: req.ip || req.socket.remoteAddress || null,
    requestId: req.id ? String(req.id) : null,
  };
}

export async function getPatientByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramResult = patientIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return next(
      new BadRequestError('Invalid patient ID format', 'INVALID_UUID', paramResult.error.flatten()),
    );
  }

  try {
    const { ip, requestId } = getReqContext(req);
    const data = await patientService.getPatientMasterRecord(
      req.user!,
      paramResult.data.id,
      ip,
      requestId,
    );

    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getPatientAdmissionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramResult = patientIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return next(
      new BadRequestError('Invalid patient ID format', 'INVALID_UUID', paramResult.error.flatten()),
    );
  }

  try {
    const { ip, requestId } = getReqContext(req);
    const data = await patientService.getPatientAdmissionsHistory(
      req.user!,
      paramResult.data.id,
      ip,
      requestId,
    );

    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function revealPatientPiiHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramResult = patientIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return next(
      new BadRequestError('Invalid patient ID format', 'INVALID_UUID', paramResult.error.flatten()),
    );
  }

  try {
    const { ip, requestId } = getReqContext(req);
    const data = await patientService.revealPatientPii(
      req.user!,
      paramResult.data.id,
      ip,
      requestId,
    );

    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updatePatientPiiHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramResult = patientIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return next(
      new BadRequestError('Invalid patient ID format', 'INVALID_UUID', paramResult.error.flatten()),
    );
  }

  const bodyResult = updatePatientPiiSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return next(
      new BadRequestError(
        'Validation failed for patient identity payload',
        'VALIDATION_ERROR',
        bodyResult.error.flatten(),
      ),
    );
  }

  try {
    const { ip, requestId } = getReqContext(req);
    const data = await patientService.updatePatientPii(
      req.user!,
      paramResult.data.id,
      bodyResult.data,
      ip,
      requestId,
    );

    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function lookupPatientHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const bodyResult = patientLookupSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return next(
      new BadRequestError(
        'Invalid NIC lookup payload',
        'VALIDATION_ERROR',
        bodyResult.error.flatten(),
      ),
    );
  }

  try {
    const { ip, requestId } = getReqContext(req);
    const data = await patientService.lookupPatientByNic(
      req.user!,
      bodyResult.data.nic,
      ip,
      requestId,
    );

    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}
