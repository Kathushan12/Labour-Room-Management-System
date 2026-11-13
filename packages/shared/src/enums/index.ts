export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE_STAFF = 'NURSE_STAFF',
}

export enum BedFunctioningStatus {
  FUNCTIONING = 'FUNCTIONING',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export enum BedOccupancyStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
}

export enum BedCleaningStatus {
  CLEAN = 'CLEAN',
  CLEANING_REQUIRED = 'CLEANING_REQUIRED',
  IN_PROGRESS = 'IN_PROGRESS',
}

export enum BedDisplayStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export enum AdmissionCategory {
  NORMAL_DELIVERY = 'NORMAL_DELIVERY',
  SCHEDULED_CESAREAN = 'SCHEDULED_CESAREAN',
  OBSERVATION_20_PLUS_WEEKS = 'OBSERVATION_20_PLUS_WEEKS',
}

export enum CarePlanState {
  NORMAL_DELIVERY = 'NORMAL_DELIVERY',
  SCHEDULED_CESAREAN = 'SCHEDULED_CESAREAN',
  OBSERVATION_20_PLUS_WEEKS = 'OBSERVATION_20_PLUS_WEEKS',
  EMERGENCY_CESAREAN = 'EMERGENCY_CESAREAN',
}

export enum AdmissionStatus {
  ADMITTED = 'ADMITTED',
  TRANSFERRED = 'TRANSFERRED',
  DISCHARGED = 'DISCHARGED',
}

export enum RiskFlagKey {
  HYPERTENSION = 'HYPERTENSION',
  GESTATIONAL_DIABETES = 'GESTATIONAL_DIABETES',
  PREVIOUS_CESAREAN = 'PREVIOUS_CESAREAN',
  OBSERVATION_20_PLUS_WEEKS = 'OBSERVATION_20_PLUS_WEEKS',
  OTHER = 'OTHER',
}

export enum StaffAssignmentRole {
  ATTENDING_DOCTOR = 'ATTENDING_DOCTOR',
  PRIMARY_NURSE = 'PRIMARY_NURSE',
  CONSULTANT_ON_CALL = 'CONSULTANT_ON_CALL',
  SUPPORTING_DOCTOR = 'SUPPORTING_DOCTOR',
  SUPPORTING_NURSE = 'SUPPORTING_NURSE',
}

export enum ShiftType {
  MORNING = 'MORNING',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
  CUSTOM = 'CUSTOM',
}

export enum ShiftStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ShiftStaffAssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum StaffOnDutyStatus {
  SCHEDULED = 'SCHEDULED',
  ON_DUTY = 'ON_DUTY',
  OFF_DUTY = 'OFF_DUTY',
  SHIFT_COMPLETED = 'SHIFT_COMPLETED',
  SHIFT_CANCELLED = 'SHIFT_CANCELLED',
}

export enum HandoverStatus {
  PENDING = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  REJECTED = 'REJECTED',
}

export enum AlertReceiptState {
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export enum AlertSeverity {
  EMERGENCY = 'EMERGENCY',
  URGENT = 'URGENT',
  ROUTINE = 'ROUTINE',
}

export enum NotificationProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
}

export enum GlucoseUnit {
  MMOL_L = 'MMOL_L',
  MG_DL = 'MG_DL',
}

export enum ProfessionalRegistrationBody {
  SLMC = 'SLMC',
  SLNC = 'SLNC',
  OTHER = 'OTHER',
}

export enum Permission {
  // Ward & Bed
  WARDS_VIEW = 'wards:view',
  WARDS_MANAGE = 'wards:manage',
  BEDS_VIEW = 'beds:view',
  BEDS_CONFIGURE = 'beds:configure',
  BEDS_TOGGLE_FUNCTIONING = 'beds:toggle_functioning',
  BEDS_MARK_OUT_OF_SERVICE = 'beds:mark_out_of_service',
  BEDS_MARK_CLEANED = 'beds:mark_cleaned',
  BEDS_ALLOCATE = 'beds:allocate',
  BEDS_TRANSFER = 'beds:transfer',
  BEDS_RELEASE = 'beds:release',
  BEDS_CLEANING_START = 'beds:cleaning_start',
  BEDS_CLEANING_COMPLETE = 'beds:cleaning_complete',

  // User & Session
  USERS_VIEW = 'users:view',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_MANAGE_ROLES = 'users:manage_roles',
  USERS_ACTIVATE = 'users:activate',
  USERS_DEACTIVATE = 'users:deactivate',
  USERS_RESET_CREDENTIAL = 'users:reset_credential',
  SESSIONS_REVOKE = 'sessions:revoke',
  USERS_CHANGE_PASSWORD = 'users:change_password',

  // Patient Admission & Triage
  ADMISSIONS_CREATE = 'admissions:create',
  ADMISSIONS_VIEW = 'admissions:view',
  ADMISSIONS_SELECT_CATEGORY = 'admissions:select_category',
  ADMISSIONS_TOGGLE_RISK_FLAGS = 'admissions:toggle_risk_flags',
  ADMISSIONS_ENTER_PII = 'admissions:enter_pii',
  ADMISSIONS_UPDATE_PII = 'admissions:update_pii',
  PATIENTS_VIEW = 'patients:view',
  PATIENTS_VIEW_PII = 'patients:view_pii',

  // Staff Assignment & Emergency Override
  ASSIGNMENTS_CREATE = 'assignments:create',
  ASSIGNMENTS_REASSIGN = 'assignments:reassign',
  OVERRIDES_EMERGENCY = 'overrides:emergency',
  PATIENT_STAFF_VIEW = 'patient_staff:view',

  // Ward Staff Assignment & Duty Roster
  WARD_STAFF_VIEW = 'ward_staff:view',
  WARD_STAFF_MANAGE = 'ward_staff:manage',
  SHIFTS_VIEW = 'shifts:view',
  SHIFTS_MANAGE = 'shifts:manage',
  SHIFT_ASSIGNMENTS_MANAGE = 'shift_assignments:manage',
  HANDOVERS_CREATE = 'handovers:create',
  HANDOVERS_ACKNOWLEDGE = 'handovers:acknowledge',

  // Clinical Observations
  OBSERVATIONS_VIEW = 'observations:view',
  OBSERVATIONS_RECORD_BP = 'observations:record_blood_pressure',
  OBSERVATIONS_RECORD_GLUCOSE = 'observations:record_glucose',
  OBSERVATIONS_RECORD_FHR = 'observations:record_fetal_heart_rate',
  OBSERVATIONS_CORRECT = 'observations:correct',

  // Care Plan & Emergency Escalation
  CARE_PLAN_REVIEW = 'care_plan:review',
  CARE_PLAN_ESCALATE = 'care_plan:escalate',
  ALERTS_RECEIVE = 'alerts:receive',
  ALERTS_ACKNOWLEDGE = 'alerts:acknowledge',

  // Discharge & Turnover
  DISCHARGE_RECORD_OUTCOME = 'discharge:record_outcome',
  DISCHARGE_EXECUTE = 'discharge:execute',

  // Reports & Dashboards
  REPORTS_VIEW_DEIDENTIFIED = 'reports:view_deidentified',
  REPORTS_VIEW_BED_UTILIZATION = 'reports:view_bed_utilization',
  REPORTS_VIEW_AUDIT_LOGS = 'reports:view_audit_logs',
}
