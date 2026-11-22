import {
  AdmissionObservationsSummaryDto,
  AdmissionStatus,
  CarePlanState,
  FHR_OBSERVATION_DUE_MINUTES,
  UserRole,
  ClinicalObservationAmendmentDto,
  ClinicalObservationType,
  ContractionObservationDto,
  CreateContractionObservationRequest,
  CreateFetalObservationRequest,
  CreateLabourAssessmentRequest,
  CreateMaternalObservationRequest,
  FetalObservationDto,
  LabourAssessmentDto,
  MaternalObservationDto,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  AuditLog,
  ClinicalObservationAmendment,
  ContractionObservation,
  FetalObservation,
  LabourAssessment,
  MaternalObservation,
} from '../../database/entities/index.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/auth.errors.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { patientAuthorizationService } from '../admissions/patient-authorization.service.js';
import {
  createContractionObservationSchema,
  createFetalObservationSchema,
  createLabourAssessmentSchema,
  createMaternalObservationSchema,
} from './observation.schemas.js';
import {
  toClinicalObservationAmendmentDto,
  toContractionObservationDto,
  toFetalObservationDto,
  toLabourAssessmentDto,
  toMaternalObservationDto,
} from './observation.dto.js';

const ACTIVE_LABOUR_PLANS = new Set<CarePlanState>([
  CarePlanState.NORMAL_DELIVERY,
  CarePlanState.EMERGENCY_CESAREAN,
]);

// REQ-5.8: reminder only; it never raises an alert (REQ-5.5).
function isFhrObservationDue(admission: Admission, lastFhrAt: string | null): boolean {
  if (admission.status !== AdmissionStatus.ADMITTED) return false;
  if (!ACTIVE_LABOUR_PLANS.has(admission.currentCarePlan)) return false;
  const since = lastFhrAt ? new Date(lastFhrAt) : admission.admittedAt;
  return Date.now() - since.getTime() >= FHR_OBSERVATION_DUE_MINUTES * 60 * 1000;
}

function toNumberOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

