import { z } from 'zod';
import { ShiftType, ShiftStatus } from '@lrms/shared';

export const createShiftSchema = z
  .object({
    shiftType: z.nativeEnum(ShiftType, {
      errorMap: () => ({ message: 'Invalid shift type' }),
    }),
    name: z.string().min(1, 'Shift name is required').max(100),
    startsAt: z.string().datetime({ message: 'startsAt must be a valid ISO 8601 string' }),
    endsAt: z.string().datetime({ message: 'endsAt must be a valid ISO 8601 string' }),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(), {
    message: 'Shift endsAt must be strictly later than startsAt',
    path: ['endsAt'],
  });

export const updateShiftSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.nativeEnum(ShiftStatus).optional(),
  notes: z.string().max(500).optional(),
});

export const assignStaffToShiftSchema = z.object({
  userId: z.string().uuid('Invalid user UUID format'),
  roleInShift: z.string().max(50).optional(),
});

export const cancelShiftStaffAssignmentSchema = z.object({
  cancellationReason: z
    .string()
    .min(1, 'Cancellation reason is required')
    .max(500, 'Cancellation reason cannot exceed 500 characters'),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type AssignStaffToShiftInput = z.infer<typeof assignStaffToShiftSchema>;
export type CancelShiftStaffAssignmentInput = z.infer<typeof cancelShiftStaffAssignmentSchema>;
