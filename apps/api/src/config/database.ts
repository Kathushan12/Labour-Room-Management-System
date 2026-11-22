import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env.js';
import { logger } from '../common/logging/logger.js';
import {
  Role,
  RiskFlagDefinition,
  Patient,
  PatientPii,
  Ward,
  Bed,
  BedStatusHistory,
  BedAllocationHistory,
  BedCleaningRecord,
  User,
  StaffProfile,
  RefreshSession,
  Admission,
  AdmissionRiskFlag,
  PatientStaffAssignment,
  StaffWardAssignment,
  Shift,
  ShiftStaffAssignment,
  ShiftHandover,
  EmergencyOverride,
  MaternalObservation,
  FetalObservation,
  LabourAssessment,
  ContractionObservation,
  ClinicalObservationAmendment,
  CarePlanTransition,
  EmergencyAlert,
  AlertRecipient,
  AlertDeliveryAttempt,
  NotificationOutbox,
  DischargeRecord,
  AuditLog,
  ClinicalCarePlan,
  ClinicalCarePlanVersion,
  ClinicalCarePlanReview,
  ClinicalEscalation,
  ClinicalEscalationHistory,
  EmergencyResponse,
  SurgicalReview,
  Notification,
  NotificationDeliveryAttempt,
  Delivery,
  Newborn,
  ApgarAssessment,
  PostpartumMaternalAssessment,
  PostpartumNewbornAssessment,
  PostpartumDischargeAuthorization,
} from '../database/entities/index.js';
import { InitialCleanSchema1731300000000 } from '../database/migrations/1731300000000-InitialCleanSchema.js';
import { AddSessionRevocationTracking1731400000000 } from '../database/migrations/1731400000000-AddSessionRevocationTracking.js';
import { AddStaffProfilesAndPasswordLifecycle1731500000000 } from '../database/migrations/1731500000000-AddStaffProfilesAndPasswordLifecycle.js';
import { HardenStaffProfilesAndEncryptContact1731600000000 } from '../database/migrations/1731600000000-HardenStaffProfilesAndEncryptContact.js';
import { Phase6PatientAndAdmissionHardening1731700000000 } from '../database/migrations/1731700000000-Phase6PatientAndAdmissionHardening.js';
import { EnforceUniqueNicBlindIndex1731800000000 } from '../database/migrations/1731800000000-EnforceUniqueNicBlindIndex.js';
import { Phase7WardBedCleaningAndTurnover1731900000000 } from '../database/migrations/1731900000000-Phase7WardBedCleaningAndTurnover.js';
import { Phase8StaffShiftsAndPatientAssignments1732000000000 } from '../database/migrations/1732000000000-Phase8StaffShiftsAndPatientAssignments.js';
import { Phase9ClinicalObservationsPartograph1732100000000 } from '../database/migrations/1732100000000-Phase9ClinicalObservationsPartograph.js';
import { Phase10ClinicalCareAndEscalation1732200000000 } from '../database/migrations/1732200000000-Phase10ClinicalCareAndEscalation.js';
import { Phase11RealTimeNotifications1732300000000 } from '../database/migrations/1732300000000-Phase11RealTimeNotifications.js';
import { Phase12DeliveryNewbornPostpartum1732400000000 } from '../database/migrations/1732400000000-Phase12DeliveryNewbornPostpartum.js';
import { Phase13OperationalAnalyticsIndexes1732500000000 } from '../database/migrations/1732500000000-Phase13OperationalAnalyticsIndexes.js';
import { Phase14EscalationAlertReceipt1732600000000 } from '../database/migrations/1732600000000-Phase14EscalationAlertReceipt.js';

export const entities = [
  Role,
  RiskFlagDefinition,
  Patient,
  PatientPii,
  Ward,
  Bed,
  BedStatusHistory,
  BedAllocationHistory,
  BedCleaningRecord,
  User,
  StaffProfile,
  RefreshSession,
  Admission,
  AdmissionRiskFlag,
  PatientStaffAssignment,
  StaffWardAssignment,
  Shift,
  ShiftStaffAssignment,
  ShiftHandover,
  EmergencyOverride,
  MaternalObservation,
  FetalObservation,
  LabourAssessment,
  ContractionObservation,
  ClinicalObservationAmendment,
  CarePlanTransition,
  EmergencyAlert,
  AlertRecipient,
  AlertDeliveryAttempt,
  NotificationOutbox,
  DischargeRecord,
  AuditLog,
  ClinicalCarePlan,
  ClinicalCarePlanVersion,
  ClinicalCarePlanReview,
  ClinicalEscalation,
  ClinicalEscalationHistory,
  EmergencyResponse,
  SurgicalReview,
  Notification,
  NotificationDeliveryAttempt,
  Delivery,
  Newborn,
  ApgarAssessment,
  PostpartumMaternalAssessment,
  PostpartumNewbornAssessment,
  PostpartumDischargeAuthorization,
];

export const migrations = [
  InitialCleanSchema1731300000000,
  AddSessionRevocationTracking1731400000000,
  AddStaffProfilesAndPasswordLifecycle1731500000000,
  HardenStaffProfilesAndEncryptContact1731600000000,
  Phase6PatientAndAdmissionHardening1731700000000,
  EnforceUniqueNicBlindIndex1731800000000,
  Phase7WardBedCleaningAndTurnover1731900000000,
  Phase8StaffShiftsAndPatientAssignments1732000000000,
  Phase9ClinicalObservationsPartograph1732100000000,
  Phase10ClinicalCareAndEscalation1732200000000,
  Phase11RealTimeNotifications1732300000000,
  Phase12DeliveryNewbornPostpartum1732400000000,
  Phase13OperationalAnalyticsIndexes1732500000000,
  Phase14EscalationAlertReceipt1732600000000,
];

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: false, // Strictly false: migrations are required
  migrationsRun: false, // Explicit migration execution
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities,
  migrations,
  subscribers: [],
  extra: {
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
});

export async function initializeDatabase(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    logger.info('Initializing PostgreSQL TypeORM connection pool...');
    await AppDataSource.initialize();
    logger.info('PostgreSQL connection established successfully');
  }
  return AppDataSource;
}

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.query('SELECT 1;');
    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    logger.error({ err: message }, 'Database connection healthcheck probe failed');
    return {
      connected: false,
      error: message,
    };
  }
}
