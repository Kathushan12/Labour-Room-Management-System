import React, { useState } from 'react';
import { AnalyticsDateRangePreset, OperationalReportType, ExportFormat } from '@lrms/shared';
import { analyticsApi } from '../../../services/analytics.api.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog.js';
import { Button } from '../../../components/ui/button.js';
import {
  Download,
  Printer,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ReportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultReportType?: OperationalReportType;
  defaultPreset?: AnalyticsDateRangePreset;
  defaultWardId?: string;
}

const REPORT_TYPE_OPTIONS: Array<{ value: OperationalReportType; label: string; desc: string }> = [
  {
    value: OperationalReportType.DAILY_OPERATIONAL_SUMMARY,
    label: 'Daily Labour Room Operational Summary',
    desc: '24-hour summary of admissions, deliveries, bed status, and staffing',
  },
  {
    value: OperationalReportType.WEEKLY_OPERATIONAL_REPORT,
    label: 'Weekly Ward Performance Report',
    desc: '7-day rolling aggregates of clinical throughput, occupancy, and escalations',
  },
  {
    value: OperationalReportType.MONTHLY_HOSPITAL_REPORT,
    label: 'Monthly Hospital Operational Report',
    desc: 'Official monthly summary aligned with Ministry of Health reporting requirements',
  },
  {
    value: OperationalReportType.ADMISSION_STATISTICS,
    label: 'Detailed Admission & Triage Report',
    desc: 'Patient admissions categorized by risk, triage level, and disposition',
  },
  {
    value: OperationalReportType.DELIVERY_OUTCOMES,
    label: 'Delivery Modes & Maternal Outcomes Report',
    desc: 'Modes of delivery, blood loss, postpartum monitoring, and surgical interventions',
  },
  {
    value: OperationalReportType.NEWBORN_REGISTRATIONS,
    label: 'Newborn Clinical Registry & Apgar Record',
    desc: 'Birth weights, gestational ages, 1m/5m/10m Apgar scores, and resuscitation events',
  },
  {
    value: OperationalReportType.BED_UTILIZATION,
    label: 'Physical Bed Occupancy & Capacity Report',
    desc: 'Bed-by-bed utilization percentages, total allocations, and active state',
  },
  {
    value: OperationalReportType.BED_TURNOVER,
    label: 'Bed Cleaning Turnaround & Infection Control',
    desc: 'Discharge-to-cleaning turnaround time metrics and bed sanitation tracking',
  },
  {
    value: OperationalReportType.MATERNAL_ALOS,
    label: 'Maternal Average Length of Stay (ALOS)',
    desc: 'Maternal hospitalization durations stratified by care plan and delivery mode',
  },
  {
    value: OperationalReportType.NEWBORN_ALOS,
    label: 'Newborn Average Length of Stay (ALOS)',
    desc: 'Strictly independent newborn hospitalization durations and release tracking',
  },
  {
    value: OperationalReportType.STAFF_SHIFT_COVERAGE,
    label: 'Clinical Staffing & Shift Coverage Audit',
    desc: 'Duty roster coverage rates, scheduled vs covered shifts, and on-duty headcounts',
  },
  {
    value: OperationalReportType.STAFF_WORKLOAD,
    label: 'Staff Patient Caseload & Workload Report',
    desc: 'Active inpatient assignments per medical officer and nursing staff member',
  },
  {
    value: OperationalReportType.CLINICAL_ALERT_RESPONSE,
    label: 'Emergency Escalation & 3-Minute SLA Audit',
    desc: 'Proof-of-receipt response latency and 3-minute SLA compliance metrics',
  },
];

export const ReportExportDialog: React.FC<ReportExportDialogProps> = ({
  isOpen,
  onClose,
  defaultReportType = OperationalReportType.DAILY_OPERATIONAL_SUMMARY,
  defaultPreset = AnalyticsDateRangePreset.THIS_MONTH,
  defaultWardId = 'WARD-18',
}) => {
  const [reportType, setReportType] = useState<OperationalReportType>(defaultReportType);
  const [format, setFormat] = useState<ExportFormat>(ExportFormat.CSV);
  const [preset, setPreset] = useState<AnalyticsDateRangePreset>(defaultPreset);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setStatusMessage(null);

    try {
      await analyticsApi.exportReport({
        reportType,
        format,
        preset,
        startDate: preset === AnalyticsDateRangePreset.CUSTOM ? startDate : undefined,
        endDate: preset === AnalyticsDateRangePreset.CUSTOM ? endDate : undefined,
        wardId: defaultWardId,
      });

      setStatusMessage({
        type: 'success',
        text:
          format === ExportFormat.CSV
            ? 'CSV file downloaded successfully with formula injection protection.'
            : 'Clinical print report rendered in new window.',
      });
      setTimeout(() => {
        if (isOpen) {
          onClose();
          setStatusMessage(null);
        }
      }, 1800);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to export report. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl" data-testid="report-export-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-700" />
            <span>Generate Hospital Operational Report</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Export aggregated operational indicators for Colombo South Teaching Hospital (Ward 18).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Report Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700">Report Type</label>
            <select
              aria-label="Report Type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as OperationalReportType)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-teal-500"
            >
              {REPORT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 italic">
              {REPORT_TYPE_OPTIONS.find((o) => o.value === reportType)?.desc}
            </p>
          </div>

          {/* Export Format */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat(ExportFormat.CSV)}
                className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  format === ExportFormat.CSV
                    ? 'border-teal-600 bg-teal-50/50 text-teal-800 ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Download className="w-4 h-4 text-teal-600" />
                <span>CSV Spreadsheet</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat(ExportFormat.PRINT_PDF)}
                className={`flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  format === ExportFormat.PRINT_PDF
                    ? 'border-teal-600 bg-teal-50/50 text-teal-800 ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Printable HTML / PDF</span>
              </button>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700">Reporting Period</label>
            <select
              aria-label="Period Preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value as AnalyticsDateRangePreset)}
              className="w-full h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value={AnalyticsDateRangePreset.TODAY}>Today</option>
              <option value={AnalyticsDateRangePreset.YESTERDAY}>Yesterday</option>
              <option value={AnalyticsDateRangePreset.THIS_WEEK}>This Week</option>
              <option value={AnalyticsDateRangePreset.LAST_WEEK}>Last Week</option>
              <option value={AnalyticsDateRangePreset.THIS_MONTH}>This Month</option>
              <option value={AnalyticsDateRangePreset.LAST_MONTH}>Last Month</option>
              <option value={AnalyticsDateRangePreset.LAST_30_DAYS}>Last 30 Days</option>
              <option value={AnalyticsDateRangePreset.LAST_90_DAYS}>Last 90 Days</option>
              <option value={AnalyticsDateRangePreset.CUSTOM}>Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {preset === AnalyticsDateRangePreset.CUSTOM && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  aria-label="Custom Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-8 rounded border border-slate-300 px-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">To Date</label>
                <input
                  type="date"
                  aria-label="Custom End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-8 rounded border border-slate-300 px-2 text-xs"
                />
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isExporting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="text-xs bg-teal-700 hover:bg-teal-800 text-white"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : format === ExportFormat.CSV ? (
              <>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download CSV
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Open Printable Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
