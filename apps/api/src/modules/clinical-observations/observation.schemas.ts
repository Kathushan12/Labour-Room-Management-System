import { z } from 'zod';
import {
  CaputGrade,
  ContractionIntensity,
  FetalPosition,
  GlucoseUnit,
  LiquorAppearance,
  MembraneStatus,
  MouldingGrade,
} from '@lrms/shared';

function validateNotFutureDate(val: string | undefined): boolean {
  if (!val) return true;
  const d = new Date(val);
  if (isNaN(d.getTime())) return false;
  // Allow up to 5 minutes of clock drift
  return d.getTime() <= Date.now() + 5 * 60 * 1000;
}

export const createMaternalObservationSchema = z
  .object({
    systolicBp: z
      .number()
      .int({ message: 'Systolic BP must be an integer' })
      .min(40, { message: 'Systolic BP must be at least 40 mmHg' })
      .max(300, { message: 'Systolic BP cannot exceed 300 mmHg' })
      .nullable()
      .optional(),
    diastolicBp: z
      .number()
      .int({ message: 'Diastolic BP must be an integer' })
      .min(20, { message: 'Diastolic BP must be at least 20 mmHg' })
      .max(200, { message: 'Diastolic BP cannot exceed 200 mmHg' })
      .nullable()
      .optional(),
    bloodGlucoseValue: z
      .number()
      .positive({ message: 'Blood glucose must be positive' })
      .max(50, { message: 'Blood glucose value out of clinical range' })
      .nullable()
      .optional(),
    bloodGlucoseUnit: z.nativeEnum(GlucoseUnit).nullable().optional(),
    temperatureCelsius: z
      .number()
      .min(30.0, { message: 'Temperature must be at least 30.0 °C' })
      .max(45.0, { message: 'Temperature cannot exceed 45.0 °C' })
      .nullable()
      .optional(),
    pulseRateBpm: z
      .number()
      .int({ message: 'Pulse rate must be an integer' })
      .min(30, { message: 'Pulse rate must be at least 30 bpm' })
      .max(240, { message: 'Pulse rate cannot exceed 240 bpm' })
      .nullable()
      .optional(),
    pulseRate: z
      .number()
      .int({ message: 'Pulse rate must be an integer' })
      .min(30, { message: 'Pulse rate must be at least 30 bpm' })
      .max(240, { message: 'Pulse rate cannot exceed 240 bpm' })
      .nullable()
      .optional(),
    respiratoryRate: z
      .number()
      .int({ message: 'Respiratory rate must be an integer' })
      .min(5, { message: 'Respiratory rate must be at least 5' })
      .max(60, { message: 'Respiratory rate cannot exceed 60' })
      .nullable()
      .optional(),
    oxygenSaturationPercent: z
      .number()
      .int({ message: 'Oxygen saturation must be an integer' })
      .min(50, { message: 'Oxygen saturation must be at least 50%' })
      .max(100, { message: 'Oxygen saturation cannot exceed 100%' })
      .nullable()
      .optional(),
    clinicalNotes: z.string().max(2000).nullable().optional(),
    observationTimestamp: z
      .string()
      .refine(validateNotFutureDate, { message: 'Observation timestamp cannot be in the future' })
      .optional(),
  })
  .refine(
    (data) => {
      // Both systolic and diastolic must be provided together, and systolic > diastolic
      if (data.systolicBp != null || data.diastolicBp != null) {
        if (data.systolicBp == null || data.diastolicBp == null) return false;
        return data.systolicBp > data.diastolicBp;
      }
      return true;
    },
    {
      message:
        'Systolic and diastolic BP must both be recorded, and systolic must be strictly greater than diastolic',
      path: ['systolicBp'],
    },
  )
  .refine(
    (data) => {
      // If glucose value is provided, unit is required
      if (data.bloodGlucoseValue != null && data.bloodGlucoseUnit == null) {
        return false;
      }
      return true;
    },
    {
      message: 'Blood glucose unit (MMOL_L or MG_DL) is required when glucose value is recorded',
      path: ['bloodGlucoseUnit'],
    },
  );

