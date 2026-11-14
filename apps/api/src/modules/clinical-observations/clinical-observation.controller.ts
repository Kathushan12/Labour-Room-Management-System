import { Request, Response, NextFunction } from 'express';
import { ClinicalObservationType } from '@lrms/shared';
import { clinicalObservationService } from './clinical-observation.service.js';
import { partographService } from './partograph.service.js';
import { amendClinicalObservationSchema } from './observation.schemas.js';

export class ClinicalObservationController {
  // =========================================================================
  // MATERNAL OBSERVATIONS
  // =========================================================================

  public async recordMaternalObservation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const result = await clinicalObservationService.recordMaternalObservation(
        admissionId,
        actor,
        req.body,
      );
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listMaternalObservations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const includeSuperseded = req.query.includeSuperseded === 'true';
      const result = await clinicalObservationService.listMaternalObservations(admissionId, actor, {
        includeSuperseded,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // FETAL OBSERVATIONS
  // =========================================================================

  public async recordFetalObservation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const result = await clinicalObservationService.recordFetalObservation(
        admissionId,
        actor,
        req.body,
      );
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listFetalObservations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const includeSuperseded = req.query.includeSuperseded === 'true';
      const result = await clinicalObservationService.listFetalObservations(admissionId, actor, {
        includeSuperseded,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // LABOUR ASSESSMENTS
  // =========================================================================

  public async recordLabourAssessment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const result = await clinicalObservationService.recordLabourAssessment(
        admissionId,
        actor,
        req.body,
      );
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listLabourAssessments(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const includeSuperseded = req.query.includeSuperseded === 'true';
      const result = await clinicalObservationService.listLabourAssessments(admissionId, actor, {
        includeSuperseded,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // UTERINE CONTRACTIONS
  // =========================================================================

  public async recordContractionObservation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const result = await clinicalObservationService.recordContractionObservation(
        admissionId,
        actor,
        req.body,
      );
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listContractionObservations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const includeSuperseded = req.query.includeSuperseded === 'true';
      const result = await clinicalObservationService.listContractionObservations(
        admissionId,
        actor,
        { includeSuperseded },
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // OBSERVATION SUMMARY & HISTORY
  // =========================================================================

  public async getAdmissionObservationsSummary(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const result = await clinicalObservationService.getAdmissionObservationsSummary(
        admissionId,
        actor,
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // PARTOGRAPH
  // =========================================================================

  public async getPartograph(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const actor = req.user!;
      const result = await partographService.getPartograph(admissionId, actor);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // AMENDMENT (CORRECTION WORKFLOW)
  // =========================================================================

  public async amendObservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admissionId = req.params.id;
      const observationId = req.params.observationId || req.body.observationId;
      const actor = req.user!;
      const observationType = (req.body.observationType ||
        req.query.type) as ClinicalObservationType;

      const validated = amendClinicalObservationSchema.parse(req.body);
      const amendedValues = (validated.amendedValues || validated.amendedData || {}) as Record<
        string,
        unknown
      >;

      const result = await clinicalObservationService.amendObservation(
        admissionId,
        observationId,
        observationType,
        actor,
        validated.amendmentReason,
        amendedValues,
      );

      res.status(200).json({
        success: true,
        data: {
          ...result,
          amendmentRecord: result.amendment,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async listObservationAmendments(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const admissionId = req.params.id;
      const observationId = req.params.observationId;
      const actor = req.user!;
      const result = await clinicalObservationService.listObservationAmendments(
        admissionId,
        actor,
        observationId,
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const clinicalObservationController = new ClinicalObservationController();
