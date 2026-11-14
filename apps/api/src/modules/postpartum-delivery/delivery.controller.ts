import { Request, Response } from 'express';
import { assertCanAccessAdmission } from '../admissions/patient-authorization.service.js';
import { deliveryService } from './delivery.service.js';
import {
  authorizeMaternalDischargeSchema,
  authorizeNewbornDischargeSchema,
  createDeliverySchema,
  createPostpartumMaternalAssessmentSchema,
  createPostpartumNewbornAssessmentSchema,
  finalizeDeliverySchema,
  recordApgarSchema,
  registerNewbornSchema,
  updateDeliverySchema,
} from './delivery.schemas.js';

export class DeliveryController {
  // ==========================================================================
  // 1. DELIVERY
  // ==========================================================================

  async createDelivery(req: Request, res: Response): Promise<void> {
    const admissionId = req.params.admissionId as string;
    await assertCanAccessAdmission(
      req.user!,
      admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'CREATE_DELIVERY',
    );

    const validated = createDeliverySchema.parse(req.body);
    const data = await deliveryService.createDelivery(
      admissionId,
      validated,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );

    res.status(201).json({
      success: true,
      data,
    });
  }

  async getDeliveryByAdmission(req: Request, res: Response): Promise<void> {
    const admissionId = req.params.admissionId as string;
    await assertCanAccessAdmission(
      req.user!,
      admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'VIEW_DELIVERY',
    );

    const data = await deliveryService.getDeliveryByAdmissionId(admissionId);
    res.status(200).json({
      success: true,
      data,
    });
  }

  async getDeliveryById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const delivery = await deliveryService.getDeliveryById(id);
    await assertCanAccessAdmission(
      req.user!,
      delivery.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'VIEW_DELIVERY',
    );

