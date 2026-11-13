import { z } from 'zod';
import { StaffAssignmentRole } from '@lrms/shared';

export const assignPatientStaffSchema = z.object({
  staffId: z.string().uuid('Invalid staff UUID format'),
  assignmentRole: z.nativeEnum(StaffAssignmentRole, {
    errorMap: () => ({ message: 'Invalid staff assignment role' }),
  }),
});

export const transferPatientStaffSchema = z.object({
  newStaffId: z.string().uuid('Invalid new staff UUID format'),
  assignmentRole: z.enum(
    [StaffAssignmentRole.ATTENDING_DOCTOR, StaffAssignmentRole.PRIMARY_NURSE],
    {
      errorMap: () => ({
        message: 'Responsibility transfer applies to ATTENDING_DOCTOR or PRIMARY_NURSE roles only',
      }),
    },
  ),
  reason: z.string().max(500).optional(),
});

export const endPatientStaffAssignmentSchema = z.object({
  reason: z.string().min(1, 'Reason for ending assignment is required').max(500),
});

export type AssignPatientStaffInput = z.infer<typeof assignPatientStaffSchema>;
export type TransferPatientStaffInput = z.infer<typeof transferPatientStaffSchema>;
export type EndPatientStaffAssignmentInput = z.infer<typeof endPatientStaffAssignmentSchema>;
