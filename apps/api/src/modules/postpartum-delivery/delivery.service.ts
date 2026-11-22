import { DataSource, IsNull } from 'typeorm';
import {
  AdmissionStatus,
  ApgarAssessmentDto,
  AuthorizeMaternalDischargeInput,
  AuthorizeNewbornDischargeInput,
  BedCleaningStatus,
  BedOccupancyStatus,
  CarePlanState,
  CreateDeliveryInput,
  CreatePostpartumMaternalAssessmentInput,
  CreatePostpartumNewbornAssessmentInput,
  DeliveryDto,
  DeliveryStatus,
  DischargedEntityType,
  FinalizeDeliveryInput,
  NewbornDto,
  NotificationPriority,
  NotificationType,
  PostpartumDischargeAuthorizationDto,
  PostpartumMaternalAssessmentDto,
  PostpartumNewbornAssessmentDto,
  RecordApgarInput,
  RegisterNewbornInput,
  UpdateDeliveryInput,
  UserRole,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  ApgarAssessment,
  AuditLog,
  Bed,
  BedAllocationHistory,
  Delivery,
  Newborn,
  PostpartumDischargeAuthorization,
  PostpartumMaternalAssessment,
  PostpartumNewbornAssessment,
} from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/auth.errors.js';
import {
  toApgarAssessmentDto,
  toDeliveryDto,
  toNewbornDto,
  toPostpartumDischargeAuthorizationDto,
  toPostpartumMaternalAssessmentDto,
  toPostpartumNewbornAssessmentDto,
} from './delivery.dto.js';
import { outboxService } from '../realtime/outbox.service.js';
import { notificationDispatcherService } from '../realtime/notification-dispatcher.service.js';
import { emitBedUpdated } from '../realtime/realtime.server.js';
import { changeCarePlanState } from '../admissions/care-plan-state.service.js';

export class DeliveryService {
  constructor(private dataSource: DataSource = AppDataSource) {}

  private async generateDeliveryReferenceId(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.dataSource.getRepository(Delivery).count();
    const seq = String(count + 1).padStart(4, '0');
    return `DEL-${dateStr}-${seq}`;
  }

  private async generateNewbornReferenceId(admissionRef: string, order: number): Promise<string> {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `NB-${admissionRef}-${order}-${randomSuffix}`;
  }

  // ==========================================================================
  // 1. DELIVERY EVENT MANAGEMENT
  // ==========================================================================

