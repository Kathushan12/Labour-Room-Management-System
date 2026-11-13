import { UserRole, StaffAssignmentRole } from '@lrms/shared';
import { PatientStaffAssignment } from '../../database/entities/PatientStaffAssignment.js';
import { PatientStaffAssignmentDto, AdmissionStaffResponsibilityDto } from '@lrms/shared';

export function serializePatientStaffAssignment(
  entity: PatientStaffAssignment,
): PatientStaffAssignmentDto {
  return {
    id: entity.id,
    admissionId: entity.admissionId,
    staffId: entity.staffId,
    assignmentRole: entity.assignmentRole,
    assignedByUserId: entity.assignedByUserId,
    assignedAt: entity.assignedAt.toISOString(),
    unassignedAt: entity.unassignedAt ? entity.unassignedAt.toISOString() : null,
    unassignedByUserId: entity.unassignedByUserId ?? null,
    endReason: entity.endReason ?? null,
    createdAt: entity.createdAt.toISOString(),
    staff: entity.staff
      ? {
          id: entity.staff.id,
          username: entity.staff.username,
          fullName: entity.staff.fullName,
          role: (entity.staff.role?.name ?? entity.staff.roleId) as UserRole,
        }
      : undefined,
    assignedByUser: entity.assignedByUser
      ? {
          id: entity.assignedByUser.id,
          fullName: entity.assignedByUser.fullName,
        }
      : undefined,
    unassignedByUser: entity.unassignedByUser
      ? {
          id: entity.unassignedByUser.id,
          fullName: entity.unassignedByUser.fullName,
        }
      : null,
  };
}

export function serializeAdmissionStaffResponsibility(
  admissionId: string,
  admissionReferenceId: string,
  assignments: PatientStaffAssignment[],
): AdmissionStaffResponsibilityDto {
  const activeAssignments = assignments.filter((a) => !a.unassignedAt);
  const attendingDoctor =
    activeAssignments.find((a) => a.assignmentRole === StaffAssignmentRole.ATTENDING_DOCTOR) ??
    null;
  const primaryNurse =
    activeAssignments.find((a) => a.assignmentRole === StaffAssignmentRole.PRIMARY_NURSE) ?? null;
  const supportingStaff = activeAssignments.filter(
    (a) =>
      a.assignmentRole !== StaffAssignmentRole.ATTENDING_DOCTOR &&
      a.assignmentRole !== StaffAssignmentRole.PRIMARY_NURSE,
  );

  return {
    admissionId,
    admissionReferenceId,
    attendingDoctor: attendingDoctor ? serializePatientStaffAssignment(attendingDoctor) : null,
    primaryNurse: primaryNurse ? serializePatientStaffAssignment(primaryNurse) : null,
    supportingStaff: supportingStaff.map(serializePatientStaffAssignment),
    history: assignments.map(serializePatientStaffAssignment),
  };
}
