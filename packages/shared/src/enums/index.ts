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
  PLANNED_CESAREAN = 'PLANNED_CESAREAN',
  OBSERVATION_20PLUS = 'OBSERVATION_20PLUS',
}

export enum CarePlanState {
  OBSERVATION_20PLUS = 'OBSERVATION_20PLUS',
  NORMAL_DELIVERY = 'NORMAL_DELIVERY',
  PLANNED_CESAREAN = 'PLANNED_CESAREAN',
  EMERGENCY_CESAREAN = 'EMERGENCY_CESAREAN',
  DELIVERED = 'DELIVERED',
  DISCHARGED = 'DISCHARGED',
}

export enum EscalationReason {
  FETAL_DISTRESS = 'FETAL_DISTRESS',
  FAILURE_TO_PROGRESS = 'FAILURE_TO_PROGRESS',
  MATERNAL_COMPLICATION = 'MATERNAL_COMPLICATION',
  OTHER = 'OTHER',
}

export enum DischargeDestination {
  POSTNATAL = 'POSTNATAL',
  ANTENATAL = 'ANTENATAL',
  THEATRE = 'THEATRE',
  ICU = 'ICU',
  OTHER = 'OTHER',
}

export enum AmnioticFluid {
  INTACT = 'INTACT',
  CLEAR = 'CLEAR',
  MECONIUM = 'MECONIUM',
  BLOOD = 'BLOOD',
}

export enum AdmissionStatus {
  ADMITTED = 'ADMITTED',
  TRANSFERRED = 'TRANSFERRED',
  DISCHARGED = 'DISCHARGED',
}

export enum RiskFlagKey {
  HYPERTENSION = 'HYPERTENSION',
  GESTATIONAL_DIABETES = 'GESTATIONAL_DIABETES',
  PRIOR_CESAREAN = 'PRIOR_CESAREAN',
  OBSERVATION_20PLUS = 'OBSERVATION_20PLUS',
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

// Values carried by the alert:state socket event. TIMED_OUT is a warning on top of the
// receipt state, not a fourth receipt state.
export enum AlertStateChange {
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  TIMED_OUT = 'TIMED_OUT',
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

export enum MembraneStatus {
  INTACT = 'INTACT',
  RUPTURED = 'RUPTURED',
}

export enum LiquorAppearance {
  INTACT = 'INTACT',
  CLEAR = 'CLEAR',
  MECONIUM_STAINED = 'MECONIUM_STAINED',
  BLOOD_STAINED = 'BLOOD_STAINED',
  ABSENT = 'ABSENT',
}

export enum FetalPosition {
  OA = 'OA',
  OP = 'OP',
  OT = 'OT',
  LOA = 'LOA',
  ROA = 'ROA',
  LOP = 'LOP',
  ROP = 'ROP',
  LOT = 'LOT',
  ROT = 'ROT',
  OTHER = 'OTHER',
}

export enum CaputGrade {
  NONE = 'NONE',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum MouldingGrade {
  ZERO = '0',
  PLUS_ONE = '+',
  PLUS_TWO = '++',
  PLUS_THREE = '+++',
}

export enum ContractionIntensity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
}

export enum ClinicalObservationType {
  MATERNAL = 'MATERNAL',
  FETAL = 'FETAL',
  LABOUR_ASSESSMENT = 'LABOUR_ASSESSMENT',
  CONTRACTION = 'CONTRACTION',
}

export enum CarePlanLifecycleState {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CarePlanReviewOutcome {
  APPROPRIATE_CONTINUE = 'APPROPRIATE_CONTINUE',
  MODIFICATION_REQUIRED = 'MODIFICATION_REQUIRED',
  ESCALATION_REQUIRED = 'ESCALATION_REQUIRED',
  DISCONTINUED = 'DISCONTINUED',
}

export enum EscalationCategory {
  MATERNAL = 'MATERNAL',
  FETAL = 'FETAL',
  LABOUR_PROGRESSION = 'LABOUR_PROGRESSION',
  RISK_FLAG = 'RISK_FLAG',
  OBSTETRIC_EMERGENCY = 'OBSTETRIC_EMERGENCY',
  OTHER = 'OTHER',
}

export enum EscalationPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum EscalationStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTION_IN_PROGRESS = 'ACTION_IN_PROGRESS',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum EmergencyResponseCategory {
  MATERNAL_EMERGENCY = 'MATERNAL_EMERGENCY',
  FETAL_EMERGENCY = 'FETAL_EMERGENCY',
  OBSTETRIC_EMERGENCY = 'OBSTETRIC_EMERGENCY',
  LABOUR_EMERGENCY = 'LABOUR_EMERGENCY',
  SURGICAL_REVIEW_REQUEST = 'SURGICAL_REVIEW_REQUEST',
}

export enum EmergencyResponseStatus {
  INITIATED = 'INITIATED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export enum SurgicalReviewStatus {
  REVIEW_REQUESTED = 'REVIEW_REQUESTED',
  CONSULTANT_REVIEW = 'CONSULTANT_REVIEW',
  DECISION_PENDING = 'DECISION_PENDING',
  DECISION_RECORDED = 'DECISION_RECORDED',
  PREPARATION_IN_PROGRESS = 'PREPARATION_IN_PROGRESS',
  READY_FOR_HANDOVER = 'READY_FOR_HANDOVER',
  CANCELLED = 'CANCELLED',
}

export enum CaesareanDecision {
  CONSIDERED = 'CONSIDERED',
  NOT_INDICATED = 'NOT_INDICATED',
  APPROVED_FOR_THEATRE = 'APPROVED_FOR_THEATRE',
  DEFERRED = 'DEFERRED',
}

export enum AnaesthesiaReviewStatus {
  PENDING = 'PENDING',
  REVIEWED_CLEAR = 'REVIEWED_CLEAR',
  HIGH_RISK_CLEAR = 'HIGH_RISK_CLEAR',
  FURTHER_STABILIZATION_REQUIRED = 'FURTHER_STABILIZATION_REQUIRED',
}

export enum TheatreReadinessStatus {
  NOT_INITIATED = 'NOT_INITIATED',
  THEATRE_NOTIFIED = 'THEATRE_NOTIFIED',
  PRE_OP_CHECKLIST_COMPLETE = 'PRE_OP_CHECKLIST_COMPLETE',
  THEATRE_READY = 'THEATRE_READY',
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
  OBSERVATIONS_RECORD_LABOUR = 'observations:record_labour',
  OBSERVATIONS_RECORD_CONTRACTION = 'observations:record_contraction',
  OBSERVATIONS_CORRECT = 'observations:correct',
  PARTOGRAPH_VIEW = 'partograph:view',