  async createDelivery(
    admissionId: string,
    input: CreateDeliveryInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<DeliveryDto> {
    const delivery = await this.dataSource.transaction(async (tm) => {
      const admission = await tm.findOne(Admission, {
        where: { id: admissionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!admission) {
        throw new NotFoundError(
          `Admission not found with ID ${admissionId}`,
          'ADMISSION_NOT_FOUND',
        );
      }

      if (admission.status !== AdmissionStatus.ADMITTED) {
        throw new BadRequestError(
          `Cannot record delivery for admission with status '${admission.status}'. Patient must be actively ADMITTED.`,
          'ADMISSION_NOT_ACTIVE',
        );
      }

      const existingFinalized = await tm.findOne(Delivery, {
        where: { admissionId, status: DeliveryStatus.FINALIZED },
      });
      if (existingFinalized) {
        throw new ConflictError(
          `Admission '${admission.admissionReferenceId}' already has a finalized delivery record (${existingFinalized.deliveryReferenceId}). Duplicate finalized deliveries are prohibited.`,
          'DUPLICATE_FINALIZED_DELIVERY',
        );
      }

      const deliveryReferenceId = await this.generateDeliveryReferenceId();

      const newDelivery = tm.create(Delivery, {
        admissionId,
        deliveryReferenceId,
        status: DeliveryStatus.DRAFT,
        deliveryTimestamp: new Date(input.deliveryTimestamp),
        deliveryMode: input.deliveryMode,
        deliveryLocation: input.deliveryLocation,
        attendingDoctorId: input.attendingDoctorId,
        responsibleMidwifeId: input.responsibleMidwifeId || null,
        recordedByUserId: actor.id,
        estimatedBloodLossMl: input.estimatedBloodLossMl ?? null,
        perinealTraumaStatus: input.perinealTraumaStatus || null,
        placentaStatus: input.placentaStatus || null,
        placentaDeliveryTimestamp: input.placentaDeliveryTimestamp
          ? new Date(input.placentaDeliveryTimestamp)
          : null,
        clinicalNotes: input.clinicalNotes || null,
      });

      const saved = await tm.save(newDelivery);

      // REQ-8.1: recording the delivery mode and time moves the care plan to DELIVERED.
      if (admission.currentCarePlan !== CarePlanState.DELIVERED) {
        await changeCarePlanState(
          tm,
          admission,
          CarePlanState.DELIVERED,
          actor.id,
          `Delivery recorded (${saved.deliveryMode})`,
          { ipAddress, requestId },
        );
      }

      // Audit Log
      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'DELIVERY_CREATED',
          entityName: 'Delivery',
          entityId: saved.id,
          ipAddress,
          details: {
            requestId,
            admissionId,
            deliveryReferenceId: saved.deliveryReferenceId,
            deliveryMode: saved.deliveryMode,
            status: saved.status,
          },
        }),
      );

      // Outbox Notification
      await outboxService.recordEvent(tm, {
        eventType: NotificationType.DELIVERY_RECORDED,
        aggregateType: 'Delivery',
        aggregateId: saved.id,
        admissionId,
        payload: {
          deliveryReferenceId: saved.deliveryReferenceId,
          deliveryMode: saved.deliveryMode,
          status: saved.status,
          recordedBy: actor.username,
        },
      });

      return saved;
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return this.getDeliveryById(delivery.id);
  }

  async getDeliveryByAdmissionId(admissionId: string): Promise<DeliveryDto | null> {
    const delivery = await this.dataSource.getRepository(Delivery).findOne({
      where: { admissionId },
      order: { createdAt: 'DESC' },
      relations: [
        'attendingDoctor',
        'attendingDoctor.staffProfile',
        'responsibleMidwife',
        'responsibleMidwife.staffProfile',
        'recordedByUser',
        'recordedByUser.staffProfile',
        'finalizedByUser',
        'finalizedByUser.staffProfile',
        'newborns',
        'newborns.deliveredByUser',
        'newborns.deliveredByUser.staffProfile',
        'newborns.apgarAssessments',
        'newborns.apgarAssessments.assessedByUser',
        'newborns.apgarAssessments.assessedByUser.staffProfile',
      ],
    });

    return delivery ? toDeliveryDto(delivery) : null;
  }

  async getDeliveryById(id: string): Promise<DeliveryDto> {
    const delivery = await this.dataSource.getRepository(Delivery).findOne({
      where: { id },
      relations: [
        'attendingDoctor',
        'attendingDoctor.staffProfile',
        'responsibleMidwife',
        'responsibleMidwife.staffProfile',
        'recordedByUser',
        'recordedByUser.staffProfile',
        'finalizedByUser',
        'finalizedByUser.staffProfile',
        'newborns',
        'newborns.deliveredByUser',
        'newborns.deliveredByUser.staffProfile',
        'newborns.apgarAssessments',
        'newborns.apgarAssessments.assessedByUser',
        'newborns.apgarAssessments.assessedByUser.staffProfile',
      ],
    });

    if (!delivery) {
      throw new NotFoundError(`Delivery record not found with ID ${id}`, 'DELIVERY_NOT_FOUND');
    }

    return toDeliveryDto(delivery);
  }

  async updateDelivery(
    id: string,
    input: UpdateDeliveryInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<DeliveryDto> {
    await this.dataSource.transaction(async (tm) => {
      const delivery = await tm.findOne(Delivery, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!delivery) {
        throw new NotFoundError(`Delivery record not found with ID ${id}`, 'DELIVERY_NOT_FOUND');
      }

      if (delivery.status === DeliveryStatus.FINALIZED) {
        if (!input.amendmentReason || input.amendmentReason.trim().length === 0) {
          throw new BadRequestError(
            'Amending a clinically finalized delivery record strictly requires an amendmentReason justifying the change.',
            'AMENDMENT_REASON_REQUIRED',
          );
        }
      }

      if (input.deliveryTimestamp) delivery.deliveryTimestamp = new Date(input.deliveryTimestamp);
      if (input.deliveryMode) delivery.deliveryMode = input.deliveryMode;
      if (input.deliveryLocation) delivery.deliveryLocation = input.deliveryLocation;
      if (input.attendingDoctorId) delivery.attendingDoctorId = input.attendingDoctorId;
      if (input.responsibleMidwifeId !== undefined) {
        delivery.responsibleMidwifeId = input.responsibleMidwifeId;
      }
      if (input.estimatedBloodLossMl !== undefined) {
        delivery.estimatedBloodLossMl = input.estimatedBloodLossMl;
      }
      if (input.perinealTraumaStatus !== undefined) {
        delivery.perinealTraumaStatus = input.perinealTraumaStatus;
      }
      if (input.placentaStatus !== undefined) delivery.placentaStatus = input.placentaStatus;
      if (input.placentaDeliveryTimestamp !== undefined) {
        delivery.placentaDeliveryTimestamp = input.placentaDeliveryTimestamp
          ? new Date(input.placentaDeliveryTimestamp)
          : null;
      }
      if (input.clinicalNotes !== undefined) delivery.clinicalNotes = input.clinicalNotes;
      if (input.amendmentReason) delivery.amendmentReason = input.amendmentReason;

      await tm.save(delivery);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'DELIVERY_UPDATED',
          entityName: 'Delivery',
          entityId: delivery.id,
          ipAddress,
          details: {
            requestId,
            amendmentReason: input.amendmentReason || null,
            status: delivery.status,
          },
        }),
      );
    });

    return this.getDeliveryById(id);
  }