export const createFetalObservationSchema = z.object({
  fetalHeartRateBpm: z
    .number()
    .int({ message: 'Fetal heart rate must be an integer' })
    .min(40, { message: 'Fetal heart rate must be at least 40 bpm' })
    .max(260, { message: 'Fetal heart rate cannot exceed 260 bpm' }),
  fetalHeartRateUnit: z.string().default('BPM').optional(),
  variability: z.string().max(50).nullable().optional(),
  decelerations: z.string().max(50).nullable().optional(),
  accelerations: z.string().max(50).nullable().optional(),
  liquorStatus: z.string().max(50).nullable().optional(),
  clinicalNotes: z.string().max(2000).nullable().optional(),
  observationTimestamp: z
    .string()
    .refine(validateNotFutureDate, { message: 'Observation timestamp cannot be in the future' })
    .optional(),
});

export const createLabourAssessmentSchema = z.object({
  cervicalDilationCm: z
    .number()
    .min(0.0, { message: 'Cervical dilation cannot be negative' })
    .max(10.0, { message: 'Cervical dilation cannot exceed 10.0 cm' })
    .nullable()
    .optional(),
  cervicalEffacementPercent: z
    .number()
    .int()
    .min(0, { message: 'Effacement cannot be negative' })
    .max(100, { message: 'Effacement cannot exceed 100%' })
    .nullable()
    .optional(),
  fetalStation: z.string().max(20).nullable().optional(),
  fetalDescentFifths: z
    .number()
    .int()
    .min(0, { message: 'Fetal descent fifths cannot be negative' })
    .max(5, { message: 'Fetal descent fifths cannot exceed 5' })
    .nullable()
    .optional(),
  membraneStatus: z.nativeEnum(MembraneStatus).nullable().optional(),
  liquorAppearance: z.nativeEnum(LiquorAppearance).nullable().optional(),
  fetalPosition: z.nativeEnum(FetalPosition).nullable().optional(),
  caput: z.nativeEnum(CaputGrade).nullable().optional(),
  moulding: z.nativeEnum(MouldingGrade).nullable().optional(),
  clinicalNotes: z.string().max(2000).nullable().optional(),
  observationTimestamp: z
    .string()
    .refine(validateNotFutureDate, { message: 'Observation timestamp cannot be in the future' })
    .optional(),
});

export const createContractionObservationSchema = z.object({
  contractionsCount: z
    .number()
    .int()
    .min(0, { message: 'Contractions count cannot be negative' })
    .max(10, { message: 'Contractions count cannot exceed 10 in a 10-minute window' }),
  observationWindowMinutes: z
    .number()
    .int()
    .min(1, { message: 'Observation window must be at least 1 minute' })
    .max(60, { message: 'Observation window cannot exceed 60 minutes' })
    .default(10),
  durationSeconds: z
    .number()
    .int()
    .min(0, { message: 'Duration cannot be negative' })
    .max(300, { message: 'Duration cannot exceed 300 seconds' })
    .nullable()
    .optional(),
  intensity: z.nativeEnum(ContractionIntensity).nullable().optional(),
  clinicalNotes: z.string().max(2000).nullable().optional(),
  observationTimestamp: z
    .string()
    .refine(validateNotFutureDate, { message: 'Observation timestamp cannot be in the future' })
    .optional(),
});

export const amendClinicalObservationSchema = z.object({
  observationId: z.string().uuid().optional(),
  observationType: z.string().optional(),
  amendmentReason: z.string().min(10, {
    message: 'Amendment reason must provide at least 10 characters clinical rationale',
  }),
  amendedValues: z.record(z.unknown()).optional(),
  amendedData: z.record(z.unknown()).optional(),
});

export const observationQuerySchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  includeSuperseded: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