export class ClinicalObservationService {
  /**
   * Helper to verify patient authorization and admission status
   */
  private async assertAdmissionAccessible(
    actor: RequestUser,
    admissionId: string,
    requireActiveAdmission = true,
  ): Promise<Admission> {
    await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

    const admission = await AppDataSource.getRepository(Admission).findOne({
      where: { id: admissionId },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    if (requireActiveAdmission && admission.status !== AdmissionStatus.ADMITTED) {
      throw new ConflictError(
        'Cannot record or amend clinical observations on a discharged admission',
        'ADMISSION_ALREADY_DISCHARGED',
      );
    }

    return admission;
  }

  // =========================================================================
  // MATERNAL OBSERVATIONS
  // =========================================================================

  public async recordMaternalObservation(
    admissionId: string,
    actor: RequestUser,
    payload: CreateMaternalObservationRequest,
  ): Promise<MaternalObservationDto> {
    await this.assertAdmissionAccessible(actor, admissionId, true);

    const validated = createMaternalObservationSchema.parse(payload);
    const observationTimestamp = validated.observationTimestamp
      ? new Date(validated.observationTimestamp)
      : new Date();

    const entity = new MaternalObservation();
    entity.admissionId = admissionId;
    entity.recordedByUserId = actor.id;
    entity.systolicBp = validated.systolicBp ?? null;
    entity.diastolicBp = validated.diastolicBp ?? null;
    entity.bloodGlucoseValue = validated.bloodGlucoseValue ?? null;
    entity.bloodGlucoseUnit = validated.bloodGlucoseUnit ?? null;
    entity.temperatureCelsius = validated.temperatureCelsius ?? null;
    entity.pulseRateBpm =
      validated.pulseRateBpm ?? (validated as { pulseRate?: number | null }).pulseRate ?? null;
    entity.respiratoryRate = validated.respiratoryRate ?? null;
    entity.oxygenSaturationPercent = validated.oxygenSaturationPercent ?? null;
    entity.clinicalNotes = validated.clinicalNotes ?? null;
    entity.observationTimestamp = observationTimestamp;

    const saved = await AppDataSource.getRepository(MaternalObservation).save(entity);

    // Audit log
    await AppDataSource.getRepository(AuditLog).save({
      userId: actor.id,
      action: 'MATERNAL_OBSERVATION_RECORDED',
      entityName: 'MaternalObservation',
      entityId: saved.id,
      details: {
        admissionId,
        hasBloodPressure: saved.systolicBp != null,
        hasPulse: saved.pulseRateBpm != null,
        hasTemperature: saved.temperatureCelsius != null,
        hasGlucose: saved.bloodGlucoseValue != null,
        observationTimestamp: saved.observationTimestamp.toISOString(),
      },
    });

    const reloaded = await AppDataSource.getRepository(MaternalObservation).findOneOrFail({
      where: { id: saved.id },
      relations: ['recordedByUser'],
    });

    return toMaternalObservationDto(reloaded);
  }

  public async listMaternalObservations(
    admissionId: string,
    actor: RequestUser,
    options?: { includeSuperseded?: boolean },
  ): Promise<MaternalObservationDto[]> {
    await this.assertAdmissionAccessible(actor, admissionId, false);

    const qb = AppDataSource.getRepository(MaternalObservation)
      .createQueryBuilder('mo')
      .leftJoinAndSelect('mo.recordedByUser', 'user')
      .leftJoinAndSelect('mo.supersededObservation', 'superseded')
      .where('mo.admissionId = :admissionId', { admissionId })
      .orderBy('mo.observationTimestamp', 'ASC');

    if (!options?.includeSuperseded) {
      qb.andWhere(
        'mo.id NOT IN (SELECT sub.supersedes_id FROM maternal_observations sub WHERE sub.supersedes_id IS NOT NULL)',
      );
    }

    const records = await qb.getMany();
    return records.map(toMaternalObservationDto);
  }

  // =========================================================================
  // FETAL OBSERVATIONS
  // =========================================================================

  public async recordFetalObservation(
    admissionId: string,
    actor: RequestUser,
    payload: CreateFetalObservationRequest,
  ): Promise<FetalObservationDto> {
    await this.assertAdmissionAccessible(actor, admissionId, true);

    const validated = createFetalObservationSchema.parse(payload);
    const observationTimestamp = validated.observationTimestamp
      ? new Date(validated.observationTimestamp)
      : new Date();

    const entity = new FetalObservation();
    entity.admissionId = admissionId;
    entity.recordedByUserId = actor.id;
    entity.fetalHeartRateBpm = validated.fetalHeartRateBpm;
    entity.fetalHeartRateUnit = validated.fetalHeartRateUnit || 'BPM';
    entity.variability = validated.variability ?? null;
    entity.decelerations = validated.decelerations ?? null;
    entity.accelerations = validated.accelerations ?? null;
    entity.liquorStatus = validated.liquorStatus ?? null;
    entity.clinicalNotes = validated.clinicalNotes ?? null;
    entity.observationTimestamp = observationTimestamp;

    const saved = await AppDataSource.getRepository(FetalObservation).save(entity);

    await AppDataSource.getRepository(AuditLog).save({
      userId: actor.id,
      action: 'FETAL_OBSERVATION_RECORDED',
      entityName: 'FetalObservation',
      entityId: saved.id,
      details: {
        admissionId,
        fhrBpm: saved.fetalHeartRateBpm,
        liquorStatus: saved.liquorStatus,
        observationTimestamp: saved.observationTimestamp.toISOString(),
      },
    });

    const reloaded = await AppDataSource.getRepository(FetalObservation).findOneOrFail({
      where: { id: saved.id },
      relations: ['recordedByUser'],
    });

    return toFetalObservationDto(reloaded);
  }

  public async listFetalObservations(
    admissionId: string,
    actor: RequestUser,
    options?: { includeSuperseded?: boolean },
  ): Promise<FetalObservationDto[]> {
    await this.assertAdmissionAccessible(actor, admissionId, false);

    const qb = AppDataSource.getRepository(FetalObservation)
      .createQueryBuilder('fo')
      .leftJoinAndSelect('fo.recordedByUser', 'user')
      .leftJoinAndSelect('fo.supersededObservation', 'superseded')
      .where('fo.admissionId = :admissionId', { admissionId })
      .orderBy('fo.observationTimestamp', 'ASC');

    if (!options?.includeSuperseded) {
      qb.andWhere(
        'fo.id NOT IN (SELECT sub.supersedes_id FROM fetal_observations sub WHERE sub.supersedes_id IS NOT NULL)',
      );
    }

    const records = await qb.getMany();
    return records.map(toFetalObservationDto);
  }

  // =========================================================================
  // LABOUR PROGRESSION ASSESSMENTS
  // =========================================================================

  public async recordLabourAssessment(
    admissionId: string,
    actor: RequestUser,
    payload: CreateLabourAssessmentRequest,
  ): Promise<LabourAssessmentDto> {
    await this.assertAdmissionAccessible(actor, admissionId, true);

    const validated = createLabourAssessmentSchema.parse(payload);
    const observationTimestamp = validated.observationTimestamp
      ? new Date(validated.observationTimestamp)
      : new Date();

    const entity = new LabourAssessment();
    entity.admissionId = admissionId;
    entity.recordedByUserId = actor.id;
    entity.cervicalDilationCm = validated.cervicalDilationCm ?? null;
    entity.cervicalEffacementPercent = validated.cervicalEffacementPercent ?? null;
    entity.fetalStation = validated.fetalStation ?? null;
    entity.fetalDescentFifths = validated.fetalDescentFifths ?? null;
    entity.membraneStatus = validated.membraneStatus ?? null;
    entity.liquorAppearance = validated.liquorAppearance ?? null;
    entity.fetalPosition = validated.fetalPosition ?? null;
    entity.caput = validated.caput ?? null;
    entity.moulding = validated.moulding ?? null;
    entity.clinicalNotes = validated.clinicalNotes ?? null;
    entity.observationTimestamp = observationTimestamp;

    const saved = await AppDataSource.getRepository(LabourAssessment).save(entity);

    await AppDataSource.getRepository(AuditLog).save({
      userId: actor.id,
      action: 'LABOUR_ASSESSMENT_RECORDED',
      entityName: 'LabourAssessment',
      entityId: saved.id,
      details: {
        admissionId,
        cervicalDilationCm: saved.cervicalDilationCm,
        fetalDescentFifths: saved.fetalDescentFifths,
        membraneStatus: saved.membraneStatus,
        observationTimestamp: saved.observationTimestamp.toISOString(),
      },
    });

    const reloaded = await AppDataSource.getRepository(LabourAssessment).findOneOrFail({
      where: { id: saved.id },
      relations: ['recordedByUser'],
    });

    return toLabourAssessmentDto(reloaded);
  }

  public async listLabourAssessments(
    admissionId: string,
    actor: RequestUser,
    options?: { includeSuperseded?: boolean },
  ): Promise<LabourAssessmentDto[]> {
    await this.assertAdmissionAccessible(actor, admissionId, false);

    const qb = AppDataSource.getRepository(LabourAssessment)
      .createQueryBuilder('la')
      .leftJoinAndSelect('la.recordedByUser', 'user')
      .leftJoinAndSelect('la.supersededAssessment', 'superseded')
      .where('la.admissionId = :admissionId', { admissionId })
      .orderBy('la.observationTimestamp', 'ASC');

    if (!options?.includeSuperseded) {
      qb.andWhere(
        'la.id NOT IN (SELECT sub.supersedes_id FROM labour_assessments sub WHERE sub.supersedes_id IS NOT NULL)',
      );
    }

    const records = await qb.getMany();
    return records.map(toLabourAssessmentDto);
  }

  // =========================================================================
  // UTERINE CONTRACTION OBSERVATIONS
  // =========================================================================

  public async recordContractionObservation(
    admissionId: string,
    actor: RequestUser,
    payload: CreateContractionObservationRequest,
  ): Promise<ContractionObservationDto> {
    await this.assertAdmissionAccessible(actor, admissionId, true);

    const validated = createContractionObservationSchema.parse(payload);
    const observationTimestamp = validated.observationTimestamp
      ? new Date(validated.observationTimestamp)
      : new Date();

    const entity = new ContractionObservation();
    entity.admissionId = admissionId;
    entity.recordedByUserId = actor.id;
    entity.contractionsCount = validated.contractionsCount;
    entity.observationWindowMinutes = validated.observationWindowMinutes || 10;
    entity.durationSeconds = validated.durationSeconds ?? null;
    entity.intensity = validated.intensity ?? null;
    entity.clinicalNotes = validated.clinicalNotes ?? null;
    entity.observationTimestamp = observationTimestamp;

    const saved = await AppDataSource.getRepository(ContractionObservation).save(entity);

    await AppDataSource.getRepository(AuditLog).save({
      userId: actor.id,
      action: 'CONTRACTION_OBSERVATION_RECORDED',
      entityName: 'ContractionObservation',
      entityId: saved.id,
      details: {
        admissionId,
        contractionsCount: saved.contractionsCount,
        durationSeconds: saved.durationSeconds,
        intensity: saved.intensity,
        observationTimestamp: saved.observationTimestamp.toISOString(),
      },
    });

    const reloaded = await AppDataSource.getRepository(ContractionObservation).findOneOrFail({
      where: { id: saved.id },
      relations: ['recordedByUser'],
    });

    return toContractionObservationDto(reloaded);
  }

  public async listContractionObservations(
    admissionId: string,
    actor: RequestUser,
    options?: { includeSuperseded?: boolean },
  ): Promise<ContractionObservationDto[]> {
    await this.assertAdmissionAccessible(actor, admissionId, false);

    const qb = AppDataSource.getRepository(ContractionObservation)
      .createQueryBuilder('co')
      .leftJoinAndSelect('co.recordedByUser', 'user')
      .leftJoinAndSelect('co.supersededObservation', 'superseded')
      .where('co.admissionId = :admissionId', { admissionId })
      .orderBy('co.observationTimestamp', 'ASC');

    if (!options?.includeSuperseded) {
      qb.andWhere(
        'co.id NOT IN (SELECT sub.supersedes_id FROM contraction_observations sub WHERE sub.supersedes_id IS NOT NULL)',
      );
    }

    const records = await qb.getMany();
    return records.map(toContractionObservationDto);
  }

  // =========================================================================
  // CLINICAL OBSERVATION AMENDMENT (CORRECTION WORKFLOW)
  // =========================================================================

  public async amendObservation(
    admissionId: string,
    observationId: string,
    observationType: ClinicalObservationType,
    actor: RequestUser,
    amendmentReason: string,
    amendedValues: Record<string, unknown>,
  ): Promise<{
    amendment: ClinicalObservationAmendmentDto;
    amendedObservation:
      | MaternalObservationDto
      | FetalObservationDto
      | LabourAssessmentDto
      | ContractionObservationDto;
  }> {
    // REQ-8.4: closed admissions are read-only except for doctor corrections.
    await this.assertAdmissionAccessible(actor, admissionId, actor.role !== UserRole.DOCTOR);

    if (!amendmentReason || amendmentReason.trim().length < 10) {
      throw new BadRequestError('Amendment reason must contain at least 10 characters');
    }

    return await AppDataSource.transaction(async (tx) => {
      let previousValues: Record<string, unknown> = {};
      let amendedObservationDto:
        | MaternalObservationDto
        | FetalObservationDto
        | LabourAssessmentDto
        | ContractionObservationDto;
      let newRecordId: string;

      switch (observationType) {
        case ClinicalObservationType.MATERNAL: {
          const original = await tx.getRepository(MaternalObservation).findOne({
            where: { id: observationId, admissionId },
          });
          if (!original) throw new NotFoundError('Maternal observation not found for amendment');

          // Check if already superseded
          const existingSupersede = await tx.getRepository(MaternalObservation).findOne({
            where: { supersedesId: observationId },
          });
          if (existingSupersede) {
            throw new ConflictError(
              'This observation has already been amended by a subsequent record',
              'OBSERVATION_ALREADY_AMENDED',
            );
          }

          previousValues = {
            systolicBp: original.systolicBp,
            diastolicBp: original.diastolicBp,
            // NUMERIC columns come back from pg as strings.
            bloodGlucoseValue: toNumberOrNull(original.bloodGlucoseValue),
            bloodGlucoseUnit: original.bloodGlucoseUnit,
            temperatureCelsius: toNumberOrNull(original.temperatureCelsius),
            pulseRateBpm: original.pulseRateBpm,
            respiratoryRate: original.respiratoryRate,
            oxygenSaturationPercent: original.oxygenSaturationPercent,
            clinicalNotes: original.clinicalNotes,
          };

          const validated = createMaternalObservationSchema.parse({
            ...previousValues,
            ...amendedValues,
          });

          const newRecord = new MaternalObservation();
          newRecord.admissionId = admissionId;
          newRecord.recordedByUserId = actor.id;
          newRecord.systolicBp = validated.systolicBp ?? null;
          newRecord.diastolicBp = validated.diastolicBp ?? null;
          newRecord.bloodGlucoseValue = validated.bloodGlucoseValue ?? null;
          newRecord.bloodGlucoseUnit = validated.bloodGlucoseUnit ?? null;
          newRecord.temperatureCelsius = validated.temperatureCelsius ?? null;
          newRecord.pulseRateBpm = validated.pulseRateBpm ?? null;
          newRecord.respiratoryRate = validated.respiratoryRate ?? null;
          newRecord.oxygenSaturationPercent = validated.oxygenSaturationPercent ?? null;
          newRecord.clinicalNotes = validated.clinicalNotes ?? null;
          newRecord.observationTimestamp = original.observationTimestamp; // Preserve original observation timestamp
          newRecord.supersedesId = original.id;
          newRecord.supersedeReason = amendmentReason.trim();

          const saved = await tx.getRepository(MaternalObservation).save(newRecord);
          newRecordId = saved.id;

          const reloaded = await tx.getRepository(MaternalObservation).findOneOrFail({
            where: { id: saved.id },
            relations: ['recordedByUser'],
          });
          amendedObservationDto = toMaternalObservationDto(reloaded);
          break;
        }

        case ClinicalObservationType.FETAL: {
          const original = await tx.getRepository(FetalObservation).findOne({
            where: { id: observationId, admissionId },
          });
          if (!original) throw new NotFoundError('Fetal observation not found for amendment');

          const existingSupersede = await tx.getRepository(FetalObservation).findOne({
            where: { supersedesId: observationId },
          });
          if (existingSupersede) {
            throw new ConflictError(
              'This observation has already been amended by a subsequent record',
              'OBSERVATION_ALREADY_AMENDED',
            );
          }

          previousValues = {
            fetalHeartRateBpm: original.fetalHeartRateBpm,
            fetalHeartRateUnit: original.fetalHeartRateUnit,
            variability: original.variability,
            decelerations: original.decelerations,
            accelerations: original.accelerations,
            liquorStatus: original.liquorStatus,
            clinicalNotes: original.clinicalNotes,
          };

          const validated = createFetalObservationSchema.parse({
            ...previousValues,
            ...amendedValues,
          });

          const newRecord = new FetalObservation();
          newRecord.admissionId = admissionId;
          newRecord.recordedByUserId = actor.id;
          newRecord.fetalHeartRateBpm = validated.fetalHeartRateBpm;
          newRecord.fetalHeartRateUnit = validated.fetalHeartRateUnit || 'BPM';
          newRecord.variability = validated.variability ?? null;
          newRecord.decelerations = validated.decelerations ?? null;
          newRecord.accelerations = validated.accelerations ?? null;
          newRecord.liquorStatus = validated.liquorStatus ?? null;
          newRecord.clinicalNotes = validated.clinicalNotes ?? null;
          newRecord.observationTimestamp = original.observationTimestamp;
          newRecord.supersedesId = original.id;
          newRecord.supersedeReason = amendmentReason.trim();

          const saved = await tx.getRepository(FetalObservation).save(newRecord);
          newRecordId = saved.id;

          const reloaded = await tx.getRepository(FetalObservation).findOneOrFail({
            where: { id: saved.id },
            relations: ['recordedByUser'],
          });
          amendedObservationDto = toFetalObservationDto(reloaded);
          break;
        }

        case ClinicalObservationType.LABOUR_ASSESSMENT: {
          const original = await tx.getRepository(LabourAssessment).findOne({
            where: { id: observationId, admissionId },
          });
          if (!original) throw new NotFoundError('Labour assessment not found for amendment');

          const existingSupersede = await tx.getRepository(LabourAssessment).findOne({
            where: { supersedesId: observationId },
          });
          if (existingSupersede) {
            throw new ConflictError(
              'This assessment has already been amended by a subsequent record',
              'OBSERVATION_ALREADY_AMENDED',
            );
          }

          previousValues = {
            cervicalDilationCm: toNumberOrNull(original.cervicalDilationCm),
            cervicalEffacementPercent: original.cervicalEffacementPercent,
            fetalStation: original.fetalStation,
            fetalDescentFifths: original.fetalDescentFifths,
            membraneStatus: original.membraneStatus,
            liquorAppearance: original.liquorAppearance,
            fetalPosition: original.fetalPosition,
            caput: original.caput,
            moulding: original.moulding,
            clinicalNotes: original.clinicalNotes,
          };

          const validated = createLabourAssessmentSchema.parse({
            ...previousValues,
            ...amendedValues,
          });

          const newRecord = new LabourAssessment();
          newRecord.admissionId = admissionId;
          newRecord.recordedByUserId = actor.id;
          newRecord.cervicalDilationCm = validated.cervicalDilationCm ?? null;
          newRecord.cervicalEffacementPercent = validated.cervicalEffacementPercent ?? null;
          newRecord.fetalStation = validated.fetalStation ?? null;
          newRecord.fetalDescentFifths = validated.fetalDescentFifths ?? null;
          newRecord.membraneStatus = validated.membraneStatus ?? null;
          newRecord.liquorAppearance = validated.liquorAppearance ?? null;
          newRecord.fetalPosition = validated.fetalPosition ?? null;
          newRecord.caput = validated.caput ?? null;
          newRecord.moulding = validated.moulding ?? null;
          newRecord.clinicalNotes = validated.clinicalNotes ?? null;
          newRecord.observationTimestamp = original.observationTimestamp;
          newRecord.supersedesId = original.id;
          newRecord.supersedeReason = amendmentReason.trim();

          const saved = await tx.getRepository(LabourAssessment).save(newRecord);
          newRecordId = saved.id;

          const reloaded = await tx.getRepository(LabourAssessment).findOneOrFail({
            where: { id: saved.id },
            relations: ['recordedByUser'],
          });
          amendedObservationDto = toLabourAssessmentDto(reloaded);
          break;
        }

        case ClinicalObservationType.CONTRACTION: {
          const original = await tx.getRepository(ContractionObservation).findOne({
            where: { id: observationId, admissionId },
          });
          if (!original) throw new NotFoundError('Contraction observation not found for amendment');

          const existingSupersede = await tx.getRepository(ContractionObservation).findOne({
            where: { supersedesId: observationId },
          });
          if (existingSupersede) {
            throw new ConflictError(
              'This observation has already been amended by a subsequent record',
              'OBSERVATION_ALREADY_AMENDED',
            );
          }

          previousValues = {
            contractionsCount: original.contractionsCount,
            observationWindowMinutes: original.observationWindowMinutes,
            durationSeconds: original.durationSeconds,
            intensity: original.intensity,
            clinicalNotes: original.clinicalNotes,
          };

          const validated = createContractionObservationSchema.parse({
            ...previousValues,
            ...amendedValues,
          });

          const newRecord = new ContractionObservation();
          newRecord.admissionId = admissionId;
          newRecord.recordedByUserId = actor.id;
          newRecord.contractionsCount = validated.contractionsCount;
          newRecord.observationWindowMinutes = validated.observationWindowMinutes || 10;
          newRecord.durationSeconds = validated.durationSeconds ?? null;
          newRecord.intensity = validated.intensity ?? null;
          newRecord.clinicalNotes = validated.clinicalNotes ?? null;
          newRecord.observationTimestamp = original.observationTimestamp;
          newRecord.supersedesId = original.id;
          newRecord.supersedeReason = amendmentReason.trim();

          const saved = await tx.getRepository(ContractionObservation).save(newRecord);
          newRecordId = saved.id;

          const reloaded = await tx.getRepository(ContractionObservation).findOneOrFail({
            where: { id: saved.id },
            relations: ['recordedByUser'],
          });
          amendedObservationDto = toContractionObservationDto(reloaded);
          break;
        }

        default:
          throw new BadRequestError('Invalid observation type for amendment');
      }

      // Create amendment record in clinical_observation_amendments
      const amendmentEntity = new ClinicalObservationAmendment();
      amendmentEntity.admissionId = admissionId;
      amendmentEntity.observationType = observationType;
      amendmentEntity.originalObservationId = observationId;
      amendmentEntity.amendedObservationId = newRecordId;
      amendmentEntity.amendedByUserId = actor.id;
      amendmentEntity.amendmentReason = amendmentReason.trim();
      amendmentEntity.previousValues = previousValues;
      amendmentEntity.amendedValues = amendedValues;

      const savedAmendment = await tx
        .getRepository(ClinicalObservationAmendment)
        .save(amendmentEntity);

      // Audit log
      await tx.getRepository(AuditLog).save({
        userId: actor.id,
        action: 'CLINICAL_OBSERVATION_AMENDED',
        entityName: 'ClinicalObservationAmendment',
        entityId: savedAmendment.id,
        details: {
          admissionId,
          observationType,
          originalObservationId: observationId,
          amendedObservationId: newRecordId,
          amendmentReason: amendmentReason.trim(),
        },
      });

      const reloadedAmendment = await tx.getRepository(ClinicalObservationAmendment).findOneOrFail({
        where: { id: savedAmendment.id },
        relations: ['amendedByUser'],
      });

      return {
        amendment: toClinicalObservationAmendmentDto(reloadedAmendment),
        amendedObservation: amendedObservationDto,
      };
    });
  }

  public async listObservationAmendments(
    admissionId: string,
    actor: RequestUser,
    observationId?: string,
  ): Promise<ClinicalObservationAmendmentDto[]> {
    await this.assertAdmissionAccessible(actor, admissionId, false);

    const qb = AppDataSource.getRepository(ClinicalObservationAmendment)
      .createQueryBuilder('coa')
      .leftJoinAndSelect('coa.amendedByUser', 'user')
      .where('coa.admissionId = :admissionId', { admissionId })
      .orderBy('coa.createdAt', 'DESC');

    if (observationId) {
      qb.andWhere(
        '(coa.originalObservationId = :observationId OR coa.amendedObservationId = :observationId)',
        { observationId },
      );
    }

    const records = await qb.getMany();
    return records.map(toClinicalObservationAmendmentDto);
  }

  // =========================================================================
  // SUMMARY OVERVIEW
  // =========================================================================

  public async getAdmissionObservationsSummary(
    admissionId: string,
    actor: RequestUser,
  ): Promise<AdmissionObservationsSummaryDto> {
    await this.assertAdmissionAccessible(actor, admissionId, false);

    const [maternal, fetal, labour, contractions, amendments] = await Promise.all([
      this.listMaternalObservations(admissionId, actor, { includeSuperseded: false }),
      this.listFetalObservations(admissionId, actor, { includeSuperseded: false }),
      this.listLabourAssessments(admissionId, actor, { includeSuperseded: false }),
      this.listContractionObservations(admissionId, actor, { includeSuperseded: false }),
      this.listObservationAmendments(admissionId, actor),
    ]);

    // Find latest timestamp among all active observations
    const allTimestamps: number[] = [
      ...maternal.map((m) => new Date(m.observationTimestamp).getTime()),
      ...fetal.map((f) => new Date(f.observationTimestamp).getTime()),
      ...labour.map((l) => new Date(l.observationTimestamp).getTime()),
      ...contractions.map((c) => new Date(c.observationTimestamp).getTime()),
    ].filter((t) => !isNaN(t));

    const latestObservationTimestamp =
      allTimestamps.length > 0 ? new Date(Math.max(...allTimestamps)).toISOString() : null;

    const admission = await AppDataSource.getRepository(Admission).findOneOrFail({
      where: { id: admissionId },
    });
    const lastFhr = fetal.length > 0 ? fetal[fetal.length - 1].observationTimestamp : null;
    const fhrObservationDue = isFhrObservationDue(admission, lastFhr);

    // REQ-5.7: newest entries first.
    maternal.reverse();
    fetal.reverse();
    labour.reverse();
    contractions.reverse();

    return {
      admissionId,
      maternalCount: maternal.length,
      fetalCount: fetal.length,
      labourAssessmentCount: labour.length,
      contractionCount: contractions.length,
      totalObservationsCount: maternal.length + fetal.length + labour.length + contractions.length,
      latestObservationTimestamp,
      lastFetalHeartRateAt: lastFhr,
      fhrObservationDue,
      maternalObservations: maternal,
      fetalObservations: fetal,
      labourAssessments: labour,
      contractions,
      amendments,
    };
  }
}

export const clinicalObservationService = new ClinicalObservationService();
