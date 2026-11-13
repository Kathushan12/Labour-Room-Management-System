/**
 * SYNTHETIC UI PREVIEW FIXTURES (DEMO ONLY)
 * -------------------------------------------------------------
 * Strictly for local frontend rendering and design demonstration.
 * - Entirely fictional, non-identifiable sample data.
 * - Never written to PostgreSQL or sent to backend APIs.
 * - Zero real Patient PII or clinical diagnostic interpretations.
 */

import {
  AdmissionCategory,
  CarePlanState,
  AdmissionStatus,
  BedFunctioningStatus,
  BedOccupancyStatus,
  AlertSeverity,
  AlertReceiptState,
  UserRole,
} from '@lrms/shared';

export interface PreviewAdmission {
  id: string;
  referenceId: string;
  category: AdmissionCategory;
  carePlan: CarePlanState;
  status: AdmissionStatus;
  admittedAt: string;
  bedNumber: string | null;
  patientPlaceholder: string;
  assignedDoctor: string;
  assignedNurse: string;
  riskFlags: string[];
}

export interface PreviewBed {
  id: string;
  bedNumber: string;
  functioningStatus: BedFunctioningStatus;
  occupancyStatus: BedOccupancyStatus;
  currentAdmissionRef: string | null;
  patientNameMasked: string | null;
  category: AdmissionCategory | null;
  lastCleaned: string | null;
}

