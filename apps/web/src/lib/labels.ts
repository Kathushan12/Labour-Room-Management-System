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

const TITLES: Record<string, string> = {
  'dr.': 'Dr.',
  dr: 'Dr.',
  sister: 'Sr.',
  nurse: 'Nurse',
  mr: 'Mr.',
  'mr.': 'Mr.',
  ms: 'Ms.',
  'ms.': 'Ms.',
  mrs: 'Mrs.',
  'mrs.': 'Mrs.',
};

/** "Sister Dilani Fernando" -> "Sr. D. Fernando", for tight spaces such as the phone top bar. */
export function shortName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  const title = TITLES[parts[0].toLowerCase()];
  const rest = title ? parts.slice(1) : parts;
  if (rest.length < 2) return fullName.trim();
  const short = rest[0][0].toUpperCase() + '. ' + rest[rest.length - 1];
  return title ? title + ' ' + short : short;
}

export function roleLabel(role: string | null | undefined): string {
  return (role && ROLE_LABELS[role]) || humanizeEnum(role);
}

export function assignmentRoleLabel(role: string | null | undefined): string {
  return (role && ASSIGNMENT_ROLE_LABELS[role]) || humanizeEnum(role);
}
