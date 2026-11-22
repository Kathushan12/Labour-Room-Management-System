import { DataSource } from 'typeorm';
import { AuditLog } from '../../database/entities/index.js';
import { ExportFormat, OperationalReportType } from '@lrms/shared';
import { ResolvedDateRange } from './analytics.date-range.js';
import { AnalyticsRepository } from './analytics.repository.js';

// Reports show Asia/Colombo local time in 24-hour format.
function formatColomboTime(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export class ReportExportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly analyticsRepo: AnalyticsRepository,
  ) {}

  /**
   * Sanitizes string values to prevent formula injection in CSV exports (CWE-1236).
   */
  sanitizeCsvCell(val: unknown): string {
    if (val === null || val === undefined) {
      return '';
    }
    let str = String(val);
    // Neutralize spreadsheet formula triggers
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    // Escape quotes and wrap if contains comma, quote, or newline
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Builds CSV content from header array and row array.
   */
  buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
    const BOM = '\uFEFF';
    const headerLine = headers.map((h) => this.sanitizeCsvCell(h)).join(',');
    const rowLines = rows.map((row) => row.map((cell) => this.sanitizeCsvCell(cell)).join(','));
    return BOM + [headerLine, ...rowLines].join('\r\n');
  }

  /**
   * Logs an audit record for the report export.
   */
  async logExportAudit(
    userId: string,
    reportType: OperationalReportType,
    format: ExportFormat,
    range: ResolvedDateRange,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const auditRepo = this.dataSource.getRepository(AuditLog);
      const log = auditRepo.create({
        userId,
        action: 'REPORT_EXPORTED',
        entityName: 'OperationalReport',
        entityId: reportType,
        ipAddress: ipAddress || '127.0.0.1',
        details: {
          reportType,
          format,
          startDate: range.current.startDate.toISOString(),
          endDate: range.current.endDate.toISOString(),
          preset: range.current.preset,
          timezone: range.current.timezone,
        },
      });
      await auditRepo.save(log);
    } catch {
      // Non-blocking error handling for audit failure
    }
  }

  /**
   * Exports data according to report type.
   */
  async generateExport(
    reportType: OperationalReportType,
    format: ExportFormat,
    range: ResolvedDateRange,
    userId: string,
    wardId?: string,
    ipAddress?: string,
  ): Promise<{ filename: string; mimeType: string; content: string }> {
    await this.logExportAudit(userId, reportType, format, range, ipAddress);

    const datePrefix = range.current.startDate.toISOString().slice(0, 10);
    const filename = `LRMS_${reportType}_${datePrefix}.${format === ExportFormat.CSV ? 'csv' : 'html'}`;

    if (format === ExportFormat.CSV) {
      const csvData = await this.generateReportCsv(reportType, range, wardId);
      return {
        filename,
        mimeType: 'text/csv; charset=utf-8',
        content: csvData,
      };
    } else {
      const htmlData = await this.generateReportHtml(reportType, range, wardId);
      return {
        filename,
        mimeType: 'text/html; charset=utf-8',
        content: htmlData,
      };
    }
  }

  private async generateReportCsv(
    reportType: OperationalReportType,
    range: ResolvedDateRange,
    wardId?: string,
  ): Promise<string> {
    switch (reportType) {
      case OperationalReportType.DAILY_OPERATIONAL_SUMMARY:
      case OperationalReportType.WEEKLY_OPERATIONAL_REPORT:
      case OperationalReportType.MONTHLY_HOSPITAL_REPORT: {
        const overview = await this.analyticsRepo.getOverviewKpis(range, wardId);
        return this.buildCsv(
          [
            'Metric Category',
            'Metric Indicator',
            'Current Value',
            'Previous Period Value',
            'Percentage Change',
            'Unit',
          ],
          [
            [
              'Admissions',
              'Total Patient Admissions',
              overview.totalAdmissions.currentValue,
              overview.totalAdmissions.previousValue,
              overview.totalAdmissions.percentageChange ?? 'N/A',
              'Patients',
            ],
            [
              'Admissions',
              'Current Active Inpatient Admissions',
              overview.currentActiveAdmissions,
              'N/A',
              'N/A',
              'Patients',
            ],
            [
              'Deliveries',
              'Finalized Maternal Deliveries',
              overview.totalDeliveries.currentValue,
              overview.totalDeliveries.previousValue,
              overview.totalDeliveries.percentageChange ?? 'N/A',
              'Deliveries',
            ],
            [
              'Newborns',
              'Total Registered Newborns',
              overview.totalNewborns.currentValue,
              overview.totalNewborns.previousValue,
              overview.totalNewborns.percentageChange ?? 'N/A',
              'Infants',
            ],
            [
              'Bed Assets',
              'Total Functioning Beds',
              overview.totalFunctioningBeds,
              'N/A',
              'N/A',
              'Beds',
            ],
            [
              'Bed Assets',
              'Currently Occupied Beds',
              overview.currentlyOccupiedBeds,
              'N/A',
              'N/A',
              'Beds',
            ],
            [
              'Bed Assets',
              'Available Sanitized Beds',
              overview.availableBeds,
              'N/A',
              'N/A',
              'Beds',
            ],
            ['Bed Assets', 'Beds Undergoing Cleaning', overview.cleaningBeds, 'N/A', 'N/A', 'Beds'],
            [
              'Occupancy',
              'Current Bed Occupancy Rate',
              overview.currentOccupancyRate ?? 'N/A',
              'N/A',
              'N/A',
              '%',
            ],
            [
              'Occupancy',
              'Time-Weighted Bed Occupancy Rate',
              overview.timeWeightedOccupancyRate ?? 'N/A',
              'N/A',
              'N/A',
              '%',
            ],
            [
              'Sanitization',
              'Average Bed Cleaning Turnaround',
              overview.averageBedCleaningTurnaroundMins ?? 'N/A',
              'N/A',
              'N/A',
              'Minutes',
            ],
            [
              'Length of Stay',
              'Completed Maternal ALOS',
              overview.maternalAlosDays ?? 'N/A',
              'N/A',
              'N/A',
              'Days',
            ],
            [
              'Length of Stay',
              'Completed Newborn ALOS',
              overview.newbornAlosDays ?? 'N/A',
              'N/A',
              'N/A',
              'Days',
            ],
            [
              'Emergency',
              'Alert Proof-of-Receipt Latency',
              overview.alertProofOfReceiptLatencySeconds ?? 'N/A',
              'N/A',
              'N/A',
              'Seconds',
            ],
          ],
        );
      }

      case OperationalReportType.ADMISSION_STATISTICS: {
        const admissions = await this.analyticsRepo.getAdmissionAnalytics(range, wardId);
        const headers = ['Category / Date', 'Admissions Count', 'Percentage of Total (%)'];
        const rows = [
          ...admissions.admissionsByCategory.map((c) => [c.category, c.count, c.percentage]),
          ['--- Daily Breakdown ---', '', ''],
          ...admissions.dailyTrends.map((d) => [d.date, d.admissions, 'N/A']),
        ];
        return this.buildCsv(headers, rows);
      }

      case OperationalReportType.DELIVERY_OUTCOMES: {
        const deliveries = await this.analyticsRepo.getDeliveryAnalytics(range, wardId);
        const headers = ['Delivery Mode', 'Cases Count', 'Percentage (%)'];
        const rows = [
          ...deliveries.deliveriesByMode.map((m) => [m.mode, m.count, m.percentage]),
          ['Total Finalized Deliveries', deliveries.totalDeliveries, 100],
          [
            'Multiple Birth Deliveries',
            deliveries.multipleBirthDeliveriesCount,
            deliveries.multipleBirthRatioPercentage,
          ],
          [
            'Average Estimated Blood Loss',
            deliveries.averageBloodLossMl ? `${deliveries.averageBloodLossMl} ml` : 'N/A',
            'N/A',
          ],
        ];
        return this.buildCsv(headers, rows);
      }

      case OperationalReportType.NEWBORN_REGISTRATIONS: {
        const newborns = await this.analyticsRepo.getNewbornAnalytics(range, wardId);
        const headers = ['Metric / Outcome', 'Count', 'Percentage (%)'];
        const rows = [
          ...newborns.outcomeDistribution.map((o) => [o.outcome, o.count, o.percentage]),
          ['--- Sex Attribution ---', '', ''],
          ...newborns.sexDistribution.map((s) => [s.sex, s.count, s.percentage]),
          ['--- Birth Weight Categories ---', '', ''],
          ...newborns.weightBrackets.map((w) => [w.bracket, w.count, w.percentage]),
        ];
        return this.buildCsv(headers, rows);
      }

      case OperationalReportType.BED_UTILIZATION:
      case OperationalReportType.BED_TURNOVER: {
        const beds = await this.analyticsRepo.getBedUtilizationAnalytics(range, wardId);
        const headers = [
          'Bed Number',
          'Asset Active Status',
          'Current Status',
          'Period Allocations',
          'Occupied Hours',
          'Occupancy (%)',
        ];
        const rows = beds.bedUtilizationList.map((b) => [
          b.bedNumber,
          b.isActive ? 'Active' : 'Out of Service',
          b.currentStatus,
          b.totalAllocationsInPeriod,
          b.occupiedHours,
          b.occupancyPercentage,
        ]);
        return this.buildCsv(headers, rows);
      }

      case OperationalReportType.MATERNAL_ALOS:
      case OperationalReportType.NEWBORN_ALOS: {
        const alos = await this.analyticsRepo.getAlosAnalytics(range, wardId);
        const headers = [
          'Cohort / Dimension',
          'Sample Size (N)',
          'Average Length of Stay (Days)',
          'Median LOS (Days)',
        ];
        const rows = [
          [
            'Completed Maternal Admissions',
            alos.completedMaternalAdmissionsCount,
            alos.maternalAlosDays ?? 'N/A',
            alos.maternalMedianLosDays ?? 'N/A',
          ],
          [
            'Completed Newborn Stays',
            alos.completedNewbornStaysCount,
            alos.newbornAlosDays ?? 'N/A',
            alos.newbornMedianLosDays ?? 'N/A',
          ],
          [
            'Ongoing Maternal Inpatients',
            alos.ongoingMaternalStaysCount,
            alos.ongoingMaternalAvgDays ?? 'N/A',
            'N/A',
          ],
          ['Ongoing Newborns in Care', alos.ongoingNewbornStaysCount, 'N/A', 'N/A'],
          ['--- Maternal ALOS by Category ---', '', '', ''],
          ...alos.maternalAlosByCategory.map((c) => [
            c.category,
            c.count,
            c.alosDays ?? 'N/A',
            'N/A',
          ]),
        ];
        return this.buildCsv(headers, rows);
      }

      case OperationalReportType.STAFF_SHIFT_COVERAGE:
      case OperationalReportType.STAFF_WORKLOAD: {
        const staffing = await this.analyticsRepo.getStaffingAnalytics(range, wardId);
        const headers = [
          'Clinician Name',
          'Role',
          'Registration ID',
          'Active Admissions',
          'Completed Admissions',
          'Scheduled Shifts',
        ];
        const rows = [
          ...staffing.doctorWorkload.map((d) => [
            d.staffName,
            'Doctor',
            d.staffRegistrationId || 'N/A',
            d.activeAssignedAdmissions,
            d.completedAssignedAdmissions,
            d.scheduledShiftsCount,
          ]),
          ...staffing.nurseWorkload.map((n) => [
            n.staffName,
            'Nurse/Midwife',
            n.staffRegistrationId || 'N/A',
            n.activeAssignedAdmissions,
            n.completedAssignedAdmissions,
            n.scheduledShiftsCount,
          ]),
        ];
        return this.buildCsv(headers, rows);
      }

      case OperationalReportType.CLINICAL_ALERT_RESPONSE:
      default: {
        const alerts = await this.analyticsRepo.getClinicalAlertAnalytics(range, wardId);
        const headers = ['Alert Metric / Severity', 'Count', 'Response Time (Seconds)'];
        const rows = [
          ['Total Emergency Declarations', alerts.totalEmergencyAlerts, 'N/A'],
          ['Total Clinical Escalations', alerts.totalClinicalEscalations, 'N/A'],
          ['Acknowledged Alert Responses', alerts.acknowledgedAlertsCount, 'N/A'],
          [
            'Average Acknowledgement Latency',
            'N/A',
            alerts.averageAcknowledgementLatencySeconds
              ? `${alerts.averageAcknowledgementLatencySeconds}s`
              : 'N/A',
          ],
          [
            'Median Acknowledgement Latency',
            'N/A',
            alerts.medianAcknowledgementLatencySeconds
              ? `${alerts.medianAcknowledgementLatencySeconds}s`
              : 'N/A',
          ],
          [
            'Alerts within 3-Min SLA',
            `${alerts.slaUnder3MinutesPercentage ?? 0}%`,
            'Target: < 180s',
          ],
          ['Doctor Alerts Sent', alerts.alertReceipts.totalAlerts, 'N/A'],
          [
            'Delivered to Doctor Device',
            alerts.alertReceipts.deliveredCount,
            alerts.alertReceipts.averageSecondsToDelivered ?? 'N/A',
          ],
          [
            'Acknowledged by Doctor',
            alerts.alertReceipts.acknowledgedCount,
            alerts.alertReceipts.averageSecondsToAcknowledged ?? 'N/A',
          ],
          ['Timed Out (doctor phoned)', alerts.alertReceipts.timedOutCount, 'N/A'],
          [],
          [
            'Alert Ref',
            'Admission Ref',
            'Reason',
            'Dispatched',
            'Delivered',
            'Acknowledged',
            'Timed Out',
            'Seconds to Delivered',
            'Seconds to Acknowledged',
          ],
          ...alerts.alertReceipts.alerts.map((a) => [
            a.escalationReferenceId,
            a.admissionReferenceId,
            a.reason ?? '',
            formatColomboTime(a.dispatchedAt),
            formatColomboTime(a.deliveredAt),
            formatColomboTime(a.acknowledgedAt),
            formatColomboTime(a.timedOutAt),
            a.secondsToDelivered ?? '',
            a.secondsToAcknowledged ?? '',
          ]),
        ];
        return this.buildCsv(headers, rows);
      }
    }
  }

  private async generateReportHtml(
    reportType: OperationalReportType,
    range: ResolvedDateRange,
    wardId?: string,
  ): Promise<string> {
    const csvContent = await this.generateReportCsv(reportType, range, wardId);
    // Parse CSV lines into a readable HTML table
    const lines = csvContent
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    const headerCols = lines[0]?.split(',') || [];
    const rowLines = lines.slice(1);

    const tableRowsHtml = rowLines
      .map(
        (line) =>
          `<tr>${line
            .split(',')
            .map(
              (c) =>
                `<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${c.replace(/^['"]|['"]$/g, '')}</td>`,
            )
            .join('')}</tr>`,
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${reportType} — Colombo South Teaching Hospital</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0 0 6px 0; color: #0f172a; font-size: 24px; }
    .subtitle { margin: 0; color: #475569; font-size: 14px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
    th { background: #0f766e; color: #ffffff; text-align: left; padding: 10px 12px; font-weight: 600; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { margin: 20px; } .meta { background: none; border: 1px solid #cbd5e1; } th { -webkit-print-color-adjust: exact; color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Colombo South Teaching Hospital (Kalubowila)</h1>
    <div class="subtitle">Ward 18 — Labour Room Management System (LRMS)</div>
  </div>
  <div class="meta">
    <div><strong>Report Title:</strong> ${reportType.replace(/_/g, ' ')}</div>
    <div><strong>Reporting Period:</strong> ${range.current.startDate.toISOString().slice(0, 10)} to ${range.current.endDate.toISOString().slice(0, 10)} (${range.current.timezone})</div>
    <div><strong>Generated At:</strong> ${new Date().toISOString()}</div>
  </div>
  <table>
    <thead>
      <tr>${headerCols.map((h) => `<th>${h.replace(/^['"]|['"]$/g, '')}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>
  <div class="footer">
    Colombo South Teaching Hospital — Ward 18 Labour Room Management System · Confidential Clinical Operational Analytics · All Figures Generated from Verified Relational Database Records
  </div>
</body>
</html>`;
  }
}
