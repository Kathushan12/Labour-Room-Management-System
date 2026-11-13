import { z } from 'zod';

export const assignStaffToWardSchema = z.object({
  userId: z.string().uuid('Invalid user UUID format'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export const endStaffWardAssignmentSchema = z.object({
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export type AssignStaffToWardInput = z.infer<typeof assignStaffToWardSchema>;
export type EndStaffWardAssignmentInput = z.infer<typeof endStaffWardAssignmentSchema>;