  // Care Plan & Emergency Escalation
  CARE_PLAN_REVIEW = 'care_plan:review',
  CARE_PLAN_ESCALATE = 'care_plan:escalate',
  CARE_PLANS_VIEW = 'care_plans:view',
  CARE_PLANS_CREATE = 'care_plans:create',
  CARE_PLANS_APPROVE = 'care_plans:approve',
  CARE_PLANS_TRANSITION = 'care_plans:transition',
  ESCALATIONS_VIEW = 'escalations:view',
  ESCALATIONS_CREATE = 'escalations:create',
  ESCALATIONS_ACKNOWLEDGE = 'escalations:acknowledge',
  ESCALATIONS_ASSIGN = 'escalations:assign',
  ESCALATIONS_RESOLVE = 'escalations:resolve',
  EMERGENCY_RESPONSES_VIEW = 'emergency_responses:view',
  EMERGENCY_RESPONSES_INITIATE = 'emergency_responses:initiate',
  EMERGENCY_RESPONSES_ACKNOWLEDGE = 'emergency_responses:acknowledge',
  SURGICAL_REVIEWS_VIEW = 'surgical_reviews:view',
  SURGICAL_REVIEWS_REQUEST = 'surgical_reviews:request',
  SURGICAL_REVIEWS_DECIDE = 'surgical_reviews:decide',
  SURGICAL_REVIEWS_COORDINATE = 'surgical_reviews:coordinate',
  ALERTS_RECEIVE = 'alerts:receive',
  ALERTS_ACKNOWLEDGE = 'alerts:acknowledge',

  // Discharge & Turnover
  DISCHARGE_RECORD_OUTCOME = 'discharge:record_outcome',
  DISCHARGE_EXECUTE = 'discharge:execute',

  // Reports & Dashboards
  REPORTS_VIEW_DEIDENTIFIED = 'reports:view_deidentified',
  REPORTS_VIEW_BED_UTILIZATION = 'reports:view_bed_utilization',
  REPORTS_VIEW_AUDIT_LOGS = 'reports:view_audit_logs',

  // Notifications (Phase 11)
  NOTIFICATIONS_VIEW = 'notifications:view',
  NOTIFICATIONS_MARK_READ = 'notifications:mark_read',

  // Delivery & Postpartum (Phase 12)
  DELIVERY_VIEW = 'delivery:view',
  DELIVERY_CREATE = 'delivery:create',
  DELIVERY_UPDATE = 'delivery:update',
  DELIVERY_FINALIZE = 'delivery:finalize',
  NEWBORN_VIEW = 'newborn:view',
  NEWBORN_REGISTER = 'newborn:register',
  NEWBORN_UPDATE = 'newborn:update',
  APGAR_RECORD = 'apgar:record',
  POSTPARTUM_ASSESS = 'postpartum:assess',
  POSTPARTUM_VIEW = 'postpartum:view',
  POSTPARTUM_DISCHARGE_AUTHORIZE = 'postpartum:discharge_authorize',

