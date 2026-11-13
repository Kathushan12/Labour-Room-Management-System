import { z } from 'zod';

const SRI_LANKAN_NIC_REGEX = /^(?:\d{9}[VX]|\d{12})$/i;

export const optionalNicSchema = z
  .string()
  .trim()
  .max(20)
  .refine((val) => val === '' || SRI_LANKAN_NIC_REGEX.test(val), {
    message: 'NIC must be 9 digits followed by V/X or 12 digits',
  })
  .nullable()
  .optional();

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine((val) => val === '' || /^[+0-9\s()-]{7,25}$/.test(val), {
    message: 'Contact phone contains invalid characters or length',
  })
  .nullable()
  .optional();

export const optionalFullNameSchema = z.string().trim().max(150).nullable().optional();

export const patientIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid patient UUID format'),
  })
  .strict();

export const updatePatientPiiSchema = z
  .object({
    fullName: optionalFullNameSchema,
    nic: optionalNicSchema,
    contactPhone: optionalPhoneSchema,
  })
  .strict()
  .refine(
    (data) =>
      data.fullName !== undefined || data.nic !== undefined || data.contactPhone !== undefined,
    {
      message: 'At least one identity field must be provided for update',
    },
  );

export const patientLookupSchema = z
  .object({
    nic: z
      .string()
      .trim()
      .min(1, 'NIC is required for exact blind-index lookup')
      .max(20)
      .refine((val) => SRI_LANKAN_NIC_REGEX.test(val), {
        message: 'NIC must be 9 digits followed by V/X or 12 digits',
      }),
  })
  .strict();
