import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@lrms/shared';
import { BadRequestError } from '../../common/errors/auth.errors.js';
import {
  admissionIdParamSchema,
  createTriageSchema,
  listAdmissionsQuerySchema,
  updateAdmissionRiskFlagsSchema,
} from './admission.schemas.js';
import * as admissionService from './admission.service.js';

function getReqContext(req: Request) {
  return {
    ip: req.ip || req.socket.remoteAddress || null,
    requestId: req.id ? String(req.id) : null,
  };
}

function parseBoundaryDate(raw: string | undefined, endOfDay: boolean): Date | undefined {
  if (!raw || raw.trim() === '') {
    return undefined;
  }
  const trimmed = raw.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
    : trimmed;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestError(`Invalid date filter parameter: '${trimmed}'`, 'INVALID_DATE');
  }
  return parsed;
}

export async function listRiskFlagsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await admissionService.listRiskFlagDefinitions();
    const response: ApiResponse = {
      success: true,
      data: { items },
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function listAdmissionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const queryResult = listAdmissionsQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return next(
      new BadRequestError(
        'Invalid admission register query parameters',
        'VALIDATION_ERROR',
        queryResult.error.flatten(),
      ),
    );
  }

  try {
    const q = queryResult.data;
    const fromDate = parseBoundaryDate(q.fromDate, false);
    const toDate = parseBoundaryDate(q.toDate, true);

    const data = await admissionService.listAdmissions(
      {
        page: q.page,
        limit: q.limit,
        search: q.search,
        category: q.category,
        status: q.status,
        riskFlagKey: q.riskFlagKey,
        fromDate,
        toDate,
        sortBy: q.sortBy,
        sortOrder: q.sortOrder,
      },
      req.user!,
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

export async function getAdmissionByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramResult = admissionIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return next(
      new BadRequestError(
        'Invalid admission ID format',
        'INVALID_UUID',
        paramResult.error.flatten(),
      ),
    );
  }

  try {
    const { ip, requestId } = getReqContext(req);
    const data = await admissionService.getAdmissionDetail(
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

export async function createTriageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const bodyResult = createTriageSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return next(
      new BadRequestError(
        'Validation failed for rapid triage submission',
        'VALIDATION_ERROR',
        bodyResult.error.flatten(),
      ),
    );
  }

  try {
    const { ip, requestId } = getReqContext(req);
    const data = await admissionService.performRapidTriage(
      req.user!,
      bodyResult.data,
      ip,
      requestId,
    );

    const response: ApiResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function updateAdmissionRiskFlagsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramResult = admissionIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return next(
      new BadRequestError(
        'Invalid admission ID format',
        'INVALID_UUID',
        paramResult.error.flatten(),
      ),
    );
  }

  const bodyResult = updateAdmissionRiskFlagsSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return next(
      new BadRequestError(
        'Validation failed for risk flag update',
        'VALIDATION_ERROR',
        bodyResult.error.flatten(),
      ),
    );
  }

  try {
    const { ip, requestId } = getReqContext(req);
    const data = await admissionService.updateAdmissionRiskFlags(
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