  // Operational Analytics & Reporting (Phase 13)
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_ADMISSIONS_VIEW = 'analytics:admissions:view',
  ANALYTICS_DELIVERIES_VIEW = 'analytics:deliveries:view',
  ANALYTICS_BEDS_VIEW = 'analytics:beds:view',
  ANALYTICS_ALOS_VIEW = 'analytics:alos:view',
  ANALYTICS_STAFFING_VIEW = 'analytics:staffing:view',
  ANALYTICS_ALERTS_VIEW = 'analytics:alerts:view',
  ANALYTICS_EXPORT = 'analytics:export',
}

export enum NotificationType {
  CLINICAL_ESCALATION_CREATED = 'CLINICAL_ESCALATION_CREATED',
  CLINICAL_ESCALATION_ASSIGNED = 'CLINICAL_ESCALATION_ASSIGNED',
  CLINICAL_ESCALATION_ACKNOWLEDGED = 'CLINICAL_ESCALATION_ACKNOWLEDGED',
  CLINICAL_ESCALATION_ESCALATED = 'CLINICAL_ESCALATION_ESCALATED',
  CLINICAL_ESCALATION_RESOLVED = 'CLINICAL_ESCALATION_RESOLVED',
  EMERGENCY_RESPONSE_INITIATED = 'EMERGENCY_RESPONSE_INITIATED',
  EMERGENCY_RESPONSE_ACKNOWLEDGED = 'EMERGENCY_RESPONSE_ACKNOWLEDGED',
  EMERGENCY_RESPONSE_RESOLVED = 'EMERGENCY_RESPONSE_RESOLVED',
  SURGICAL_REVIEW_REQUESTED = 'SURGICAL_REVIEW_REQUESTED',
  SURGICAL_DECISION_RECORDED = 'SURGICAL_DECISION_RECORDED',
  THEATRE_READINESS_UPDATED = 'THEATRE_READINESS_UPDATED',
  CARE_PLAN_APPROVAL_REQUIRED = 'CARE_PLAN_APPROVAL_REQUIRED',
  CARE_PLAN_APPROVED = 'CARE_PLAN_APPROVED',
  CARE_PLAN_REVIEW_DUE = 'CARE_PLAN_REVIEW_DUE',
  CARE_PLAN_REVIEW_OVERDUE = 'CARE_PLAN_REVIEW_OVERDUE',
  CARE_PLAN_AMENDED = 'CARE_PLAN_AMENDED',
  PATIENT_RESPONSIBILITY_ASSIGNED = 'PATIENT_RESPONSIBILITY_ASSIGNED',
  PATIENT_RESPONSIBILITY_TRANSFERRED = 'PATIENT_RESPONSIBILITY_TRANSFERRED',
  // Delivery & Postpartum (Phase 12)
  DELIVERY_RECORDED = 'DELIVERY_RECORDED',
  DELIVERY_FINALIZED = 'DELIVERY_FINALIZED',
  BIRTH_REGISTERED = 'BIRTH_REGISTERED',
  NEWBORN_REGISTERED = 'NEWBORN_REGISTERED',
  APGAR_RECORDED = 'APGAR_RECORDED',
  POSTPARTUM_REVIEW_DUE = 'POSTPARTUM_REVIEW_DUE',
  POSTPARTUM_REVIEW_COMPLETED = 'POSTPARTUM_REVIEW_COMPLETED',
  MATERNAL_DISCHARGE_AUTHORIZED = 'MATERNAL_DISCHARGE_AUTHORIZED',
  NEWBORN_DISCHARGE_AUTHORIZED = 'NEWBORN_DISCHARGE_AUTHORIZED',
}

export enum NotificationPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum SocketEvent {
  // Server to client
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_UPDATED = 'notification:updated',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_UNREAD_COUNT = 'notification:unread-count',
  ALERT_EMERGENCY = 'alert:emergency',
  ALERT_ESCALATION = 'alert:escalation',
  CONNECTION_READY = 'connection:ready',
  NOTIFICATION_SYNC_REQUIRED = 'notification:sync-required',
  ALERT_NEW = 'alert:new',
  ALERT_STATE = 'alert:state',
  BED_UPDATED = 'bed:updated',

