import { z } from 'zod';

export const allocationIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid allocation UUID format'),
  })
  .strict();

export const allocateBedSchema = z
  .object({
    bedId: z.string().uuid('Invalid bed UUID format'),
    admissionId: z.string().uuid('Invalid admission UUID format'),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const admissionAllocateBedSchema = z
  .object({
    bedId: z.string().uuid('Invalid bed UUID format'),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const transferBedSchema = z
  .object({
    targetBedId: z.string().uuid('Invalid target bed UUID format'),
    reason: z.string().trim().max(255).optional(),
  })
  .strict();

export const releaseBedSchema = z
  .object({
    reason: z.string().trim().max(255).optional(),
  })
  .strict();