export interface PreviewAlert {
  id: string;
  admissionRef: string;
  bedNumber: string;
  alertType: string;
  severity: AlertSeverity;
  receiptState: AlertReceiptState;
  message: string;
  dispatchedAt: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

export const PREVIEW_ADMISSIONS: PreviewAdmission[] = [
  {
    id: 'adm-001',
    referenceId: 'ADM-2026-0001',
    category: AdmissionCategory.NORMAL_DELIVERY,
    carePlan: CarePlanState.NORMAL_DELIVERY,
    status: AdmissionStatus.ADMITTED,
    admittedAt: '2026-11-11T06:30:00Z',
    bedNumber: 'BED-01',
    patientPlaceholder: 'Patient #4082 (NIC: *******123V)',
    assignedDoctor: 'Dr. Jayawardena',
    assignedNurse: 'Midwife Silva',
    riskFlags: ['Hypertension'],
  },
  {
    id: 'adm-002',
    referenceId: 'ADM-2026-0002',
    category: AdmissionCategory.SCHEDULED_CESAREAN,
    carePlan: CarePlanState.SCHEDULED_CESAREAN,
    status: AdmissionStatus.ADMITTED,
    admittedAt: '2026-11-11T07:15:00Z',
    bedNumber: 'BED-02',
    patientPlaceholder: 'Patient #4083 (NIC: *******456V)',
    assignedDoctor: 'Dr. Wickramasinghe',
    assignedNurse: 'Midwife Silva',
    riskFlags: ['Previous Cesarean Section'],
  },
  {
    id: 'adm-003',
    referenceId: 'ADM-2026-0003',
    category: AdmissionCategory.OBSERVATION_20_PLUS_WEEKS,
    carePlan: CarePlanState.OBSERVATION_20_PLUS_WEEKS,
    status: AdmissionStatus.ADMITTED,
    admittedAt: '2026-11-11T08:45:00Z',
    bedNumber: 'BED-03',
    patientPlaceholder: 'Patient #4084 (NIC: *******789V)',
    assignedDoctor: 'Dr. Jayawardena',
    assignedNurse: 'Midwife Fernando',
    riskFlags: ['Gestational Diabetes', 'Observation (>= 20 Wks)'],
  },
];

export const PREVIEW_BEDS: PreviewBed[] = [
  {
    id: 'bed-1',
    bedNumber: 'BED-01',
    functioningStatus: BedFunctioningStatus.FUNCTIONING,
    occupancyStatus: BedOccupancyStatus.OCCUPIED,
    currentAdmissionRef: 'ADM-2026-0001',
    patientNameMasked: 'Patient #4082',
    category: AdmissionCategory.NORMAL_DELIVERY,
    lastCleaned: '2026-11-10T18:00:00Z',
  },
  {
    id: 'bed-2',
    bedNumber: 'BED-02',
    functioningStatus: BedFunctioningStatus.FUNCTIONING,
    occupancyStatus: BedOccupancyStatus.OCCUPIED,
    currentAdmissionRef: 'ADM-2026-0002',
    patientNameMasked: 'Patient #4083',
    category: AdmissionCategory.SCHEDULED_CESAREAN,
    lastCleaned: '2026-11-10T19:30:00Z',
  },
  {
    id: 'bed-3',
    bedNumber: 'BED-03',
    functioningStatus: BedFunctioningStatus.FUNCTIONING,
    occupancyStatus: BedOccupancyStatus.OCCUPIED,
    currentAdmissionRef: 'ADM-2026-0003',
    patientNameMasked: 'Patient #4084',
    category: AdmissionCategory.OBSERVATION_20_PLUS_WEEKS,
    lastCleaned: '2026-11-11T05:00:00Z',
  },
  {
    id: 'bed-4',
    bedNumber: 'BED-04',
    functioningStatus: BedFunctioningStatus.FUNCTIONING,
    occupancyStatus: BedOccupancyStatus.CLEANING,
    currentAdmissionRef: null,
    patientNameMasked: null,
    category: null,
    lastCleaned: null,
  },
  {
    id: 'bed-5',
    bedNumber: 'BED-05',
    functioningStatus: BedFunctioningStatus.FUNCTIONING,
    occupancyStatus: BedOccupancyStatus.AVAILABLE,
    currentAdmissionRef: null,
    patientNameMasked: null,
    category: null,
    lastCleaned: '2026-11-11T06:15:00Z',
  },
  {
    id: 'bed-6',
    bedNumber: 'BED-06',
    functioningStatus: BedFunctioningStatus.OUT_OF_SERVICE,
    occupancyStatus: BedOccupancyStatus.AVAILABLE,
    currentAdmissionRef: null,
    patientNameMasked: null,
    category: null,
    lastCleaned: null,
  },
  {
    id: 'bed-7',
    bedNumber: 'BED-07',
    functioningStatus: BedFunctioningStatus.OUT_OF_SERVICE,
    occupancyStatus: BedOccupancyStatus.AVAILABLE,
    currentAdmissionRef: null,
    patientNameMasked: null,
    category: null,
    lastCleaned: null,
  },
];

export const PREVIEW_ALERTS: PreviewAlert[] = [
  {
    id: 'alt-001',
    admissionRef: 'ADM-2026-0001',
    bedNumber: 'BED-01',
    alertType: 'FETAL_HEART_RATE_DECELERATION',
    severity: AlertSeverity.EMERGENCY,
    receiptState: AlertReceiptState.DELIVERED,
    message: 'Persistent fetal heart rate deceleration observed. Immediate doctor review required.',
    dispatchedAt: '2026-11-11T09:12:00Z',
    deliveredAt: '2026-11-11T09:12:02Z',
    acknowledgedAt: null,
    acknowledgedBy: null,
  },
  {
    id: 'alt-002',
    admissionRef: 'ADM-2026-0002',
    bedNumber: 'BED-02',
    alertType: 'EMERGENCY_CESAREAN_ESCALATION',
    severity: AlertSeverity.EMERGENCY,
    receiptState: AlertReceiptState.ACKNOWLEDGED,
    message: 'Clinical escalation to emergency cesarean section confirmed. Theatre notified.',
    dispatchedAt: '2026-11-11T08:30:00Z',
    deliveredAt: '2026-11-11T08:30:01Z',
    acknowledgedAt: '2026-11-11T08:31:14Z',
    acknowledgedBy: 'Dr. Jayawardena',
  },
];

export const PREVIEW_STAFF = [
  {
    id: 'usr-001',
    name: 'Dr. K. Jayawardena',
    role: UserRole.DOCTOR,
    regId: 'SLMC-18294',
    email: 'k.jayawardena@hospital.lk',
    status: 'ACTIVE',
    activeAssignments: 2,
  },
  {
    id: 'usr-002',
    name: 'Staff Midwife Silva',
    role: UserRole.NURSE_STAFF,
    regId: 'SLNC-55219',
    email: 'm.silva@hospital.lk',
    status: 'ACTIVE',
    activeAssignments: 3,
  },
  {
    id: 'usr-003',
    name: 'Dr. A. Wickramasinghe',
    role: UserRole.DOCTOR,
    regId: 'SLMC-21045',
    email: 'a.wickramasinghe@hospital.lk',
    status: 'ACTIVE',
    activeAssignments: 1,
  },
  {
    id: 'usr-004',
    name: 'System Administrator',
    role: UserRole.ADMIN,
    regId: null,
    email: 'admin@hospital.lk',
    status: 'ACTIVE',
    activeAssignments: 0,
  },
];
