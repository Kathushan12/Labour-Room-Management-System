import { z } from 'zod';
import { AdmissionCategory, AdmissionStatus, RiskFlagKey } from '@lrms/shared';
import {
  optionalFullNameSchema,
  optionalNicSchema,
  optionalPhoneSchema,
} from '../patients/patient.schemas.js';

export const ALLOWED_ADMISSION_SORT_FIELDS = [
  'admittedAt',
  'admissionReferenceId',
  'admissionCategory',
  'status',
  'createdAt',
] as const;

export type AllowedAdmissionSortField = (typeof ALLOWED_ADMISSION_SORT_FIELDS)[number];

export const admissionIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid admission UUID format'),
  })
  .strict();

export const createTriageSchema = z
  .object({
    admissionCategory: z.nativeEnum(AdmissionCategory, {
      errorMap: () => ({
        message:
          'Admission category must be NORMAL_DELIVERY, SCHEDULED_CESAREAN, or OBSERVATION_20_PLUS_WEEKS',
      }),
    }),
    riskFlagKeys: z.array(z.nativeEnum(RiskFlagKey)).optional().default([]),
    riskFlagNotes: z
      .record(z.nativeEnum(RiskFlagKey), z.string().trim().max(500).nullable())
      .optional(),
    noListedRiskFlagsConfirmed: z.boolean().optional().default(false),
    linkExistingPatient: z.boolean().optional().default(false),
    optionalPii: z
      .object({
        fullName: optionalFullNameSchema,
        nic: optionalNicSchema,
        contactPhone: optionalPhoneSchema,
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

export const updateAdmissionRiskFlagsSchema = z
  .object({
    riskFlagKeys: z.array(z.nativeEnum(RiskFlagKey)),
    riskFlagNotes: z
      .record(z.nativeEnum(RiskFlagKey), z.string().trim().max(500).nullable())
      .optional(),
    noListedRiskFlagsConfirmed: z.boolean().optional().default(false),
    reason: z.string().trim().max(255).nullable().optional(),
  })
  .strict();

export const listAdmissionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    search: z.string().trim().max(50).optional(),
    category: z.nativeEnum(AdmissionCategory).optional(),
    status: z.nativeEnum(AdmissionStatus).optional(),
    riskFlagKey: z.nativeEnum(RiskFlagKey).optional(),
    fromDate: z.string().trim().max(40).optional(),
    toDate: z.string().trim().max(40).optional(),
    sortBy: z.enum(ALLOWED_ADMISSION_SORT_FIELDS).default('admittedAt'),
    sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  })
  .strict();
