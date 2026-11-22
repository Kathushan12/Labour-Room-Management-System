import { AnalyticsDateRangePreset, OperationalReportType, ExportFormat } from '../enums/index.js';

export interface AnalyticsDateRange {
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  preset: AnalyticsDateRangePreset;
  timezone: string; // e.g. 'Asia/Colombo'
}

export type TrendDirection = 'UP' | 'DOWN' | 'STABLE' | 'NEUTRAL';

export interface KpiComparison {
  currentValue: number;
  previousValue: number | null;
  percentageChange: number | null; // e.g. +12.5 or -5.2
  trend: TrendDirection;
}

export interface OperationalOverviewDto {
  period: AnalyticsDateRange;
  totalAdmissions: KpiComparison;
  currentActiveAdmissions: number;
  totalDeliveries: KpiComparison;
  totalNewborns: KpiComparison;
  totalFunctioningBeds: number;
  currentlyOccupiedBeds: number;
  availableBeds: number;
  cleaningBeds: number;
  maintenanceBeds: number;
  currentOccupancyRate: number | null; // Percentage 0-100
  timeWeightedOccupancyRate: number | null; // Percentage 0-100
  averageBedCleaningTurnaroundMins: number | null;
  maternalAlosDays: number | null;
  newbornAlosDays: number | null;
  alertProofOfReceiptLatencySeconds: number | null;
  activeOnDutyDoctors: number;
  activeOnDutyNurses: number;
  generatedAt: string;
}

export interface AdmissionAnalyticsDto {
  period: AnalyticsDateRange;
  totalAdmissions: number;
  activeAdmissionsCount: number;
  dischargedAdmissionsCount: number;
  transferredAdmissionsCount: number;
  admissionsByCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  admissionsByStatus: Array<{
    status: string;
    count: number;
  }>;
  dailyTrends: Array<{
    date: string; // YYYY-MM-DD
    admissions: number;
    discharges: number;
  }>;
}

export interface DeliveryAnalyticsDto {
  period: AnalyticsDateRange;
  totalDeliveries: number;
  deliveriesByMode: Array<{
    mode: string;
    count: number;
    percentage: number;
  }>;
  multipleBirthDeliveriesCount: number;
  multipleBirthRatioPercentage: number;
  averageBloodLossMl: number | null;
  perinealTraumaDistribution: Array<{
    status: string;
    count: number;
  }>;
  placentaDeliveryStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
  dailyTrends: Array<{
    date: string;
    vaginal: number;
    cesarean: number;
    assisted: number;
  }>;
}

export interface NewbornAnalyticsDto {
  period: AnalyticsDateRange;
  totalNewborns: number;
  outcomeDistribution: Array<{
    outcome: string;
    count: number;
    percentage: number;
  }>;
  liveBirthCount: number;
  stillbirthFreshCount: number;
  stillbirthMaceratedCount: number;
  neonatalDeathCount: number;
  sexDistribution: Array<{
    sex: string;
    count: number;
    percentage: number;
  }>;
  weightBrackets: Array<{
    bracket: string; // '< 1500g', '1500g-2499g', '2500g-3999g', '>= 4000g'
    count: number;
    percentage: number;
  }>;
  averageBirthWeightGrams: number | null;
  singletonCount: number;
  multipleBirthCount: number;
  dischargeStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
  apgarScoreDistribution: Array<{
    minute: string; // '1_MIN', '5_MIN', '10_MIN'
    averageScore: number;
    count: number;
  }>;
}

export interface BedUtilizationAnalyticsDto {
  period: AnalyticsDateRange;
  totalInstalledBeds: number;
  functioningBeds: number;
  outOfServiceBeds: number;
  currentlyOccupiedBeds: number;
  availableBeds: number;
  cleaningRequiredBeds: number;
  cleaningInProgressBeds: number;
  currentOccupancyRate: number | null; // (occupied / functioning) * 100
  timeWeightedOccupancyRate: number | null;
  cleaningTurnaroundStats: {
    totalCleaningCyclesCompleted: number;
    averageCleaningTurnaroundMins: number | null;
    medianCleaningTurnaroundMins: number | null;
    minCleaningTurnaroundMins: number | null;
    maxCleaningTurnaroundMins: number | null;
  };
  bedUtilizationList: Array<{
    bedId: string;
    bedNumber: string;
    isActive: boolean;
    currentStatus: string;
    totalAllocationsInPeriod: number;
    occupiedHours: number;
    occupancyPercentage: number;
  }>;
  dailyOccupancyTrends: Array<{
    date: string;
    occupancyRate: number;
  }>;
}

