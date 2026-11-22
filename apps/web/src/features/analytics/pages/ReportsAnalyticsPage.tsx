import React, { useState } from 'react';
import { AnalyticsDateRangePreset, OperationalReportType, ExportFormat } from '@lrms/shared';
import { analyticsApi } from '../../../services/analytics.api.js';
import { PageHeader } from '../../../components/shared/HeadersAndCards.js';
import { Button } from '../../../components/ui/button.js';
import {
  AnalyticsDateRangeFilter,
  AnalyticsFilterState,
} from '../components/AnalyticsDateRangeFilter.js';
import {
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ReportCatalogItem {
  type: OperationalReportType;
  title: string;
  description: string;
  targetAudience: string;
  frequency: string;
  badge?: string;
}

const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    type: OperationalReportType.DAILY_OPERATIONAL_SUMMARY,
    title: 'Daily Labour Room Operational Summary',
    description:
      'High-level 24-hour summary of admissions, deliveries, newborn outcomes, bed occupancy, ALOS, and alert SLA response.',
    targetAudience: 'Hospital Director, Clinical Director, Ward Sister',
    frequency: 'Daily (08:00 Colombo Time)',
    badge: 'Executive',
  },
  {
    type: OperationalReportType.WEEKLY_OPERATIONAL_REPORT,
    title: 'Weekly Ward Performance Report',
    description:
      '7-day rolling aggregates of clinical throughput, occupancy, bed turnover, and emergency escalations.',
    targetAudience: 'Clinical Director, Quality Management Unit',
    frequency: 'Weekly',
  },
  {
    type: OperationalReportType.MONTHLY_HOSPITAL_REPORT,
    title: 'Monthly Hospital Operational Report',
    description:
      'Official monthly summary aligned with Sri Lanka Ministry of Health reporting requirements and statutory indicators.',
    targetAudience: 'Hospital Director, Ministry of Health (FHB)',
    frequency: 'Monthly',
    badge: 'MOH Statutory',
  },
  {
    type: OperationalReportType.ADMISSION_STATISTICS,
    title: 'Detailed Admission & Triage Log',
    description:
      'Chronological patient admission intake, classified by clinical urgency, triage category, and disposition status.',
    targetAudience: 'Triage Medical Officer, Ward Sister',
    frequency: 'Daily / Shift Handoff',
  },
  {
    type: OperationalReportType.DELIVERY_OUTCOMES,
    title: 'Delivery Modes & Maternal Outcomes Report',
    description:
      'Comprehensive delivery modes (Vaginal, Instrumental, C-Section), blood loss volumes, and perineal trauma distribution.',
    targetAudience: 'Consultant Obstetricians, Family Health Bureau',
    frequency: 'Monthly / Quarterly',
    badge: 'Clinical Audit',
  },
  {
    type: OperationalReportType.NEWBORN_REGISTRATIONS,
    title: 'Newborn Clinical Registry & Apgar Record',
    description:
      'Infant birth weights, gestational ages, 1-min, 5-min, and 10-min Apgar scores, resuscitation records, and neonatal outcomes.',
    targetAudience: 'Consultant Paediatrician, Neonatologist, Ward Sister',
    frequency: 'Monthly',
    badge: 'Registry',
  },
  {
    type: OperationalReportType.BED_UTILIZATION,
    title: 'Ward Bed Utilization & Capacity Audit',
    description:
      'Individual bed occupancy rates, allocation frequencies, cumulative occupied hours, and physical capacity.',
    targetAudience: 'Ward Sister, Housekeeping Supervisor',
    frequency: 'Weekly / Monthly',
  },
  {
    type: OperationalReportType.BED_TURNOVER,
    title: 'Bed Cleaning Turnaround & Sanitation Report',
    description:
      'Discharge-to-cleaning turnaround time metrics, infection control compliance, and hygiene certification tracking.',
    targetAudience: 'Infection Control Lead, Ward Sister',
    frequency: 'Weekly',
  },
  {
    type: OperationalReportType.MATERNAL_ALOS,
    title: 'Maternal Average Length of Stay (ALOS) Report',
    description:
      'Maternal hospitalization durations from admission to discharge stratified by risk category and delivery modality.',
    targetAudience: 'Obstetric Quality Committee, Hospital Director',
    frequency: 'Monthly',
  },
  {
    type: OperationalReportType.NEWBORN_ALOS,
    title: 'Newborn Average Length of Stay (ALOS) Report',
    description:
      'Strictly independent newborn hospitalization durations and release tracking in line with patient-privacy principles.',
    targetAudience: 'Paediatric Directorate, Clinical Director',
    frequency: 'Monthly',
  },
  {
    type: OperationalReportType.STAFF_SHIFT_COVERAGE,
    title: 'Clinical Staffing & Shift Coverage Audit',
    description:
      'Duty roster coverage rates, scheduled vs covered shifts, and on-duty headcounts across morning, evening, and night shifts.',
    targetAudience: 'Chief Nursing Officer, Clinical Director',
    frequency: 'Weekly / Monthly',
  },
  {
    type: OperationalReportType.STAFF_WORKLOAD,
    title: 'Staff Patient Caseload & Workload Report',
    description:
      'Active inpatient assignments per medical officer and nursing staff member in Ward 18.',
    targetAudience: 'Ward Sister, Obstetric Clinical Lead',
    frequency: 'Weekly',
  },
  {
    type: OperationalReportType.CLINICAL_ALERT_RESPONSE,
    title: 'Emergency Escalation & 3-Minute SLA Audit Log',
    description:
      'Proof-of-receipt latency audit, 3-minute emergency acknowledgment compliance, and escalation diagnosis breakdown.',
    targetAudience: 'Clinical Governance Committee, Emergency Lead',
    frequency: 'Monthly / Sentinel Audit',
    badge: 'Clinical Governance',
  },
];

