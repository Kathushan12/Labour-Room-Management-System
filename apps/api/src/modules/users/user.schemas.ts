import { z } from 'zod';
import { UserRole, ProfessionalRegistrationBody } from '@lrms/shared';

function emptyToNull(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
}

const optionalEmailSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .email('Invalid email address format')
    .max(255, 'Email address cannot exceed 255 characters')
    .nullable()
    .optional(),
);

const optionalShortTextSchema = (label: string, maxLength = 50) =>
  z.preprocess(
    emptyToNull,
    z
      .string()
      .max(maxLength, `${label} cannot exceed ${maxLength} characters`)
      .nullable()
      .optional(),
  );

const optionalRegistrationBodySchema = z.preprocess(
  emptyToNull,
  z.nativeEnum(ProfessionalRegistrationBody).nullable().optional(),
);

export const userIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid user identifier format (UUID expected)'),
  })
  .strict();

export const ALLOWED_SORT_FIELDS = [
  'username',
  'fullName',
  'role',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

export type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number];

export const listUsersQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((v) => (v !== undefined ? parseInt(v, 10) : 1))
      .refine((v) => !isNaN(v) && v >= 1, 'Page must be a positive integer'),
    limit: z
      .string()
      .optional()
      .transform((v) => (v !== undefined ? parseInt(v, 10) : 20))
      .refine((v) => !isNaN(v) && v >= 1 && v <= 100, 'Limit must be between 1 and 100'),
    search: z
      .string()
      .optional()
      .transform((v) => (v ? v.trim().slice(0, 100) : undefined)),
    role: z.nativeEnum(UserRole).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    sortBy: z.enum(ALLOWED_SORT_FIELDS).default('createdAt'),
    sortOrder: z
      .enum(['ASC', 'DESC', 'asc', 'desc'])
      .default('DESC')
      .transform((v) => v.toUpperCase() as 'ASC' | 'DESC'),
  })
  .strict();

export const createUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username cannot exceed 50 characters')
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        'Username may contain only letters, numbers, underscores, dots, and hyphens',
      ),
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name cannot exceed 150 characters'),
    role: z.nativeEnum(UserRole),
    email: optionalEmailSchema,
    staffId: optionalShortTextSchema('Staff ID', 50),
    professionalRegistrationBody: optionalRegistrationBodySchema,
    professionalRegistrationNumber: optionalShortTextSchema('Professional registration number', 50),
    contactNumber: optionalShortTextSchema('Contact number', 30),
  })
  .strict();

export const updateUserProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name cannot exceed 150 characters')
      .optional(),
    email: optionalEmailSchema,
    staffId: optionalShortTextSchema('Staff ID', 50),
    professionalRegistrationBody: optionalRegistrationBodySchema,
    professionalRegistrationNumber: optionalShortTextSchema('Professional registration number', 50),
    contactNumber: optionalShortTextSchema('Contact number', 30),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field must be provided for update',
  });

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean(),
    reason: optionalShortTextSchema('Status change reason', 255),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: z.nativeEnum(UserRole),
    reason: optionalShortTextSchema('Role change reason', 255),
  })
  .strict();