  async finalizeDelivery(
    id: string,
    input: FinalizeDeliveryInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<DeliveryDto> {
    await this.dataSource.transaction(async (tm) => {
      const delivery = await tm.findOne(Delivery, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!delivery) {
        throw new NotFoundError(`Delivery record not found with ID ${id}`, 'DELIVERY_NOT_FOUND');
      }

      if (delivery.status === DeliveryStatus.FINALIZED) {
        throw new ConflictError(
          'This delivery record has already been finalized and verified.',
          'DELIVERY_ALREADY_FINALIZED',
        );
      }

      // Check for any duplicate finalized delivery on the same admission
      const existingFinalized = await tm.findOne(Delivery, {
        where: { admissionId: delivery.admissionId, status: DeliveryStatus.FINALIZED },
      });
      if (existingFinalized && existingFinalized.id !== delivery.id) {
        throw new ConflictError(
          'Another delivery record for this admission is already finalized.',
          'DUPLICATE_FINALIZED_DELIVERY',
        );
      }

      delivery.status = DeliveryStatus.FINALIZED;
      delivery.finalizedAt = new Date();
      delivery.finalizedByUserId = actor.id;
      if (input.clinicalSummary) {
        delivery.clinicalNotes = delivery.clinicalNotes
          ? `${delivery.clinicalNotes}\n\n[Finalization Summary by ${actor.username}]: ${input.clinicalSummary}`
          : `[Finalization Summary by ${actor.username}]: ${input.clinicalSummary}`;
      }

      await tm.save(delivery);

      // Audit Log
      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'DELIVERY_FINALIZED',
          entityName: 'Delivery',
          entityId: delivery.id,
          ipAddress,
          details: {
            requestId,
            deliveryReferenceId: delivery.deliveryReferenceId,
            finalizedAt: delivery.finalizedAt.toISOString(),
          },
        }),
      );

      // Outbox Notification
      await outboxService.recordEvent(tm, {
        eventType: NotificationType.DELIVERY_FINALIZED,
        aggregateType: 'Delivery',
        aggregateId: delivery.id,
        admissionId: delivery.admissionId,
        payload: {
          deliveryReferenceId: delivery.deliveryReferenceId,
          finalizedBy: actor.username,
          finalizedAt: delivery.finalizedAt.toISOString(),
        },
      });
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return this.getDeliveryById(id);
  }

  // ==========================================================================
  // 2. NEWBORN REGISTRATION & MULTIPLE BIRTHS
  // ==========================================================================