export const ReportsAnalyticsPage: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    preset: AnalyticsDateRangePreset.THIS_MONTH,
  });
  const [exportingReport, setExportingReport] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    reportType: string;
    message: string;
    isError?: boolean;
  } | null>(null);

  const handleExport = async (type: OperationalReportType, format: ExportFormat) => {
    const key = `${type}-${format}`;
    setExportingReport(key);
    setFeedback(null);

    try {
      await analyticsApi.exportReport({
        reportType: type,
        format,
        preset: filters.preset,
        startDate: filters.startDate,
        endDate: filters.endDate,
        wardId: filters.wardId,
      });

      setFeedback({
        reportType: type,
        message:
          format === ExportFormat.CSV
            ? 'CSV file generated & downloaded (CWE-1236 sanitized).'
            : 'Printable HTML report opened in print window.',
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({
        reportType: type,
        message: err.message || 'Export failed. Please try again.',
        isError: true,
      });
    } finally {
      setExportingReport(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" data-testid="reports-analytics-page">
      <PageHeader
        title="Official Hospital Reports & Clinical Statistics Catalog"
        description="Official operational reports, clinical quality audits, and statutory Ministry of Health returns for Colombo South Teaching Hospital (Kalubowila) — Ward 18."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Operational Analytics', href: '/analytics' },
          { label: 'Official Reports', active: true },
        ]}
      />

      <AnalyticsDateRangeFilter filters={filters} onChange={setFilters} />

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center space-x-2 transition-all ${
            feedback.isError
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Report Grid (13 Reports) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORT_CATALOG.map((report) => {
          const isCsvLoading = exportingReport === `${report.type}-${ExportFormat.CSV}`;
          const isPrintLoading = exportingReport === `${report.type}-${ExportFormat.PRINT_PDF}`;

          return (
            <div
              key={report.type}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all space-y-4"
              data-testid={`report-card-${report.type}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-700 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  {report.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                      {report.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-3 leading-snug">
                  {report.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {report.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                  <div>
                    <span className="font-semibold text-slate-600">Audience: </span>
                    {report.targetAudience}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Interval: </span>
                    {report.frequency}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(report.type, ExportFormat.CSV)}
                  disabled={isCsvLoading || isPrintLoading}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                  aria-label={`Download ${report.title} CSV`}
                >
                  {isCsvLoading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 mr-1 text-teal-700" />
                  )}
                  <span>Export CSV</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(report.type, ExportFormat.PRINT_PDF)}
                  disabled={isCsvLoading || isPrintLoading}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                  aria-label={`Print ${report.title}`}
                >
                  {isPrintLoading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  )}
                  <span>Print Report</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
