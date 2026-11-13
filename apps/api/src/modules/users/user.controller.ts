import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../common/errors/auth.errors.js';
import {
  userIdParamSchema,
  listUsersQuerySchema,
  createUserSchema,
  updateUserProfileSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
} from './user.schemas.js';
import {
  listUsers,
  getUserDetail,
  createUser,
  updateUserProfile,
  updateUserStatus,
  updateUserRole,
  reissueTemporaryPassword,
} from './user.service.js';

function getRequestId(req: Request): string | null {
  return req.id !== undefined && req.id !== null ? String(req.id) : null;
}

export async function listUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const queryParse = listUsersQuerySchema.safeParse(req.query);
  if (!queryParse.success) {
    return next(
      new BadRequestError(
        'Invalid query parameters',
        'VALIDATION_ERROR',
        queryParse.error.flatten(),
      ),
    );
  }

  try {
    const result = await listUsers(queryParse.data);
    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramParse = userIdParamSchema.safeParse(req.params);
  if (!paramParse.success) {
    return next(
      new BadRequestError(
        'Invalid user ID parameter',
        'VALIDATION_ERROR',
        paramParse.error.flatten(),
      ),
    );
  }

  try {
    const detail = await getUserDetail(paramParse.data.id);
    res.status(200).json({
      success: true,
      data: detail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function createUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const bodyParse = createUserSchema.safeParse(req.body);
  if (!bodyParse.success) {
    return next(
      new BadRequestError('Validation failed', 'VALIDATION_ERROR', bodyParse.error.flatten()),
    );
  }

  try {
    const ip = req.ip || req.socket.remoteAddress || null;
    const result = await createUser(req.user!.id, bodyParse.data, ip, getRequestId(req));

    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramParse = userIdParamSchema.safeParse(req.params);
  if (!paramParse.success) {
    return next(
      new BadRequestError(
        'Invalid user ID parameter',
        'VALIDATION_ERROR',
        paramParse.error.flatten(),
      ),
    );
  }

  const bodyParse = updateUserProfileSchema.safeParse(req.body);
  if (!bodyParse.success) {
    return next(
      new BadRequestError('Validation failed', 'VALIDATION_ERROR', bodyParse.error.flatten()),
    );
  }

  try {
    const ip = req.ip || req.socket.remoteAddress || null;
    const updated = await updateUserProfile(
      req.user!.id,
      paramParse.data.id,
      bodyParse.data,
      ip,
      getRequestId(req),
    );

    res.status(200).json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramParse = userIdParamSchema.safeParse(req.params);
  if (!paramParse.success) {
    return next(
      new BadRequestError(
        'Invalid user ID parameter',
        'VALIDATION_ERROR',
        paramParse.error.flatten(),
      ),
    );
  }

  const bodyParse = updateUserStatusSchema.safeParse(req.body);
  if (!bodyParse.success) {
    return next(
      new BadRequestError('Validation failed', 'VALIDATION_ERROR', bodyParse.error.flatten()),
    );
  }

  try {
    const ip = req.ip || req.socket.remoteAddress || null;
    const updated = await updateUserStatus(
      req.user!.id,
      paramParse.data.id,
      bodyParse.data.isActive,
      bodyParse.data.reason,
      ip,
      getRequestId(req),
    );

    res.status(200).json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserRoleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramParse = userIdParamSchema.safeParse(req.params);
  if (!paramParse.success) {
    return next(
      new BadRequestError(
        'Invalid user ID parameter',
        'VALIDATION_ERROR',
        paramParse.error.flatten(),
      ),
    );
  }

  const bodyParse = updateUserRoleSchema.safeParse(req.body);
  if (!bodyParse.success) {
    return next(
      new BadRequestError('Validation failed', 'VALIDATION_ERROR', bodyParse.error.flatten()),
    );
  }

  try {
    const ip = req.ip || req.socket.remoteAddress || null;
    const updated = await updateUserRole(
      req.user!.id,
      paramParse.data.id,
      bodyParse.data.role,
      bodyParse.data.reason,
      ip,
      getRequestId(req),
    );

    res.status(200).json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function reissueCredentialHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paramParse = userIdParamSchema.safeParse(req.params);
  if (!paramParse.success) {
    return next(
      new BadRequestError(
        'Invalid user ID parameter',
        'VALIDATION_ERROR',
        paramParse.error.flatten(),
      ),
    );
  }

  try {
    const ip = req.ip || req.socket.remoteAddress || null;
    const result = await reissueTemporaryPassword(
      req.user!.id,
      paramParse.data.id,
      ip,
      getRequestId(req),
    );

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