  // Client to server
  JOIN_ROOM = 'room:join',
  LEAVE_ROOM = 'room:leave',
  ALERT_RECEIPT = 'alert:receipt',
}

// ==========================================
// Phase 12 Delivery, Newborn & Postpartum Enums
// ==========================================

export enum DeliveryStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
}

export enum DeliveryMode {
  NORMAL = 'NORMAL',
  ASSISTED = 'ASSISTED',
  CESAREAN = 'CESAREAN',
}

export enum BirthOutcome {
  LIVE_BIRTH = 'LIVE_BIRTH',
  STILLBIRTH_FRESH = 'STILLBIRTH_FRESH',
  STILLBIRTH_MACERATED = 'STILLBIRTH_MACERATED',
  NEONATAL_DEATH = 'NEONATAL_DEATH',
}

export enum NewbornSex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  INDETERMINATE = 'INDETERMINATE',
}

export enum NewbornDischargeStatus {
  IN_CARE = 'IN_CARE',
  DISCHARGED_WITH_MOTHER = 'DISCHARGED_WITH_MOTHER',
  TRANSFERRED_SCBU = 'TRANSFERRED_SCBU',
  TRANSFERRED_NICU = 'TRANSFERRED_NICU',
  DECEASED = 'DECEASED',
}

export enum ApgarMinute {
  ONE_MIN = '1_MIN',
  FIVE_MIN = '5_MIN',
  TEN_MIN = '10_MIN',
  FIFTEEN_MIN = '15_MIN',
  TWENTY_MIN = '20_MIN',
}

export enum UterineTone {
  WELL_CONTRACTED = 'WELL_CONTRACTED',
  RELAXED_BOGGY = 'RELAXED_BOGGY',
  TONIC = 'TONIC',
}

export enum LochiaAmount {
  SCANT = 'SCANT',
  NORMAL = 'NORMAL',
  MODERATE = 'MODERATE',
  HEAVY_EXCESSIVE = 'HEAVY_EXCESSIVE',
}

export enum LochiaType {
  RUBRA = 'RUBRA',
  SEROSA = 'SEROSA',
  ALBA = 'ALBA',
}

export enum NewbornGeneralCondition {
  VIGOROUS_ALERT = 'VIGOROUS_ALERT',
  LETHARGIC = 'LETHARGIC',
  IRRITABLE = 'IRRITABLE',
  CYANOTIC = 'CYANOTIC',
  APNEIC = 'APNEIC',
}

export enum NewbornFeedingStatus {
  BREASTFEEDING_DIRECT = 'BREASTFEEDING_DIRECT',
  EXPRESSED_BREAST_MILK = 'EXPRESSED_BREAST_MILK',
  FORMULA = 'FORMULA',
  IV_FLUIDS = 'IV_FLUIDS',
  NOT_TOLERATING = 'NOT_TOLERATING',
}

export enum NewbornCordCondition {
  CLEAN_DRY = 'CLEAN_DRY',
  BLEEDING = 'BLEEDING',
  SEROUS_DISCHARGE = 'SEROUS_DISCHARGE',
  ODOROUS = 'ODOROUS',
}

export enum NewbornJaundiceStatus {
  NONE = 'NONE',
  MILD_FACIAL = 'MILD_FACIAL',
  MODERATE_TRUNK = 'MODERATE_TRUNK',
  SEVERE_DISTAL = 'SEVERE_DISTAL',
}

export enum DischargedEntityType {
  MATERNAL = 'MATERNAL',
  NEWBORN = 'NEWBORN',
}

export enum MaternalReviewStatus {
  ROUTINE = 'ROUTINE',
  REVIEW_REQUESTED = 'REVIEW_REQUESTED',
  ESCALATED = 'ESCALATED',
}

export enum AnalyticsDateRangePreset {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  LAST_30_DAYS = 'LAST_30_DAYS',
  LAST_90_DAYS = 'LAST_90_DAYS',
  CUSTOM = 'CUSTOM',
}

export enum OperationalReportType {
  DAILY_OPERATIONAL_SUMMARY = 'DAILY_OPERATIONAL_SUMMARY',
  WEEKLY_OPERATIONAL_REPORT = 'WEEKLY_OPERATIONAL_REPORT',
  MONTHLY_HOSPITAL_REPORT = 'MONTHLY_HOSPITAL_REPORT',
  ADMISSION_STATISTICS = 'ADMISSION_STATISTICS',
  DELIVERY_OUTCOMES = 'DELIVERY_OUTCOMES',
  NEWBORN_REGISTRATIONS = 'NEWBORN_REGISTRATIONS',
  BED_UTILIZATION = 'BED_UTILIZATION',
  BED_TURNOVER = 'BED_TURNOVER',
  MATERNAL_ALOS = 'MATERNAL_ALOS',
  NEWBORN_ALOS = 'NEWBORN_ALOS',
  STAFF_SHIFT_COVERAGE = 'STAFF_SHIFT_COVERAGE',
  STAFF_WORKLOAD = 'STAFF_WORKLOAD',
  CLINICAL_ALERT_RESPONSE = 'CLINICAL_ALERT_RESPONSE',
}

export enum ExportFormat {
  CSV = 'CSV',
  PRINT_PDF = 'PRINT_PDF',
}
