import { DataSource } from 'typeorm';
import {
  AdmissionAnalyticsDto,
  AlosAnalyticsDto,
  BedUtilizationAnalyticsDto,
  ClinicalAlertAnalyticsDto,
  DeliveryAnalyticsDto,
  ExportFormat,
  NewbornAnalyticsDto,
  OperationalOverviewDto,
  OperationalReportType,
  ReportMetadataDto,
  StaffingAnalyticsDto,
} from '@lrms/shared';
import { AnalyticsRepository } from './analytics.repository.js';
import { ReportExportService } from './report-export.service.js';
import { AnalyticsQueryParams, ExportQueryParams } from './analytics.schemas.js';
import { resolveDateRange } from './analytics.date-range.js';

export class AnalyticsService {
  private readonly repository: AnalyticsRepository;
  private readonly exportService: ReportExportService;

  constructor(private readonly dataSource: DataSource) {
    this.repository = new AnalyticsRepository(dataSource);
    this.exportService = new ReportExportService(dataSource, this.repository);
  }

  async getOverview(params: AnalyticsQueryParams): Promise<OperationalOverviewDto> {
    const range = resolveDateRange(params.preset, params.startDate, params.endDate);
    return this.repository.getOverviewKpis(range, params.wardId);
  }

  async getAdmissions(params: AnalyticsQueryParams): Promise<AdmissionAnalyticsDto> {
    const range = resolveDateRange(params.preset, params.startDate, params.endDate);
    return this.repository.getAdmissionAnalytics(range, params.wardId);
  }

  async getDeliveries(params: AnalyticsQueryParams): Promise<DeliveryAnalyticsDto> {
    const range = resolveDateRange(params.preset, params.startDate, params.endDate);
    return this.repository.getDeliveryAnalytics(range, params.wardId);
  }

  async getNewborns(params: AnalyticsQueryParams): Promise<NewbornAnalyticsDto> {
    const range = resolveDateRange(params.preset, params.startDate, params.endDate);
    return this.repository.getNewbornAnalytics(range, params.wardId);
  }

  async getBeds(params: AnalyticsQueryParams): Promise<BedUtilizationAnalyticsDto> {
    const range = resolveDateRange(params.preset, params.startDate, params.endDate);
    return this.repository.getBedUtilizationAnalytics(range, params.wardId);
  }

  async getAlos(params: AnalyticsQueryParams): Promise<AlosAnalyticsDto> {
    const range = resolveDateRange(params.preset, params.startDate, params.endDate);
    return this.repository.getAlosAnalytics(range, params.wardId);
  }

  async getStaffing(params: AnalyticsQueryParams): Promise<StaffingAnalyticsDto> {
    const range = resolveDateRange(params.preset, params.startDate, params.endDate);
    return this.repository.getStaffingAnalytics(range, params.wardId);
  }

  async getClinicalAlerts(params: AnalyticsQueryParams): Promise<ClinicalAlertAnalyticsDto> {
    const range = resolveDateRange(params.preset, params.startDate, params.endDate);
    return this.repository.getClinicalAlertAnalytics(range, params.wardId);
  }

  async getSystemHealth(): Promise<Record<string, unknown>> {
    return this.repository.getSystemHealth();
  }

  getReportsCatalog(): ReportMetadataDto[] {
    return [
      {
        type: OperationalReportType.DAILY_OPERATIONAL_SUMMARY,
        name: 'Daily Labour Room Operational Summary',
        description:
          'Comprehensive 24-hour summary of admissions, deliveries, bed status, and staffing.',
        category: 'OPERATIONAL',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.WEEKLY_OPERATIONAL_REPORT,
        name: 'Weekly Ward Performance Report',
        description: '7-day rolling aggregates of clinical throughput, occupancy, and escalations.',
        category: 'OPERATIONAL',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.MONTHLY_HOSPITAL_REPORT,
        name: 'Monthly Hospital Operational Report',
        description: 'Monthly summary aligned with Ministry of Health reporting requirements.',
        category: 'OPERATIONAL',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.ADMISSION_STATISTICS,
        name: 'Admission Categorization & Triage Report',
        description:
          'Detailed analysis of admission categories, risk flags, and daily patient inflow.',
        category: 'CLINICAL',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.DELIVERY_OUTCOMES,
        name: 'Clinical Delivery Modes & Outcomes Report',
        description:
          'Distribution of vaginal, vacuum, forceps, elective and emergency cesarean deliveries.',
        category: 'CLINICAL',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.NEWBORN_REGISTRATIONS,
        name: 'Newborn Registration & Birth Weight Report',
        description:
          'Live birth rates, fresh/macerated stillbirths, birth weight brackets, and Apgar trends.',
        category: 'CLINICAL',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.BED_UTILIZATION,
        name: 'Bed Occupancy & Asset Utilization Report',
        description: 'Current and time-weighted occupancy rates across functioning physical beds.',
        category: 'BEDS',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.BED_TURNOVER,
        name: 'Bed Cleaning & Sanitization Turnover Report',
        description:
          'Sanitization lifecycle timings, average turnaround time, and bed turnover delays.',
        category: 'BEDS',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.MATERNAL_ALOS,
        name: 'Maternal Average Length of Stay (ALOS) Report',
        description: 'Completed maternal stays by admission category and mode of delivery.',
        category: 'CLINICAL',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.NEWBORN_ALOS,
        name: 'Newborn Length of Stay & SCBU Transfer Report',
        description: 'Independent infant length of stay and transfer destinations (SCBU / NICU).',
        category: 'CLINICAL',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.STAFF_SHIFT_COVERAGE,
        name: 'Ward Shift Coverage & Roster Report',
        description:
          'Scheduled versus covered shift slots across morning, evening, and night shifts.',
        category: 'STAFFING',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.STAFF_WORKLOAD,
        name: 'Clinician Responsibility & Patient Ratio Report',
        description:
          'Active and completed patient assignments per attending doctor and primary nurse.',
        category: 'STAFFING',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
      {
        type: OperationalReportType.CLINICAL_ALERT_RESPONSE,
        name: 'Clinical Escalation & Emergency Latency Report',
        description: 'Proof-of-receipt acknowledgement times and 3-minute SLA compliance rates.',
        category: 'CLINICAL',
        availableFormats: [ExportFormat.CSV, ExportFormat.PRINT_PDF],
      },
    ];
  }

  async exportReport(
    params: ExportQueryParams,
    userId: string,
    ipAddress?: string,
  ): Promise<{ filename: string; mimeType: string; content: string }> {
    const range = resolveDateRange(params.preset, params.startDate, params.endDate);
    return this.exportService.generateExport(
      params.reportType,
      params.format,
      range,
      userId,
      params.wardId,
      ipAddress,
    );
  }
}
