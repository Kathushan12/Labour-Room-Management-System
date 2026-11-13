import { Router } from 'express';
import { Permission } from '@lrms/shared';
import { authenticate, requirePermission } from '../../common/middleware/auth.middleware.js';
import {
  getPatientByIdHandler,
  getPatientAdmissionsHandler,
  revealPatientPiiHandler,
  updatePatientPiiHandler,
  lookupPatientHandler,
} from './patient.controller.js';

export const patientRouter = Router();

patientRouter.use(authenticate);

// Exact-match blind-index NIC lookup (POST avoids exposing NIC in HTTP query strings)
patientRouter.post(
  '/lookup',
  requirePermission(Permission.PATIENTS_VIEW_PII),
  lookupPatientHandler,
);

// Patient master record (non-PII summary + authorized admission history + audit summary)
patientRouter.get('/:id', requirePermission(Permission.PATIENTS_VIEW), getPatientByIdHandler);

// Patient admission episodes history
patientRouter.get(
  '/:id/admissions',
  requirePermission(Permission.PATIENTS_VIEW),
  getPatientAdmissionsHandler,
);

// Explicit audited PII decryption endpoint
patientRouter.get(
  '/:id/pii',
  requirePermission(Permission.PATIENTS_VIEW_PII),
  revealPatientPiiHandler,
);

// Add / update optional encrypted PII fields
patientRouter.patch(
  '/:id/pii',
  requirePermission(Permission.ADMISSIONS_UPDATE_PII),
  updatePatientPiiHandler,
);
