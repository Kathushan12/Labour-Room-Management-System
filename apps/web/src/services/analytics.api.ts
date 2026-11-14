import {
  AdmissionAnalyticsDto,
  AlosAnalyticsDto,
  ApiResponse,
  BedUtilizationAnalyticsDto,
  ClinicalAlertAnalyticsDto,
  DeliveryAnalyticsDto,
  ExportFormat,
  NewbornAnalyticsDto,
  OperationalOverviewDto,
  ReportMetadataDto,
  OperationalReportType,
  StaffingAnalyticsDto,
  AnalyticsDateRangePreset,
} from '@lrms/shared';
import { apiFetch } from './api.js';
import { env } from '../config/env.js';
import { getMemoryAccessToken } from '../context/AuthContext.js';

export interface AnalyticsQueryParams {
  preset?: AnalyticsDateRangePreset | string;
  startDate?: string;
  endDate?: string;
  wardId?: string;
}

function buildQueryString(params?: AnalyticsQueryParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  if (params.preset) searchParams.set('preset', String(params.preset));
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.wardId) searchParams.set('wardId', params.wardId);
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

export async function fetchOverviewKpis(
  params?: AnalyticsQueryParams,
): Promise<ApiResponse<OperationalOverviewDto>> {
  return apiFetch<OperationalOverviewDto>(`/analytics/overview${buildQueryString(params)}`);
}

export async function fetchAdmissionAnalytics(
  params?: AnalyticsQueryParams,
): Promise<ApiResponse<AdmissionAnalyticsDto>> {
  return apiFetch<AdmissionAnalyticsDto>(`/analytics/admissions${buildQueryString(params)}`);
}

export async function fetchDeliveryAnalytics(
  params?: AnalyticsQueryParams,
): Promise<ApiResponse<DeliveryAnalyticsDto>> {
  return apiFetch<DeliveryAnalyticsDto>(`/analytics/deliveries${buildQueryString(params)}`);
}

export async function fetchNewbornAnalytics(
  params?: AnalyticsQueryParams,
): Promise<ApiResponse<NewbornAnalyticsDto>> {
  return apiFetch<NewbornAnalyticsDto>(`/analytics/newborns${buildQueryString(params)}`);
}

export async function fetchBedUtilizationAnalytics(
  params?: AnalyticsQueryParams,
): Promise<ApiResponse<BedUtilizationAnalyticsDto>> {
  return apiFetch<BedUtilizationAnalyticsDto>(`/analytics/beds${buildQueryString(params)}`);
}

export async function fetchAlosAnalytics(
  params?: AnalyticsQueryParams,
): Promise<ApiResponse<AlosAnalyticsDto>> {
  return apiFetch<AlosAnalyticsDto>(`/analytics/alos${buildQueryString(params)}`);
}

export async function fetchStaffingAnalytics(
  params?: AnalyticsQueryParams,
): Promise<ApiResponse<StaffingAnalyticsDto>> {
  return apiFetch<StaffingAnalyticsDto>(`/analytics/staffing${buildQueryString(params)}`);
}

export async function fetchClinicalAlertAnalytics(
  params?: AnalyticsQueryParams,
): Promise<ApiResponse<ClinicalAlertAnalyticsDto>> {
  return apiFetch<ClinicalAlertAnalyticsDto>(
    `/analytics/clinical-alerts${buildQueryString(params)}`,
  );
}

export async function fetchSystemHealth(
  params?: AnalyticsQueryParams,
): Promise<ApiResponse<Record<string, unknown>>> {
  return apiFetch<Record<string, unknown>>(`/analytics/system-health${buildQueryString(params)}`);
}

export async function fetchReportsCatalog(): Promise<ApiResponse<ReportMetadataDto[]>> {
  return apiFetch<ReportMetadataDto[]>('/analytics/reports');
}

export interface ExportReportOptions extends AnalyticsQueryParams {
  format?: ExportFormat;
}

