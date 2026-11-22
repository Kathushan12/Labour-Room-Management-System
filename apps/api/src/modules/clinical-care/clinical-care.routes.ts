import { Router } from 'express';
import { Permission, UserRole } from '@lrms/shared';
import {
  authenticate,
  requirePermission,
  requireRole,
} from '../../common/middleware/auth.middleware.js';
import { clinicalCareController } from './clinical-care.controller.js';

const router = Router({ mergeParams: true });

// Clinical Care guards: All endpoints require authentication and clinical role (DOCTOR or NURSE_STAFF)
const clinicalGuards = [authenticate, requireRole([UserRole.DOCTOR, UserRole.NURSE_STAFF])];

// ===========================================================================
// 1. CARE PLANS
// ===========================================================================

router.post(
  '/admissions/:id/care-plans',
  ...clinicalGuards,
  requirePermission(Permission.CARE_PLANS_CREATE),
  clinicalCareController.createCarePlan.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/care-plans',
  ...clinicalGuards,
  requirePermission(Permission.CARE_PLANS_VIEW),
  clinicalCareController.getCarePlans.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/care-plans/active',
  ...clinicalGuards,
  requirePermission(Permission.CARE_PLANS_VIEW),
  clinicalCareController.getActiveCarePlan.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/care-plans/:planId',
  ...clinicalGuards,
  requirePermission(Permission.CARE_PLANS_VIEW),
  clinicalCareController.getCarePlanById.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/care-plans/:planId/transition',
  ...clinicalGuards,
  requirePermission(Permission.CARE_PLANS_TRANSITION),
  clinicalCareController.transitionCarePlan.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/care-plans/:planId/amend',
  ...clinicalGuards,
  requirePermission(Permission.CARE_PLANS_CREATE),
  clinicalCareController.amendCarePlan.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/care-plans/:planId/reviews',
  ...clinicalGuards,
  requirePermission(Permission.CARE_PLAN_REVIEW),
  clinicalCareController.recordCarePlanReview.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/care-plans/:planId/reviews',
  ...clinicalGuards,
  requirePermission(Permission.CARE_PLANS_VIEW),
  clinicalCareController.getCarePlanReviews.bind(clinicalCareController),
);

// ===========================================================================
// 2. CLINICAL ESCALATIONS
// ===========================================================================

router.post(
  '/admissions/:id/escalations',
  ...clinicalGuards,
  requirePermission(Permission.ESCALATIONS_CREATE),
  clinicalCareController.createEscalation.bind(clinicalCareController),
);

router.get(
  '/escalations',
  ...clinicalGuards,
  requirePermission(Permission.ESCALATIONS_VIEW),
  clinicalCareController.listVisibleEscalations.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/escalations',
  ...clinicalGuards,
  requirePermission(Permission.ESCALATIONS_VIEW),
  clinicalCareController.getEscalations.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/escalations/:escalationId',
  ...clinicalGuards,
  requirePermission(Permission.ESCALATIONS_VIEW),
  clinicalCareController.getEscalationById.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/escalations/:escalationId/acknowledge',
  ...clinicalGuards,
  requirePermission(Permission.ESCALATIONS_ACKNOWLEDGE),
  clinicalCareController.acknowledgeEscalation.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/escalations/:escalationId/assign',
  ...clinicalGuards,
  requirePermission(Permission.ESCALATIONS_ASSIGN),
  clinicalCareController.assignEscalation.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/escalations/:escalationId/transition',
  ...clinicalGuards,
  requirePermission(Permission.ESCALATIONS_ACKNOWLEDGE),
  clinicalCareController.transitionEscalation.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/escalations/:escalationId/resolve',
  ...clinicalGuards,
  requirePermission(Permission.ESCALATIONS_RESOLVE),
  clinicalCareController.resolveEscalation.bind(clinicalCareController),
);

// REQ-6.6: doctor-only reversal is enforced in the service.
router.post(
  '/admissions/:id/escalations/:escalationId/reverse',
  ...clinicalGuards,
  requirePermission(Permission.CARE_PLANS_TRANSITION),
  clinicalCareController.reverseEscalation.bind(clinicalCareController),
);

// ===========================================================================
// 3. EMERGENCY RESPONSES
// ===========================================================================

router.post(
  '/admissions/:id/emergency-responses',
  ...clinicalGuards,
  requirePermission(Permission.EMERGENCY_RESPONSES_INITIATE),
  clinicalCareController.initiateEmergencyResponse.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/emergency-responses',
  ...clinicalGuards,
  requirePermission(Permission.EMERGENCY_RESPONSES_VIEW),
  clinicalCareController.getEmergencyResponses.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/emergency-responses/:responseId',
  ...clinicalGuards,
  requirePermission(Permission.EMERGENCY_RESPONSES_VIEW),
  clinicalCareController.getEmergencyResponseById.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/emergency-responses/:responseId/acknowledge',
  ...clinicalGuards,
  requirePermission(Permission.EMERGENCY_RESPONSES_ACKNOWLEDGE),
  clinicalCareController.acknowledgeEmergencyResponse.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/emergency-responses/:responseId/transition',
  ...clinicalGuards,
  requirePermission(Permission.EMERGENCY_RESPONSES_ACKNOWLEDGE),
  clinicalCareController.transitionEmergencyResponse.bind(clinicalCareController),
);

// ===========================================================================
// 4. SURGICAL REVIEWS
// ===========================================================================

router.post(
  '/admissions/:id/surgical-reviews',
  ...clinicalGuards,
  requirePermission(Permission.SURGICAL_REVIEWS_REQUEST),
  clinicalCareController.requestSurgicalReview.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/surgical-reviews',
  ...clinicalGuards,
  requirePermission(Permission.SURGICAL_REVIEWS_VIEW),
  clinicalCareController.getSurgicalReviews.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/surgical-reviews/:reviewId',
  ...clinicalGuards,
  requirePermission(Permission.SURGICAL_REVIEWS_VIEW),
  clinicalCareController.getSurgicalReviewById.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/surgical-reviews/:reviewId/decision',
  ...clinicalGuards,
  requirePermission(Permission.SURGICAL_REVIEWS_DECIDE),
  clinicalCareController.recordSurgicalDecision.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/surgical-reviews/:reviewId/coordination',
  ...clinicalGuards,
  requirePermission(Permission.SURGICAL_REVIEWS_COORDINATE),
  clinicalCareController.updateSurgicalCoordination.bind(clinicalCareController),
);

// ===========================================================================
// 5. EMERGENCY ACCESS OVERRIDES (BREAK-GLASS)
// ===========================================================================

router.post(
  '/admissions/:id/emergency-overrides',
  ...clinicalGuards,
  requirePermission(Permission.OVERRIDES_EMERGENCY),
  clinicalCareController.requestEmergencyOverride.bind(clinicalCareController),
);

router.get(
  '/admissions/:id/emergency-overrides',
  ...clinicalGuards,
  requirePermission(Permission.OVERRIDES_EMERGENCY),
  clinicalCareController.getOverridesForAdmission.bind(clinicalCareController),
);

router.post(
  '/admissions/:id/emergency-overrides/:overrideId/revoke',
  ...clinicalGuards,
  requirePermission(Permission.OVERRIDES_EMERGENCY),
  clinicalCareController.revokeEmergencyOverride.bind(clinicalCareController),
);

export const clinicalCareRoutes = router;
