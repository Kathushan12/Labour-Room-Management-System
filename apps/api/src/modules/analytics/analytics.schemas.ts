import { z } from 'zod';
import { AnalyticsDateRangePreset, OperationalReportType, ExportFormat } from '@lrms/shared';

export const analyticsQuerySchema = z.object({
  preset: z.nativeEnum(AnalyticsDateRangePreset).optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  wardId: z.string().uuid().optional(),
});

export const exportQuerySchema = z.object({
  reportType: z.nativeEnum(OperationalReportType),
  format: z.nativeEnum(ExportFormat).default(ExportFormat.CSV),
  preset: z.nativeEnum(AnalyticsDateRangePreset).optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  wardId: z.string().uuid().optional(),
});

export type AnalyticsQueryParams = z.infer<typeof analyticsQuerySchema>;
export type ExportQueryParams = z.infer<typeof exportQuerySchema>;
