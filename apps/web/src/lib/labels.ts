import { StaffAssignmentRole, UserRole } from '@lrms/shared';

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.DOCTOR]: 'Doctor',
  [UserRole.NURSE_STAFF]: 'Nurse',
};

const ASSIGNMENT_ROLE_LABELS: Record<string, string> = {
  [StaffAssignmentRole.ATTENDING_DOCTOR]: 'Attending doctor',
  [StaffAssignmentRole.PRIMARY_NURSE]: 'Primary nurse',
  [StaffAssignmentRole.CONSULTANT_ON_CALL]: 'Consultant on call',
  [StaffAssignmentRole.SUPPORTING_DOCTOR]: 'Supporting doctor',
  [StaffAssignmentRole.SUPPORTING_NURSE]: 'Supporting nurse',
};

/** "NORMAL_DELIVERY" -> "Normal delivery" */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return '';
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function roleLabel(role: string | null | undefined): string {
  return (role && ROLE_LABELS[role]) || humanizeEnum(role);
}

export function assignmentRoleLabel(role: string | null | undefined): string {
  return (role && ASSIGNMENT_ROLE_LABELS[role]) || humanizeEnum(role);
}