export async function exportReport(
  reportType: OperationalReportType,
  options?: ExportReportOptions,
): Promise<void> {
  const searchParams = new URLSearchParams();
  if (options?.format) searchParams.set('format', options.format);
  if (options?.preset) searchParams.set('preset', String(options.preset));
  if (options?.startDate) searchParams.set('startDate', options.startDate);
  if (options?.endDate) searchParams.set('endDate', options.endDate);
  if (options?.wardId) searchParams.set('wardId', options.wardId);

  const token = getMemoryAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${env.API_BASE_URL}/analytics/reports/${reportType}/export?${searchParams.toString()}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(errorJson?.error?.message || `Export failed with status ${response.status}`);
  }

  const isHtml = options?.format === ExportFormat.PRINT_PDF;

  if (isHtml) {
    const html = await response.text();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    }
  } else {
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    let filename = `${reportType}_report.csv`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const analyticsApi = {
  fetchOverviewKpis,
  getOverview: async (params?: AnalyticsQueryParams): Promise<OperationalOverviewDto> => {
    const res = await fetchOverviewKpis(params);
    return res.data!;
  },
  getExecutiveSummary: async (params?: AnalyticsQueryParams): Promise<OperationalOverviewDto> => {
    const res = await fetchOverviewKpis(params);
    return res.data!;
  },
  fetchAdmissionAnalytics,
  getAdmissionAnalytics: async (params?: AnalyticsQueryParams): Promise<AdmissionAnalyticsDto> => {
    const res = await fetchAdmissionAnalytics(params);
    return res.data!;
  },
  fetchDeliveryAnalytics,
  getDeliveryAnalytics: async (params?: AnalyticsQueryParams): Promise<DeliveryAnalyticsDto> => {
    const res = await fetchDeliveryAnalytics(params);
    return res.data!;
  },
  fetchNewbornAnalytics,
  getNewbornAnalytics: async (params?: AnalyticsQueryParams): Promise<NewbornAnalyticsDto> => {
    const res = await fetchNewbornAnalytics(params);
    return res.data!;
  },
  fetchBedUtilizationAnalytics,
  getBedAnalytics: async (params?: AnalyticsQueryParams): Promise<BedUtilizationAnalyticsDto> => {
    const res = await fetchBedUtilizationAnalytics(params);
    return res.data!;
  },
  fetchAlosAnalytics,
  getAlosAnalytics: async (params?: AnalyticsQueryParams): Promise<AlosAnalyticsDto> => {
    const res = await fetchAlosAnalytics(params);
    return res.data!;
  },
  fetchStaffingAnalytics,
  getStaffingAnalytics: async (params?: AnalyticsQueryParams): Promise<StaffingAnalyticsDto> => {
    const res = await fetchStaffingAnalytics(params);
    return res.data!;
  },
  fetchClinicalAlertAnalytics,
  getAlertAnalytics: async (params?: AnalyticsQueryParams): Promise<ClinicalAlertAnalyticsDto> => {
    const res = await fetchClinicalAlertAnalytics(params);
    return res.data!;
  },
  getClinicalAlertAnalytics: async (
    params?: AnalyticsQueryParams,
  ): Promise<ClinicalAlertAnalyticsDto> => {
    const res = await fetchClinicalAlertAnalytics(params);
    return res.data!;
  },
  fetchSystemHealth,
  getSystemHealth: async (params?: AnalyticsQueryParams): Promise<Record<string, unknown>> => {
    const res = await fetchSystemHealth(params);
    return res.data!;
  },
  fetchReportsCatalog,
  getReportsCatalog: async (): Promise<ReportMetadataDto[]> => {
    const res = await fetchReportsCatalog();
    return res.data!;
  },
  exportReport: async (options: {
    reportType: OperationalReportType;
    format: ExportFormat;
    preset?: AnalyticsDateRangePreset;
    startDate?: string;
    endDate?: string;
    wardId?: string;
  }): Promise<void> => {
    return exportReport(options.reportType, {
      format: options.format,
      preset: options.preset,
      startDate: options.startDate,
      endDate: options.endDate,
      wardId: options.wardId,
    });
  },
};