    res.status(200).json({
      success: true,
      data: delivery,
    });
  }

  async updateDelivery(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const delivery = await deliveryService.getDeliveryById(id);
    await assertCanAccessAdmission(
      req.user!,
      delivery.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'UPDATE_DELIVERY',
    );

    const validated = updateDeliverySchema.parse(req.body);
    const updated = await deliveryService.updateDelivery(
      id,
      validated,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  }

  async finalizeDelivery(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const delivery = await deliveryService.getDeliveryById(id);
    await assertCanAccessAdmission(
      req.user!,
      delivery.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'FINALIZE_DELIVERY',
    );

    const validated = finalizeDeliverySchema.parse(req.body);
    const finalized = await deliveryService.finalizeDelivery(
      id,
      validated,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );

    res.status(200).json({
      success: true,
      data: finalized,
    });
  }

  // ==========================================================================
  // 2. NEWBORNS
  // ==========================================================================

  async registerNewborn(req: Request, res: Response): Promise<void> {
    const deliveryId = req.params.deliveryId as string;
    const delivery = await deliveryService.getDeliveryById(deliveryId);
    await assertCanAccessAdmission(
      req.user!,
      delivery.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'REGISTER_NEWBORN',
    );

    const validated = registerNewbornSchema.parse(req.body);
    const newborn = await deliveryService.registerNewborn(
      deliveryId,
      validated,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );

    res.status(201).json({
      success: true,
      data: newborn,
    });
  }

  async getNewbornsByAdmission(req: Request, res: Response): Promise<void> {
    const admissionId = req.params.admissionId as string;
    await assertCanAccessAdmission(
      req.user!,
      admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'VIEW_NEWBORNS',
    );

    const newborns = await deliveryService.getNewbornsByAdmissionId(admissionId);
    res.status(200).json({
      success: true,
      data: newborns,
    });
  }

  async getNewbornById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const newborn = await deliveryService.getNewbornById(id);
    await assertCanAccessAdmission(
      req.user!,
      newborn.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'VIEW_NEWBORN',
    );

    res.status(200).json({
      success: true,
      data: newborn,
    });
  }

  // ==========================================================================
  // 3. APGAR ASSESSMENTS
  // ==========================================================================

  async recordApgar(req: Request, res: Response): Promise<void> {
    const newbornId = req.params.newbornId as string;
    const newborn = await deliveryService.getNewbornById(newbornId);
    await assertCanAccessAdmission(
      req.user!,
      newborn.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'RECORD_APGAR',
    );

    const validated = recordApgarSchema.parse(req.body);
    const assessment = await deliveryService.recordApgarAssessment(
      newbornId,
      validated,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );

    res.status(201).json({
      success: true,
      data: assessment,
    });
  }

  async getApgarHistory(req: Request, res: Response): Promise<void> {
    const newbornId = req.params.newbornId as string;
    const newborn = await deliveryService.getNewbornById(newbornId);
    await assertCanAccessAdmission(
      req.user!,
      newborn.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'VIEW_APGAR',
    );

    const history = await deliveryService.getApgarAssessmentsByNewbornId(newbornId);
    res.status(200).json({
      success: true,
      data: history,
    });
  }

  // ==========================================================================
  // 4. POSTPARTUM MATERNAL CARE
  // ==========================================================================

  async createMaternalPostpartumAssessment(req: Request, res: Response): Promise<void> {
    const admissionId = req.params.admissionId as string;
    await assertCanAccessAdmission(
      req.user!,
      admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'CREATE_MATERNAL_POSTPARTUM',
    );

    const validated = createPostpartumMaternalAssessmentSchema.parse(req.body);
    const assessment = await deliveryService.createPostpartumMaternalAssessment(
      admissionId,
      validated,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );

    res.status(201).json({
      success: true,
      data: assessment,
    });
  }

  async getMaternalPostpartumAssessments(req: Request, res: Response): Promise<void> {
    const admissionId = req.params.admissionId as string;
    await assertCanAccessAdmission(
      req.user!,
      admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'VIEW_MATERNAL_POSTPARTUM',
    );

    const list = await deliveryService.getPostpartumMaternalAssessments(admissionId);
    res.status(200).json({
      success: true,
      data: list,
    });
  }

  // ==========================================================================
  // 5. POSTPARTUM NEWBORN CARE
  // ==========================================================================

  async createNewbornPostpartumAssessment(req: Request, res: Response): Promise<void> {
    const newbornId = req.params.newbornId as string;
    const newborn = await deliveryService.getNewbornById(newbornId);
    await assertCanAccessAdmission(
      req.user!,
      newborn.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'CREATE_NEWBORN_POSTPARTUM',
    );

    const validated = createPostpartumNewbornAssessmentSchema.parse(req.body);
    const assessment = await deliveryService.createPostpartumNewbornAssessment(
      newbornId,
      validated,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );

    res.status(201).json({
      success: true,
      data: assessment,
    });
  }

  async getNewbornPostpartumAssessments(req: Request, res: Response): Promise<void> {
    const newbornId = req.params.newbornId as string;
    const newborn = await deliveryService.getNewbornById(newbornId);
    await assertCanAccessAdmission(
      req.user!,
      newborn.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'VIEW_NEWBORN_POSTPARTUM',
    );

    const list = await deliveryService.getPostpartumNewbornAssessments(newbornId);
    res.status(200).json({
      success: true,
      data: list,
    });
  }

  // ==========================================================================
  // 6. DISCHARGE AUTHORIZATION
  // ==========================================================================

  async authorizeMaternalDischarge(req: Request, res: Response): Promise<void> {
    const admissionId = req.params.admissionId as string;
    await assertCanAccessAdmission(
      req.user!,
      admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'AUTHORIZE_MATERNAL_DISCHARGE',
    );

    const validated = authorizeMaternalDischargeSchema.parse(req.body);
    const result = await deliveryService.authorizeMaternalDischarge(
      admissionId,
      validated,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async authorizeNewbornDischarge(req: Request, res: Response): Promise<void> {
    const newbornId = req.params.newbornId as string;
    const newborn = await deliveryService.getNewbornById(newbornId);
    await assertCanAccessAdmission(
      req.user!,
      newborn.admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'AUTHORIZE_NEWBORN_DISCHARGE',
    );

    const validated = authorizeNewbornDischargeSchema.parse(req.body);
    const result = await deliveryService.authorizeNewbornDischarge(
      newbornId,
      validated,
      req.user!,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getDischargeAuthorizations(req: Request, res: Response): Promise<void> {
    const admissionId = req.params.admissionId as string;
    await assertCanAccessAdmission(
      req.user!,
      admissionId,
      req.ip || null,
      (req.headers['x-request-id'] as string) || null,
      'VIEW_DISCHARGE',
    );

    const list = await deliveryService.getDischargeAuthorizations(admissionId);
    res.status(200).json({
      success: true,
      data: list,
    });
  }
}

export const deliveryController = new DeliveryController();