  async registerNewborn(
    deliveryId: string,
    input: RegisterNewbornInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<NewbornDto> {
    const newborn = await this.dataSource.transaction(async (tm) => {
      const delivery = await tm.findOne(Delivery, {
        where: { id: deliveryId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!delivery) {
        throw new NotFoundError(
          `Delivery record not found with ID ${deliveryId}`,
          'DELIVERY_NOT_FOUND',
        );
      }

      // Pre-check for duplicate birth order within the same delivery
      const existingOrder = await tm.findOne(Newborn, {
        where: { deliveryId, birthOrder: input.birthOrder },
      });
      if (existingOrder) {
        throw new ConflictError(
          `Baby #${input.birthOrder} is already registered under delivery '${delivery.deliveryReferenceId}'. For multiple births, specify sequential birth orders.`,
          'DUPLICATE_BIRTH_ORDER',
        );
      }

      const admissionRef = delivery.admission?.admissionReferenceId || 'ADM';
      const newbornReferenceId = await this.generateNewbornReferenceId(
        admissionRef,
        input.birthOrder,
      );

      const newBaby = tm.create(Newborn, {
        deliveryId,
        admissionId: delivery.admissionId,
        newbornReferenceId,
        birthOrder: input.birthOrder,
        birthTimestamp: new Date(input.birthTimestamp),
        outcome: input.outcome,
        sex: input.sex,
        birthWeightGrams: input.birthWeightGrams,
        gestationalAgeWeeks: input.gestationalAgeWeeks ?? null,
        gestationalAgeDays: input.gestationalAgeDays ?? null,
        deliveredByUserId: input.deliveredByUserId,
        provisionalName: input.provisionalName || null,
      });

      let saved: Newborn;
      try {
        saved = await tm.save(newBaby);
      } catch (err: unknown) {
        const pgErr = err as { code?: string; constraint?: string };
        if (pgErr?.code === '23505' && pgErr?.constraint === 'uq_delivery_birth_order') {
          throw new ConflictError(
            `A newborn with birth order #${input.birthOrder} was registered concurrently for this delivery.`,
            'DUPLICATE_BIRTH_ORDER',
          );
        }
        throw err;
      }

      // Audit Logs
      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'NEWBORN_REGISTERED',
          entityName: 'Newborn',
          entityId: saved.id,
          ipAddress,
          details: {
            requestId,
            deliveryId,
            admissionId: delivery.admissionId,
            newbornReferenceId: saved.newbornReferenceId,
            birthOrder: saved.birthOrder,
            outcome: saved.outcome,
            birthWeightGrams: saved.birthWeightGrams,
          },
        }),
      );

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'BIRTH_RECORD_CREATED',
          entityName: 'Newborn',
          entityId: saved.id,
          ipAddress,
          details: {
            requestId,
            newbornReferenceId: saved.newbornReferenceId,
            outcome: saved.outcome,
          },
        }),
      );

      // Outbox Notification
      await outboxService.recordEvent(tm, {
        eventType: NotificationType.NEWBORN_REGISTERED,
        aggregateType: 'Newborn',
        aggregateId: saved.id,
        admissionId: delivery.admissionId,
        payload: {
          newbornReferenceId: saved.newbornReferenceId,
          birthOrder: saved.birthOrder,
          outcome: saved.outcome,
          sex: saved.sex,
          birthWeightGrams: saved.birthWeightGrams,
        },
      });

