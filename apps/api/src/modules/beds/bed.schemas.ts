import { z } from 'zod';
import { BedFunctioningStatus } from '@lrms/shared';

export const bedIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid bed UUID format'),
  })
  .strict();

export const wardIdParamForBedsSchema = z
  .object({
    wardId: z.string().uuid('Invalid ward UUID format'),
  })
  .strict();

export const createBedSchema = z
  .object({
    bedNumber: z
      .string()
      .trim()
      .min(1, 'Bed number is required')
      .max(20, 'Bed number cannot exceed 20 characters')
      .regex(
        /^[A-Za-z0-9-_ ]+$/,
        'Bed number can only contain letters, numbers, spaces, dashes, and underscores',
      ),
  })
  .strict();

export const updateMaintenanceSchema = z
  .object({
    functioningStatus: z.nativeEnum(BedFunctioningStatus, {
      errorMap: () => ({ message: 'functioningStatus must be FUNCTIONING or OUT_OF_SERVICE' }),
    }),
    reason: z.string().trim().max(255).optional(),
  })
  .strict();

export const cleaningActionSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
  })
  .strict();