export interface AlosAnalyticsDto {
  period: AnalyticsDateRange;
  completedMaternalAdmissionsCount: number;
  maternalAlosDays: number | null;
  maternalMedianLosDays: number | null;
  maternalMinLosDays: number | null;
  maternalMaxLosDays: number | null;
  ongoingMaternalStaysCount: number;
  ongoingMaternalAvgDays: number | null;
  maternalAlosByCategory: Array<{
    category: string;
    count: number;
    alosDays: number | null;
  }>;
  maternalAlosByDeliveryMode: Array<{
    mode: string;
    count: number;
    alosDays: number | null;
  }>;
  completedNewbornStaysCount: number;
  newbornAlosDays: number | null;
  newbornMedianLosDays: number | null;
  newbornMinLosDays: number | null;
  newbornMaxLosDays: number | null;
  ongoingNewbornStaysCount: number;
  monthlyAlosTrends: Array<{
    month: string; // YYYY-MM
    maternalAlos: number | null;
    newbornAlos: number | null;
  }>;
}

export interface StaffingAnalyticsDto {
  period: AnalyticsDateRange;
  totalActiveDoctors: number;
  totalActiveNurses: number;
  activeWardAffiliations: number;
  totalScheduledShifts: number;
  shiftsByStatus: Array<{
    status: string;
    count: number;
  }>;
  shiftsByType: Array<{
    shiftType: string;
    count: number;
  }>;
  currentOnDutyDoctorsCount: number;
  currentOnDutyNursesCount: number;
  unassignedActiveAdmissionsCount: number;
  doctorWorkload: Array<{
    staffId: string;
    staffName: string;
    staffRegistrationId: string | null;
    activeAssignedAdmissions: number;
    completedAssignedAdmissions: number;
    scheduledShiftsCount: number;
  }>;
  nurseWorkload: Array<{
    staffId: string;
    staffName: string;
    staffRegistrationId: string | null;
    activeAssignedAdmissions: number;
    completedAssignedAdmissions: number;
    scheduledShiftsCount: number;
  }>;
}

export interface ClinicalAlertAnalyticsDto {
  period: AnalyticsDateRange;
  totalEmergencyAlerts: number;
  totalClinicalEscalations: number;
  totalEmergencyResponses: number;
  totalSurgicalReviews: number;
  alertsBySeverity: Array<{
    severity: string;
    count: number;
  }>;
  acknowledgedAlertsCount: number;
  averageAcknowledgementLatencySeconds: number | null;
  medianAcknowledgementLatencySeconds: number | null;
  slaUnder3MinutesPercentage: number | null;
  // REQ-9.3: proof-of-receipt figures for doctor alerts (one alert per escalation).
  alertReceipts: {
    totalAlerts: number;
    deliveredCount: number;
    acknowledgedCount: number;
    timedOutCount: number;
    averageSecondsToDelivered: number | null;
    averageSecondsToAcknowledged: number | null;
    alerts: AlertReceiptReportRow[];
  };
  notificationOutboxStats: {
    totalEvents: number;
    processedEvents: number;
    pendingEvents: number;
    deadLetterEvents: number;
  };
}

export interface AlertReceiptReportRow {
  escalationReferenceId: string;
  admissionReferenceId: string;
  bedNumber: string | null;
  reason: string | null;
  dispatchedAt: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  timedOutAt: string | null;
  secondsToDelivered: number | null;
  secondsToAcknowledged: number | null;
}

export interface ReportMetadataDto {
  type: OperationalReportType;
  name: string;
  description: string;
  category: 'OPERATIONAL' | 'CLINICAL' | 'BEDS' | 'STAFFING';
  availableFormats: ExportFormat[];
}

export interface ExportReportQuery {
  reportType: OperationalReportType;
  format: ExportFormat;
  preset?: AnalyticsDateRangePreset;
  startDate?: string;
  endDate?: string;
  wardId?: string;
}

