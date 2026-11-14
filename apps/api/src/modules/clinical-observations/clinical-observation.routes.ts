import { Router } from 'express';
import { Permission, UserRole } from '@lrms/shared';
import {
  authenticate,
  requireAnyPermission,
  requirePermission,
  requireRole,
} from '../../common/middleware/auth.middleware.js';
import { clinicalObservationController } from './clinical-observation.controller.js';

const router = Router({ mergeParams: true });

// Observation guards: All observation endpoints require authentication and clinical role (DOCTOR or NURSE_STAFF)
// Patient-level authorization is enforced within the service layer via patientAuthorizationService.assertCanAccessAdmission
const observationGuards = [authenticate, requireRole([UserRole.DOCTOR, UserRole.NURSE_STAFF])];

// ===========================================================================
// COMPOSITE SUMMARY & PARTOGRAPH
// ===========================================================================

router.get(
  '/admissions/:id/observations',
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_VIEW),
  clinicalObservationController.getAdmissionObservationsSummary.bind(clinicalObservationController),
);

router.get(
  '/admissions/:id/partograph',
  ...observationGuards,
  requirePermission(Permission.PARTOGRAPH_VIEW),
  clinicalObservationController.getPartograph.bind(clinicalObservationController),
);

// ===========================================================================
// MATERNAL OBSERVATIONS
// ===========================================================================

router.get(
  ['/admissions/:id/observations/maternal', '/admissions/:id/maternal-observations'],
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_VIEW),
  clinicalObservationController.listMaternalObservations.bind(clinicalObservationController),
);

router.post(
  ['/admissions/:id/observations/maternal', '/admissions/:id/maternal-observations'],
  ...observationGuards,
  requireAnyPermission([Permission.OBSERVATIONS_RECORD_BP, Permission.OBSERVATIONS_RECORD_GLUCOSE]),
  clinicalObservationController.recordMaternalObservation.bind(clinicalObservationController),
);

// ===========================================================================
// FETAL OBSERVATIONS
// ===========================================================================

router.get(
  ['/admissions/:id/observations/fetal', '/admissions/:id/fetal-observations'],
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_VIEW),
  clinicalObservationController.listFetalObservations.bind(clinicalObservationController),
);

router.post(
  ['/admissions/:id/observations/fetal', '/admissions/:id/fetal-observations'],
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_RECORD_FHR),
  clinicalObservationController.recordFetalObservation.bind(clinicalObservationController),
);

// ===========================================================================
// LABOUR PROGRESSION ASSESSMENTS
// ===========================================================================

router.get(
  ['/admissions/:id/labour-assessments', '/admissions/:id/observations/labour'],
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_VIEW),
  clinicalObservationController.listLabourAssessments.bind(clinicalObservationController),
);

router.post(
  ['/admissions/:id/labour-assessments', '/admissions/:id/observations/labour'],
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_RECORD_LABOUR),
  clinicalObservationController.recordLabourAssessment.bind(clinicalObservationController),
);

// ===========================================================================
// UTERINE CONTRACTIONS
// ===========================================================================

router.get(
  ['/admissions/:id/contractions', '/admissions/:id/observations/contractions'],
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_VIEW),
  clinicalObservationController.listContractionObservations.bind(clinicalObservationController),
);

router.post(
  ['/admissions/:id/contractions', '/admissions/:id/observations/contractions'],
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_RECORD_CONTRACTION),
  clinicalObservationController.recordContractionObservation.bind(clinicalObservationController),
);

// ===========================================================================
// AMENDMENTS & AUDITED CORRECTIONS
// ===========================================================================

router.post(
  ['/admissions/:id/observations/:observationId/amend', '/admissions/:id/observations/amend'],
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_CORRECT),
  clinicalObservationController.amendObservation.bind(clinicalObservationController),
);

router.get(
  [
    '/admissions/:id/observations/:observationId/amendments',
    '/admissions/:id/observations/amendments',
  ],
  ...observationGuards,
  requirePermission(Permission.OBSERVATIONS_VIEW),
  clinicalObservationController.listObservationAmendments.bind(clinicalObservationController),
);

export const clinicalObservationRoutes = router;