      return saved;
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return this.getNewbornById(newborn.id);
  }

  async getNewbornsByAdmissionId(admissionId: string): Promise<NewbornDto[]> {
    const newborns = await this.dataSource.getRepository(Newborn).find({
      where: { admissionId },
      order: { birthOrder: 'ASC' },
      relations: [
        'deliveredByUser',
        'deliveredByUser.staffProfile',
        'apgarAssessments',
        'apgarAssessments.assessedByUser',
        'apgarAssessments.assessedByUser.staffProfile',
      ],
    });

    return newborns.map(toNewbornDto);
  }

  async getNewbornById(id: string): Promise<NewbornDto> {
    const newborn = await this.dataSource.getRepository(Newborn).findOne({
      where: { id },
      relations: [
        'deliveredByUser',
        'deliveredByUser.staffProfile',
        'apgarAssessments',
        'apgarAssessments.assessedByUser',
        'apgarAssessments.assessedByUser.staffProfile',
      ],
    });

    if (!newborn) {
      throw new NotFoundError(`Newborn not found with ID ${id}`, 'NEWBORN_NOT_FOUND');
    }

    return toNewbornDto(newborn);
  }

  // ==========================================================================
  // 3. APGAR ASSESSMENTS
  // ==========================================================================

  async recordApgarAssessment(
    newbornId: string,
    input: RecordApgarInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<ApgarAssessmentDto> {
    const savedAssessment = await this.dataSource.transaction(async (tm) => {
      const newborn = await tm.findOne(Newborn, {
        where: { id: newbornId },
      });

      if (!newborn) {
        throw new NotFoundError(`Newborn not found with ID ${newbornId}`, 'NEWBORN_NOT_FOUND');
      }

      // Server-side calculated total score (sum of 5 components 0-2)
      const calculatedTotal =
        input.appearance + input.pulse + input.grimace + input.activity + input.respiration;

      if (calculatedTotal < 0 || calculatedTotal > 10) {
        throw new BadRequestError('Apgar total score must be between 0 and 10.', 'INVALID_APGAR');
      }

      const assessment = tm.create(ApgarAssessment, {
        newbornId,
        admissionId: newborn.admissionId,
        assessmentMinute: input.assessmentMinute,
        assessedAt: input.assessedAt ? new Date(input.assessedAt) : new Date(),
        appearance: input.appearance,
        pulse: input.pulse,
        grimace: input.grimace,
        activity: input.activity,
        respiration: input.respiration,
        totalScore: calculatedTotal,
        assessedByUserId: actor.id,
        notes: input.notes || null,
        supersedesId: input.supersedesId || null,
        supersedeReason: input.supersedeReason || null,
      });

      const saved = await tm.save(assessment);

      // Audit Log
      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: input.supersedesId ? 'APGAR_CORRECTED' : 'APGAR_RECORDED',
          entityName: 'ApgarAssessment',
          entityId: saved.id,
          ipAddress,
          details: {
            requestId,
            newbornId,
            admissionId: newborn.admissionId,
            assessmentMinute: saved.assessmentMinute,
            totalScore: saved.totalScore,
            supersedesId: saved.supersedesId,
          },
        }),
      );

      // Outbox Notification
      await outboxService.recordEvent(tm, {
        eventType: NotificationType.APGAR_RECORDED,
        aggregateType: 'ApgarAssessment',
        aggregateId: saved.id,
        admissionId: newborn.admissionId,
        payload: {
          newbornId,
          newbornReferenceId: newborn.newbornReferenceId,
          assessmentMinute: saved.assessmentMinute,
          totalScore: saved.totalScore,
          assessedBy: actor.username,
        },
      });

      return saved;
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    const reloaded = await this.dataSource.getRepository(ApgarAssessment).findOneOrFail({
      where: { id: savedAssessment.id },
      relations: ['assessedByUser', 'assessedByUser.staffProfile'],
    });
    return toApgarAssessmentDto(reloaded);
  }

  async getApgarAssessmentsByNewbornId(newbornId: string): Promise<ApgarAssessmentDto[]> {
    const list = await this.dataSource.getRepository(ApgarAssessment).find({
      where: { newbornId },
      order: { assessedAt: 'ASC' },
      relations: ['assessedByUser', 'assessedByUser.staffProfile'],
    });

    return list.map(toApgarAssessmentDto);
  }

  // ==========================================================================
  // 4. POSTPARTUM MATERNAL CARE
  // ==========================================================================

  async createPostpartumMaternalAssessment(
    admissionId: string,
    input: CreatePostpartumMaternalAssessmentInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<PostpartumMaternalAssessmentDto> {
    const saved = await this.dataSource.transaction(async (tm) => {
      const admission = await tm.findOne(Admission, {
        where: { id: admissionId },
      });

      if (!admission) {
        throw new NotFoundError(
          `Admission not found with ID ${admissionId}`,
          'ADMISSION_NOT_FOUND',
        );
      }

      const assessment = tm.create(PostpartumMaternalAssessment, {
        admissionId,
        recordedByUserId: actor.id,
        assessmentTimestamp: input.assessmentTimestamp
          ? new Date(input.assessmentTimestamp)
          : new Date(),
        systolicBp: input.systolicBp ?? null,
        diastolicBp: input.diastolicBp ?? null,
        pulseRate: input.pulseRate ?? null,
        respiratoryRate: input.respiratoryRate ?? null,
        temperatureCelsius: input.temperatureCelsius ?? null,
        fundalHeightCm: input.fundalHeightCm ?? null,
        uterineTone: input.uterineTone ?? null,
        lochiaAmount: input.lochiaAmount ?? null,
        lochiaType: input.lochiaType ?? null,
        perinealWoundStatus: input.perinealWoundStatus || null,
        painScore: input.painScore ?? null,
        bladderStatus: input.bladderStatus || null,
        clinicalReviewStatus: input.clinicalReviewStatus || undefined,
        clinicalNotes: input.clinicalNotes || null,
      });

      const res = await tm.save(assessment);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'POSTPARTUM_ASSESSMENT_CREATED',
          entityName: 'PostpartumMaternalAssessment',
          entityId: res.id,
          ipAddress,
          details: {
            requestId,
            admissionId,
            clinicalReviewStatus: res.clinicalReviewStatus,
          },
        }),
      );

      await outboxService.recordEvent(tm, {
        eventType: NotificationType.POSTPARTUM_REVIEW_COMPLETED,
        aggregateType: 'PostpartumMaternalAssessment',
        aggregateId: res.id,
        admissionId,
        payload: {
          admissionId,
          assessmentTimestamp: res.assessmentTimestamp.toISOString(),
          clinicalReviewStatus: res.clinicalReviewStatus,
          priority:
            input.clinicalReviewStatus === 'ESCALATED'
              ? NotificationPriority.URGENT
              : NotificationPriority.ROUTINE,
          recordedBy: actor.username,
        },
      });

      return res;
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    const reloaded = await this.dataSource
      .getRepository(PostpartumMaternalAssessment)
      .findOneOrFail({
        where: { id: saved.id },
        relations: ['recordedByUser', 'recordedByUser.staffProfile'],
      });
    return toPostpartumMaternalAssessmentDto(reloaded);
  }

  async getPostpartumMaternalAssessments(
    admissionId: string,
  ): Promise<PostpartumMaternalAssessmentDto[]> {
    const list = await this.dataSource.getRepository(PostpartumMaternalAssessment).find({
      where: { admissionId },
      order: { assessmentTimestamp: 'DESC' },
      relations: ['recordedByUser', 'recordedByUser.staffProfile'],
    });

    return list.map(toPostpartumMaternalAssessmentDto);
  }

  // ==========================================================================
  // 5. POSTPARTUM NEWBORN CARE
  // ==========================================================================

  async createPostpartumNewbornAssessment(
    newbornId: string,
    input: CreatePostpartumNewbornAssessmentInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<PostpartumNewbornAssessmentDto> {
    const saved = await this.dataSource.transaction(async (tm) => {
      const newborn = await tm.findOne(Newborn, {
        where: { id: newbornId },
      });

      if (!newborn) {
        throw new NotFoundError(`Newborn not found with ID ${newbornId}`, 'NEWBORN_NOT_FOUND');
      }

      const assessment = tm.create(PostpartumNewbornAssessment, {
        newbornId,
        admissionId: newborn.admissionId,
        recordedByUserId: actor.id,
        assessmentTimestamp: input.assessmentTimestamp
          ? new Date(input.assessmentTimestamp)
          : new Date(),
        generalCondition: input.generalCondition,
        respiratoryRate: input.respiratoryRate ?? null,
        heartRate: input.heartRate ?? null,
        temperatureCelsius: input.temperatureCelsius ?? null,
        feedingStatus: input.feedingStatus,
        cordCondition: input.cordCondition,
        urinePassed: input.urinePassed ?? false,
        meconiumPassed: input.meconiumPassed ?? false,
        jaundiceStatus: input.jaundiceStatus || undefined,
        clinicalNotes: input.clinicalNotes || null,
      });

      const res = await tm.save(assessment);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'POSTPARTUM_ASSESSMENT_CREATED',
          entityName: 'PostpartumNewbornAssessment',
          entityId: res.id,
          ipAddress,
          details: {
            requestId,
            newbornId,
            admissionId: newborn.admissionId,
            generalCondition: res.generalCondition,
            feedingStatus: res.feedingStatus,
          },
        }),
      );

      return res;
    });

    const reloaded = await this.dataSource
      .getRepository(PostpartumNewbornAssessment)
      .findOneOrFail({
        where: { id: saved.id },
        relations: ['recordedByUser', 'recordedByUser.staffProfile'],
      });
    return toPostpartumNewbornAssessmentDto(reloaded);
  }

  async getPostpartumNewbornAssessments(
    newbornId: string,
  ): Promise<PostpartumNewbornAssessmentDto[]> {
    const list = await this.dataSource.getRepository(PostpartumNewbornAssessment).find({
      where: { newbornId },
      order: { assessmentTimestamp: 'DESC' },
      relations: ['recordedByUser', 'recordedByUser.staffProfile'],
    });

    return list.map(toPostpartumNewbornAssessmentDto);
  }

  // ==========================================================================
  // 6. CLINICIAN-AUTHORIZED DISCHARGE & BED RELEASE INTEGRATION
  // ==========================================================================

  async authorizeMaternalDischarge(
    admissionId: string,
    input: AuthorizeMaternalDischargeInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<PostpartumDischargeAuthorizationDto> {
    let releasedBed: Bed | null = null;
    const savedAuth = await this.dataSource.transaction(async (tm) => {
      const admission = await tm.findOne(Admission, {
        where: { id: admissionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!admission) {
        throw new NotFoundError(
          `Admission not found with ID ${admissionId}`,
          'ADMISSION_NOT_FOUND',
        );
      }

      if (admission.status === AdmissionStatus.DISCHARGED) {
        throw new ConflictError(
          'This maternal admission is already marked as DISCHARGED.',
          'ADMISSION_ALREADY_DISCHARGED',
        );
      }

      const now = input.dischargedAt ? new Date(input.dischargedAt) : new Date();

      // REQ-8.3: discharge always frees the bed for cleaning.
      let bedReleasedId: string | null = null;
      {
        const activeAllocation = await tm.findOne(BedAllocationHistory, {
          where: { admissionId, releasedAt: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });

        if (activeAllocation) {
          activeAllocation.releasedAt = now;
          activeAllocation.releasedByUserId = actor.id;
          activeAllocation.releaseReason = 'MATERNAL_DISCHARGE';
          await tm.save(activeAllocation);
          bedReleasedId = activeAllocation.id;

          const lockedBed = await tm.findOne(Bed, {
            where: { id: activeAllocation.bedId },
            lock: { mode: 'pessimistic_write' },
          });

          if (lockedBed) {
            lockedBed.occupancyStatus = BedOccupancyStatus.AVAILABLE;
            lockedBed.cleaningStatus = BedCleaningStatus.CLEANING_REQUIRED;
            lockedBed.updatedAt = now;
            await tm.save(lockedBed);
            releasedBed = lockedBed;
          }

          await tm.save(
            tm.create(AuditLog, {
              userId: actor.id,
              action: 'BED_RELEASED',
              entityName: 'BedAllocationHistory',
              entityId: activeAllocation.id,
              ipAddress,
              details: {
                requestId,
                admissionId,
                bedId: activeAllocation.bedId,
                bedNumber: activeAllocation.bed?.bedNumber,
                reason: 'MATERNAL_DISCHARGE',
              },
            }),
          );
        }
      }

      await changeCarePlanState(
        tm,
        admission,
        CarePlanState.DISCHARGED,
        actor.id,
        `Discharged to ${input.dischargeDestination}`,
        { ipAddress, requestId },
      );
      admission.status = AdmissionStatus.DISCHARGED;
      admission.dischargedAt = now;
      await tm.save(admission);

      const dischargeAuth = tm.create(PostpartumDischargeAuthorization, {
        admissionId,
        newbornId: null,
        dischargedEntityType: DischargedEntityType.MATERNAL,
        authorizedByDoctorId: actor.id,
        dischargedAt: now,
        dischargeDestination: input.dischargeDestination,
        maternalCondition: input.maternalCondition,
        newbornCondition: null,
        dischargeSummary: input.dischargeSummary,
        feedingPlan: null,
        followUpInstructions: input.followUpInstructions,
        bedReleasedId,
      });

      const saved = await tm.save(dischargeAuth);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'MATERNAL_DISCHARGE_AUTHORIZED',
          entityName: 'PostpartumDischargeAuthorization',
          entityId: saved.id,
          ipAddress,
          details: {
            requestId,
            admissionId,
            dischargedAt: now.toISOString(),
            dischargeDestination: input.dischargeDestination,
            bedReleasedId,
          },
        }),
      );

      await outboxService.recordEvent(tm, {
        eventType: NotificationType.MATERNAL_DISCHARGE_AUTHORIZED,
        aggregateType: 'PostpartumDischargeAuthorization',
        aggregateId: saved.id,
        admissionId,
        payload: {
          admissionId,
          dischargeDestination: input.dischargeDestination,
          authorizedBy: actor.username,
          dischargedAt: now.toISOString(),
        },
      });

      return saved;
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    // Assigned inside the transaction callback, which TypeScript cannot follow.
    const bed = releasedBed as Bed | null;
    if (bed) emitBedUpdated(bed.wardId, bed.id);
    const reloaded = await this.dataSource
      .getRepository(PostpartumDischargeAuthorization)
      .findOneOrFail({
        where: { id: savedAuth.id },
        relations: ['authorizedByDoctor', 'authorizedByDoctor.staffProfile'],
      });
    return toPostpartumDischargeAuthorizationDto(reloaded);
  }

  async authorizeNewbornDischarge(
    newbornId: string,
    input: AuthorizeNewbornDischargeInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<PostpartumDischargeAuthorizationDto> {
    if (actor.role !== UserRole.DOCTOR) {
      throw new ForbiddenError(
        'Newborn discharge must be clinically authorized by an attending DOCTOR / Paediatrician.',
        'DOCTOR_AUTHORIZATION_REQUIRED',
      );
    }

    const savedAuth = await this.dataSource.transaction(async (tm) => {
      const newborn = await tm.findOne(Newborn, {
        where: { id: newbornId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!newborn) {
        throw new NotFoundError(`Newborn not found with ID ${newbornId}`, 'NEWBORN_NOT_FOUND');
      }

      const now = input.dischargedAt ? new Date(input.dischargedAt) : new Date();

      newborn.dischargeStatus = input.dischargeStatus;
      newborn.dischargedAt = now;
      newborn.dischargedByUserId = actor.id;
      await tm.save(newborn);

      const dischargeAuth = tm.create(PostpartumDischargeAuthorization, {
        admissionId: newborn.admissionId,
        newbornId,
        dischargedEntityType: DischargedEntityType.NEWBORN,
        authorizedByDoctorId: actor.id,
        dischargedAt: now,
        dischargeDestination: input.dischargeDestination,
        maternalCondition: null,
        newbornCondition: input.newbornCondition,
        dischargeSummary: input.dischargeSummary,
        feedingPlan: input.feedingPlan || null,
        followUpInstructions: input.followUpInstructions,
        bedReleasedId: null,
      });

      const saved = await tm.save(dischargeAuth);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'NEWBORN_DISCHARGE_AUTHORIZED',
          entityName: 'PostpartumDischargeAuthorization',
          entityId: saved.id,
          ipAddress,
          details: {
            requestId,
            newbornId,
            admissionId: newborn.admissionId,
            dischargeStatus: input.dischargeStatus,
            dischargeDestination: input.dischargeDestination,
          },
        }),
      );

      await outboxService.recordEvent(tm, {
        eventType: NotificationType.NEWBORN_DISCHARGE_AUTHORIZED,
        aggregateType: 'PostpartumDischargeAuthorization',
        aggregateId: saved.id,
        admissionId: newborn.admissionId,
        payload: {
          newbornId,
          newbornReferenceId: newborn.newbornReferenceId,
          dischargeStatus: input.dischargeStatus,
          dischargeDestination: input.dischargeDestination,
          authorizedBy: actor.username,
        },
      });

      return saved;
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    const reloaded = await this.dataSource
      .getRepository(PostpartumDischargeAuthorization)
      .findOneOrFail({
        where: { id: savedAuth.id },
        relations: ['authorizedByDoctor', 'authorizedByDoctor.staffProfile'],
      });
    return toPostpartumDischargeAuthorizationDto(reloaded);
  }

  async getDischargeAuthorizations(
    admissionId: string,
  ): Promise<PostpartumDischargeAuthorizationDto[]> {
    const list = await this.dataSource.getRepository(PostpartumDischargeAuthorization).find({
      where: { admissionId },
      order: { dischargedAt: 'DESC' },
      relations: ['authorizedByDoctor', 'authorizedByDoctor.staffProfile'],
    });

    return list.map(toPostpartumDischargeAuthorizationDto);
  }
}

export const deliveryService = new DeliveryService();
