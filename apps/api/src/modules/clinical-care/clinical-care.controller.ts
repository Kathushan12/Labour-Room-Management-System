import { Request, Response, NextFunction } from 'express';
import { ClinicalCarePlanService } from './clinical-care-plan.service.js';
import { ClinicalEscalationService } from './clinical-escalation.service.js';
import { EmergencyResponseService } from './emergency-response.service.js';
import { SurgicalReviewService } from './surgical-review.service.js';
import { EmergencyOverrideService } from './emergency-override.service.js';
import { patientAuthorizationService } from '../admissions/patient-authorization.service.js';
import {
  createCarePlanSchema,
  transitionCarePlanSchema,
  amendCarePlanSchema,
  recordCarePlanReviewSchema,
  createEscalationSchema,
  acknowledgeEscalationSchema,
  assignEscalationSchema,
  transitionEscalationSchema,
  resolveEscalationSchema,
  createEmergencyResponseSchema,
  acknowledgeEmergencyResponseSchema,
  transitionEmergencyResponseSchema,
  createSurgicalReviewSchema,
  recordSurgicalDecisionSchema,
  updateSurgicalCoordinationSchema,
  createEmergencyOverrideSchema,
} from './clinical-care.schemas.js';

export class ClinicalCareController {
  constructor(
    private carePlanService = new ClinicalCarePlanService(),
    private escalationService = new ClinicalEscalationService(),
    private emergencyResponseService = new EmergencyResponseService(),
    private surgicalReviewService = new SurgicalReviewService(),
    private overrideService = new EmergencyOverrideService(),
  ) {}

  // =========================================================================
  // 1. CARE PLANS
  // =========================================================================

  public async createCarePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = createCarePlanSchema.parse(req.body);
      const result = await this.carePlanService.createCarePlan(admissionId, parsed, actor);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getCarePlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.carePlanService.getCarePlans(admissionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getActiveCarePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.carePlanService.getActiveCarePlan(admissionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getCarePlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const carePlanId = req.params.planId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.carePlanService.getCarePlanById(carePlanId, admissionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async transitionCarePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const carePlanId = req.params.planId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = transitionCarePlanSchema.parse(req.body);
      const result = await this.carePlanService.transitionCarePlan(
        carePlanId,
        admissionId,
        parsed,
        actor,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async amendCarePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const carePlanId = req.params.planId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = amendCarePlanSchema.parse(req.body);
      const result = await this.carePlanService.amendCarePlan(
        carePlanId,
        admissionId,
        parsed,
        actor,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async recordCarePlanReview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const carePlanId = req.params.planId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = recordCarePlanReviewSchema.parse(req.body);
      const result = await this.carePlanService.recordReview(
        carePlanId,
        admissionId,
        parsed,
        actor,
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getCarePlanReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const carePlanId = req.params.planId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.carePlanService.getReviews(carePlanId, admissionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. CLINICAL ESCALATIONS
  // =========================================================================

  public async createEscalation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = createEscalationSchema.parse(req.body);
      const result = await this.escalationService.createEscalation(admissionId, parsed, actor);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async listVisibleEscalations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await this.escalationService.listVisibleEscalations(req.user!);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getEscalations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.escalationService.getEscalations(admissionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getEscalationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const escalationId = req.params.escalationId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.escalationService.getEscalationById(escalationId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async acknowledgeEscalation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const escalationId = req.params.escalationId;
      const actor = req.user!;
      // Access is checked in the service: the alerted doctor may not be assigned to the patient.
      const parsed = acknowledgeEscalationSchema.parse(req.body);
      const result = await this.escalationService.acknowledgeEscalation(
        admissionId,
        escalationId,
        parsed,
        actor,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async assignEscalation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const escalationId = req.params.escalationId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = assignEscalationSchema.parse(req.body);
      const result = await this.escalationService.assignEscalation(escalationId, parsed, actor);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async transitionEscalation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const escalationId = req.params.escalationId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = transitionEscalationSchema.parse(req.body);
      const result = await this.escalationService.transitionEscalation(escalationId, parsed, actor);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async resolveEscalation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const escalationId = req.params.escalationId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = resolveEscalationSchema.parse(req.body);
      const result = await this.escalationService.resolveEscalation(escalationId, parsed, actor);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. EMERGENCY RESPONSES
  // =========================================================================

  public async initiateEmergencyResponse(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = createEmergencyResponseSchema.parse(req.body);
      const result = await this.emergencyResponseService.initiateEmergencyResponse(
        admissionId,
        parsed,
        actor,
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getEmergencyResponses(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.emergencyResponseService.getEmergencyResponses(admissionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getEmergencyResponseById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const responseId = req.params.responseId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.emergencyResponseService.getEmergencyResponseById(responseId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async acknowledgeEmergencyResponse(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const responseId = req.params.responseId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = acknowledgeEmergencyResponseSchema.parse(req.body);
      const result = await this.emergencyResponseService.acknowledgeEmergencyResponse(
        responseId,
        parsed,
        actor,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async transitionEmergencyResponse(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const responseId = req.params.responseId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = transitionEmergencyResponseSchema.parse(req.body);
      const result = await this.emergencyResponseService.transitionEmergencyResponse(
        responseId,
        parsed,
        actor,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. SURGICAL REVIEWS
  // =========================================================================

  public async requestSurgicalReview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = createSurgicalReviewSchema.parse(req.body);
      const result = await this.surgicalReviewService.requestSurgicalReview(
        admissionId,
        parsed,
        actor,
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getSurgicalReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.surgicalReviewService.getSurgicalReviews(admissionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getSurgicalReviewById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const reviewId = req.params.reviewId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.surgicalReviewService.getSurgicalReviewById(reviewId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async recordSurgicalDecision(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const reviewId = req.params.reviewId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = recordSurgicalDecisionSchema.parse(req.body);
      const result = await this.surgicalReviewService.recordConsultantDecision(
        reviewId,
        parsed,
        actor,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async updateSurgicalCoordination(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const reviewId = req.params.reviewId;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const parsed = updateSurgicalCoordinationSchema.parse(req.body);
      const result = await this.surgicalReviewService.updateCoordination(reviewId, parsed, actor);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 5. EMERGENCY ACCESS OVERRIDE (BREAK-GLASS)
  // =========================================================================

  public async requestEmergencyOverride(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      // Do NOT call assertCanAccessAdmission here: the override is what GRANTS access
      const ipAddress =
        (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;

      const parsed = createEmergencyOverrideSchema.parse(req.body);
      const result = await this.overrideService.requestEmergencyOverride(
        admissionId,
        parsed,
        actor,
        ipAddress,
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getOverridesForAdmission(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

      const result = await this.overrideService.getOverridesForAdmission(admissionId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async revokeEmergencyOverride(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const overrideId = req.params.overrideId;
      const actor = req.user!;
      const ipAddress =
        (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;

      const result = await this.overrideService.revokeEmergencyOverride(
        overrideId,
        actor,
        ipAddress,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const clinicalCareController = new ClinicalCareController();
