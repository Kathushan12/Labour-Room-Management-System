import { z } from 'zod';

export const wardIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid ward UUID format'),
  })
  .strict();

export const createWardSchema = z
  .object({
    name: z.string().trim().min(2, 'Ward name must be at least 2 characters').max(100),
    code: z
      .string()
      .trim()
      .min(2, 'Ward code must be at least 2 characters')
      .max(20)
      .regex(
        /^[A-Z0-9-_]+$/,
        'Ward code must contain only uppercase alphanumeric characters, dashes, and underscores',
      ),
    totalPhysicalBeds: z
      .number()
      .int('Total physical beds must be an integer')
      .min(1, 'Ward must have at least 1 physical bed')
      .max(200, 'Ward cannot exceed 200 beds'),
  })
  .strict();

export const updateWardSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    totalPhysicalBeds: z
      .number()
      .int()
      .min(1, 'Ward must have at least 1 physical bed')
      .max(200)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
