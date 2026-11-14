import { Router } from 'express';
import { Permission, UserRole } from '@lrms/shared';
import {
  authenticate,
  requirePermission,
  requireRole,
} from '../../common/middleware/auth.middleware.js';
import { deliveryController } from './delivery.controller.js';

const router = Router();

// Apply authentication and clinical role guard strictly to delivery, newborn, and postpartum routes
router.use(
  [
    '/admissions/:admissionId/delivery',
    '/admissions/:admissionId/newborns',
    '/admissions/:admissionId/postpartum',
    '/deliveries',
    '/newborns',
  ],
  authenticate,
  requireRole([UserRole.DOCTOR, UserRole.NURSE_STAFF]),
);

// ============================================================================
// 1. DELIVERY ROUTES
// ============================================================================

router.post(
  '/admissions/:admissionId/delivery',
  requirePermission(Permission.DELIVERY_CREATE),
  (req, res, next) => {
    deliveryController.createDelivery(req, res).catch(next);
  },
);

router.get(
  '/admissions/:admissionId/delivery',
  requirePermission(Permission.DELIVERY_VIEW),
  (req, res, next) => {
    deliveryController.getDeliveryByAdmission(req, res).catch(next);
  },
);

router.get('/deliveries/:id', requirePermission(Permission.DELIVERY_VIEW), (req, res, next) => {
  deliveryController.getDeliveryById(req, res).catch(next);
});

router.patch('/deliveries/:id', requirePermission(Permission.DELIVERY_UPDATE), (req, res, next) => {
  deliveryController.updateDelivery(req, res).catch(next);
});

router.post(
  '/deliveries/:id/finalize',
  requirePermission(Permission.DELIVERY_FINALIZE),
  (req, res, next) => {
    deliveryController.finalizeDelivery(req, res).catch(next);
  },
);

// ============================================================================
// 2. NEWBORN & BIRTH REGISTRATION ROUTES
// ============================================================================

router.post(
  '/deliveries/:deliveryId/newborns',
  requirePermission(Permission.NEWBORN_REGISTER),
  (req, res, next) => {
    deliveryController.registerNewborn(req, res).catch(next);
  },
);

router.get(
  '/admissions/:admissionId/newborns',
  requirePermission(Permission.NEWBORN_VIEW),
  (req, res, next) => {
    deliveryController.getNewbornsByAdmission(req, res).catch(next);
  },
);

router.get('/newborns/:id', requirePermission(Permission.NEWBORN_VIEW), (req, res, next) => {
  deliveryController.getNewbornById(req, res).catch(next);
});

// ============================================================================
// 3. APGAR ASSESSMENT ROUTES
// ============================================================================

router.post(
  '/newborns/:newbornId/apgar',
  requirePermission(Permission.APGAR_RECORD),
  (req, res, next) => {
    deliveryController.recordApgar(req, res).catch(next);
  },
);

router.get(
  '/newborns/:newbornId/apgar',
  requirePermission(Permission.NEWBORN_VIEW),
  (req, res, next) => {
    deliveryController.getApgarHistory(req, res).catch(next);
  },
);

// ============================================================================
// 4. POSTPARTUM MATERNAL CARE ROUTES
// ============================================================================

router.post(
  '/admissions/:admissionId/postpartum/maternal-assessments',
  requirePermission(Permission.POSTPARTUM_ASSESS),
  (req, res, next) => {
    deliveryController.createMaternalPostpartumAssessment(req, res).catch(next);
  },
);

router.get(
  '/admissions/:admissionId/postpartum/maternal-assessments',
  requirePermission(Permission.POSTPARTUM_VIEW),
  (req, res, next) => {
    deliveryController.getMaternalPostpartumAssessments(req, res).catch(next);
  },
);

// ============================================================================
// 5. POSTPARTUM NEWBORN CARE ROUTES
// ============================================================================

router.post(
  '/newborns/:newbornId/postpartum/assessments',
  requirePermission(Permission.POSTPARTUM_ASSESS),
  (req, res, next) => {
    deliveryController.createNewbornPostpartumAssessment(req, res).catch(next);
  },
);

router.get(
  '/newborns/:newbornId/postpartum/assessments',
  requirePermission(Permission.POSTPARTUM_VIEW),
  (req, res, next) => {
    deliveryController.getNewbornPostpartumAssessments(req, res).catch(next);
  },
);

// ============================================================================
// 6. POSTPARTUM DISCHARGE ROUTES
// ============================================================================

router.post(
  '/admissions/:admissionId/postpartum/discharge',
  requirePermission(Permission.POSTPARTUM_DISCHARGE_AUTHORIZE),
  (req, res, next) => {
    deliveryController.authorizeMaternalDischarge(req, res).catch(next);
  },
);

router.post(
  '/newborns/:newbornId/postpartum/discharge',
  requirePermission(Permission.POSTPARTUM_DISCHARGE_AUTHORIZE),
  (req, res, next) => {
    deliveryController.authorizeNewbornDischarge(req, res).catch(next);
  },
);

router.get(
  '/admissions/:admissionId/postpartum/discharges',
  requirePermission(Permission.POSTPARTUM_VIEW),
  (req, res, next) => {
    deliveryController.getDischargeAuthorizations(req, res).catch(next);
  },
);

export default router;
