import { DataSource } from 'typeorm';
import {
  CarePlanLifecycleState,
  CarePlanReviewOutcome,
  ClinicalCarePlanDto,
  ClinicalCarePlanReviewDto,
  CreateCarePlanRequest,
  AmendCarePlanRequest,
  TransitionCarePlanRequest,
  RecordCarePlanReviewRequest,
  UserRole,
  NotificationType,
  NotificationPriority,
} from '@lrms/shared';
import { outboxService } from '../realtime/outbox.service.js';
import { notificationDispatcherService } from '../realtime/notification-dispatcher.service.js';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  AuditLog,
  ClinicalCarePlan,
  ClinicalCarePlanReview,
  ClinicalCarePlanVersion,
} from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../common/errors/auth.errors.js';
import { toCarePlanDto, toCarePlanReviewDto } from './clinical-care.dto.js';

export class ClinicalCarePlanService {
  constructor(private dataSource: DataSource = AppDataSource) {}

  private async generateCarePlanReferenceId(_admissionId: string): Promise<string> {
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await this.dataSource.getRepository(ClinicalCarePlan).count();
    const seq = String(count + 1).padStart(4, '0');
    return `CP-${yearMonth}-${seq}`;
  }

  async createCarePlan(
    admissionId: string,
    payload: CreateCarePlanRequest,
    actor: RequestUser,
  ): Promise<ClinicalCarePlanDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const admission = await manager.findOne(Admission, {
        where: { id: admissionId },
      });
      if (!admission) {
        throw new NotFoundError('Admission episode not found');
      }

      const referenceId = await this.generateCarePlanReferenceId(admissionId);
      const initialState = payload.submitForApproval
        ? CarePlanLifecycleState.PENDING_APPROVAL
        : CarePlanLifecycleState.DRAFT;

      const carePlan = manager.create(ClinicalCarePlan, {
        admissionId,
        carePlanReferenceId: referenceId,
        currentState: initialState,
        currentVersionNumber: 1,
        createdByUserId: actor.id,
        responsibleDoctorId: payload.responsibleDoctorId || null,
        plannedReviewAt: payload.plannedReviewAt ? new Date(payload.plannedReviewAt) : null,
      });

      const savedPlan = await manager.save(ClinicalCarePlan, carePlan);

      const version = manager.create(ClinicalCarePlanVersion, {
        carePlanId: savedPlan.id,
        versionNumber: 1,
        title: payload.title,
        assessmentSummary: payload.assessmentSummary,
        clinicalConcerns: payload.clinicalConcerns || null,
        objectives: payload.objectives,
        plannedActions: payload.plannedActions,
        assignedStaffRoles: payload.assignedStaffRoles || null,
        createdByUserId: actor.id,
        changeReason: 'Initial care plan creation',
      });

      await manager.save(ClinicalCarePlanVersion, version);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: payload.submitForApproval
            ? 'CLINICAL_CARE_PLAN_SUBMITTED'
            : 'CLINICAL_CARE_PLAN_CREATED',
          entityName: 'ClinicalCarePlan',
          entityId: savedPlan.id,
          details: {
            admissionId,
            referenceId,
            initialState,
            versionNumber: 1,
          },
        }),
      );

      // If submitted for approval, emit outbox event
      if (payload.submitForApproval) {
        await outboxService.recordEvent(manager, {
          eventType: NotificationType.CARE_PLAN_APPROVAL_REQUIRED,
          aggregateType: 'ClinicalCarePlan',
          aggregateId: savedPlan.id,
          admissionId,
          payload: {
            referenceId,
            priority: NotificationPriority.ROUTINE,
            responsibleDoctorId: payload.responsibleDoctorId || null,
            initiatedByUserId: actor.id,
            safeMessage: 'Care plan submitted for approval',
          },
        });
      }

      const fullPlan = await manager.findOneOrFail(ClinicalCarePlan, {
        where: { id: savedPlan.id },
        relations: [
          'createdByUser',
          'responsibleDoctor',
          'approvedByUser',
          'versions',
          'versions.createdByUser',
          'reviews',
          'reviews.reviewedByUser',
        ],
      });

      return toCarePlanDto(fullPlan);
    });

    if (payload.submitForApproval) {
      notificationDispatcherService.dispatchNow().catch(() => {});
    }
    return result;
  }

  async getCarePlans(admissionId: string): Promise<ClinicalCarePlanDto[]> {
    const plans = await this.dataSource.getRepository(ClinicalCarePlan).find({
      where: { admissionId },
      relations: [
        'createdByUser',
        'responsibleDoctor',
        'approvedByUser',
        'versions',
        'versions.createdByUser',
        'reviews',
        'reviews.reviewedByUser',
      ],
      order: { createdAt: 'DESC' },
    });

    return plans.map(toCarePlanDto);
  }

  async getActiveCarePlan(admissionId: string): Promise<ClinicalCarePlanDto | null> {
    const plan = await this.dataSource.getRepository(ClinicalCarePlan).findOne({
      where: [
        { admissionId, currentState: CarePlanLifecycleState.ACTIVE },
        { admissionId, currentState: CarePlanLifecycleState.REVIEW_REQUIRED },
      ],
      relations: [
        'createdByUser',
        'responsibleDoctor',
        'approvedByUser',
        'versions',
        'versions.createdByUser',
        'reviews',
        'reviews.reviewedByUser',
      ],
      order: { createdAt: 'DESC' },
    });

    return plan ? toCarePlanDto(plan) : null;
  }

  async getCarePlanById(carePlanId: string, admissionId: string): Promise<ClinicalCarePlanDto> {
    const plan = await this.dataSource.getRepository(ClinicalCarePlan).findOne({
      where: { id: carePlanId, admissionId },
      relations: [
        'createdByUser',
        'responsibleDoctor',
        'approvedByUser',
        'versions',
        'versions.createdByUser',
        'reviews',
        'reviews.reviewedByUser',
      ],
    });

    if (!plan) {
      throw new NotFoundError('Clinical care plan not found');
    }

    return toCarePlanDto(plan);
  }

  async transitionCarePlan(
    carePlanId: string,
    admissionId: string,
    payload: TransitionCarePlanRequest,
    actor: RequestUser,
  ): Promise<ClinicalCarePlanDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      // Row lock to prevent race conditions
      const plan = await manager
        .createQueryBuilder(ClinicalCarePlan, 'plan')
        .setLock('pessimistic_write')
        .where('plan.id = :id AND plan.admission_id = :admissionId', {
          id: carePlanId,
          admissionId,
        })
        .getOne();

      if (!plan) {
        throw new NotFoundError('Clinical care plan not found');
      }

      const current = plan.currentState;
      const target = payload.targetState;

      // Validate permitted state machine transitions
      const validTransitions: Record<CarePlanLifecycleState, CarePlanLifecycleState[]> = {
        [CarePlanLifecycleState.DRAFT]: [
          CarePlanLifecycleState.PENDING_APPROVAL,
          CarePlanLifecycleState.CANCELLED,
        ],
        [CarePlanLifecycleState.PENDING_APPROVAL]: [
          CarePlanLifecycleState.ACTIVE,
          CarePlanLifecycleState.DRAFT,
          CarePlanLifecycleState.CANCELLED,
        ],
        [CarePlanLifecycleState.ACTIVE]: [
          CarePlanLifecycleState.REVIEW_REQUIRED,
          CarePlanLifecycleState.ON_HOLD,
          CarePlanLifecycleState.COMPLETED,
          CarePlanLifecycleState.CANCELLED,
        ],
        [CarePlanLifecycleState.REVIEW_REQUIRED]: [
          CarePlanLifecycleState.ACTIVE,
          CarePlanLifecycleState.ON_HOLD,
          CarePlanLifecycleState.CANCELLED,
        ],
        [CarePlanLifecycleState.ON_HOLD]: [
          CarePlanLifecycleState.ACTIVE,
          CarePlanLifecycleState.COMPLETED,
          CarePlanLifecycleState.CANCELLED,
        ],
        [CarePlanLifecycleState.COMPLETED]: [],
        [CarePlanLifecycleState.CANCELLED]: [],
      };

      if (!validTransitions[current]?.includes(target)) {
        throw new ConflictError(
          `Invalid care plan transition from '${current}' to '${target}'`,
          'CARE_PLAN_STATE_CONFLICT',
        );
      }

      // Separation of duties: Doctor required to approve into ACTIVE
      if (target === CarePlanLifecycleState.ACTIVE) {
        if (actor.role !== UserRole.DOCTOR) {
          throw new ForbiddenError(
            'Only qualified medical doctors can approve a care plan into ACTIVE status',
            'ROLE_NOT_AUTHORIZED',
          );
        }
        plan.approvedByUserId = actor.id;
        plan.approvedAt = new Date();
      }

      plan.currentState = target;
      await manager.save(ClinicalCarePlan, plan);

      // Audit Log
      const auditAction =
        target === CarePlanLifecycleState.ACTIVE
          ? 'CLINICAL_CARE_PLAN_APPROVED'
          : 'CLINICAL_CARE_PLAN_STATE_CHANGED';

      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: auditAction,
          entityName: 'ClinicalCarePlan',
          entityId: plan.id,
          details: {
            admissionId,
            carePlanReferenceId: plan.carePlanReferenceId,
            previousState: current,
            newState: target,
            reason: payload.reason || null,
          },
        }),
      );

      // Outbox Event
      if (target === CarePlanLifecycleState.ACTIVE) {
        await outboxService.recordEvent(manager, {
          eventType: NotificationType.CARE_PLAN_APPROVED,
          aggregateType: 'ClinicalCarePlan',
          aggregateId: plan.id,
          admissionId,
          payload: {
            referenceId: plan.carePlanReferenceId,
            priority: NotificationPriority.ROUTINE,
            approvedByUserId: actor.id,
            safeMessage: 'Care plan approved and active',
          },
        });
      } else if (target === CarePlanLifecycleState.PENDING_APPROVAL) {
        await outboxService.recordEvent(manager, {
          eventType: NotificationType.CARE_PLAN_APPROVAL_REQUIRED,
          aggregateType: 'ClinicalCarePlan',
          aggregateId: plan.id,
          admissionId,
          payload: {
            referenceId: plan.carePlanReferenceId,
            priority: NotificationPriority.ROUTINE,
            reason: payload.reason || 'Care plan submitted for approval',
            initiatedByUserId: actor.id,
          },
        });
      }

      const fullPlan = await manager.findOneOrFail(ClinicalCarePlan, {
        where: { id: plan.id },
        relations: [
          'createdByUser',
          'responsibleDoctor',
          'approvedByUser',
          'versions',
          'versions.createdByUser',
          'reviews',
          'reviews.reviewedByUser',
        ],
      });

      return toCarePlanDto(fullPlan);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  async amendCarePlan(
    carePlanId: string,
    admissionId: string,
    payload: AmendCarePlanRequest,
    actor: RequestUser,
  ): Promise<ClinicalCarePlanDto> {
    return this.dataSource.transaction(async (manager) => {
      const plan = await manager
        .createQueryBuilder(ClinicalCarePlan, 'plan')
        .setLock('pessimistic_write')
        .where('plan.id = :id AND plan.admission_id = :admissionId', {
          id: carePlanId,
          admissionId,
        })
        .getOne();

      if (!plan) {
        throw new NotFoundError('Clinical care plan not found');
      }

      if (
        plan.currentState !== CarePlanLifecycleState.ACTIVE &&
        plan.currentState !== CarePlanLifecycleState.REVIEW_REQUIRED
      ) {
        throw new ConflictError(
          `Cannot amend care plan in '${plan.currentState}' status. Plan must be ACTIVE or REVIEW_REQUIRED.`,
          'CARE_PLAN_STATE_CONFLICT',
        );
      }

      const nextVersionNumber = plan.currentVersionNumber + 1;

      const newVersion = manager.create(ClinicalCarePlanVersion, {
        carePlanId: plan.id,
        versionNumber: nextVersionNumber,
        title: payload.title,
        assessmentSummary: payload.assessmentSummary,
        clinicalConcerns: payload.clinicalConcerns || null,
        objectives: payload.objectives,
        plannedActions: payload.plannedActions,
        assignedStaffRoles: payload.assignedStaffRoles || null,
        createdByUserId: actor.id,
        changeReason: payload.changeReason,
      });

      await manager.save(ClinicalCarePlanVersion, newVersion);

      plan.currentVersionNumber = nextVersionNumber;
      if (payload.plannedReviewAt) {
        plan.plannedReviewAt = new Date(payload.plannedReviewAt);
      }
      await manager.save(ClinicalCarePlan, plan);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'CLINICAL_CARE_PLAN_AMENDED',
          entityName: 'ClinicalCarePlan',
          entityId: plan.id,
          details: {
            admissionId,
            carePlanReferenceId: plan.carePlanReferenceId,
            previousVersion: plan.currentVersionNumber - 1,
            newVersion: nextVersionNumber,
            changeReason: payload.changeReason,
          },
        }),
      );

      const fullPlan = await manager.findOneOrFail(ClinicalCarePlan, {
        where: { id: plan.id },
        relations: [
          'createdByUser',
          'responsibleDoctor',
          'approvedByUser',
          'versions',
          'versions.createdByUser',
          'reviews',
          'reviews.reviewedByUser',
        ],
      });

      return toCarePlanDto(fullPlan);
    });
  }

  async recordReview(
    carePlanId: string,
    admissionId: string,
    payload: RecordCarePlanReviewRequest,
    actor: RequestUser,
  ): Promise<ClinicalCarePlanReviewDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const plan = await manager
        .createQueryBuilder(ClinicalCarePlan, 'plan')
        .setLock('pessimistic_write')
        .where('plan.id = :id AND plan.admission_id = :admissionId', {
          id: carePlanId,
          admissionId,
        })
        .getOne();

      if (!plan) {
        throw new NotFoundError('Clinical care plan not found');
      }

      const review = manager.create(ClinicalCarePlanReview, {
        carePlanId: plan.id,
        reviewedByUserId: actor.id,
        reviewOutcome: payload.reviewOutcome,
        reviewNotes: payload.reviewNotes,
        nextReviewAt: payload.nextReviewAt ? new Date(payload.nextReviewAt) : null,
        reviewedVersionNumber: plan.currentVersionNumber,
      });

      const savedReview = await manager.save(ClinicalCarePlanReview, review);

      plan.lastReviewedAt = new Date();
      if (payload.nextReviewAt) {
        plan.plannedReviewAt = new Date(payload.nextReviewAt);
      }

      // If review outcome requires modification or escalation, flag state
      if (
        payload.reviewOutcome === CarePlanReviewOutcome.MODIFICATION_REQUIRED ||
        payload.reviewOutcome === CarePlanReviewOutcome.ESCALATION_REQUIRED
      ) {
        if (plan.currentState === CarePlanLifecycleState.ACTIVE) {
          plan.currentState = CarePlanLifecycleState.REVIEW_REQUIRED;
        }
      } else if (
        payload.reviewOutcome === CarePlanReviewOutcome.APPROPRIATE_CONTINUE &&
        plan.currentState === CarePlanLifecycleState.REVIEW_REQUIRED
      ) {
        plan.currentState = CarePlanLifecycleState.ACTIVE;
      }

      await manager.save(ClinicalCarePlan, plan);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'CLINICAL_CARE_PLAN_REVIEWED',
          entityName: 'ClinicalCarePlanReview',
          entityId: savedReview.id,
          details: {
            carePlanId: plan.id,
            admissionId,
            reviewOutcome: payload.reviewOutcome,
            reviewedVersionNumber: plan.currentVersionNumber,
          },
        }),
      );

      // Outbox Event
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.CARE_PLAN_REVIEW_DUE,
        aggregateType: 'ClinicalCarePlan',
        aggregateId: plan.id,
        admissionId,
        payload: {
          referenceId: plan.carePlanReferenceId,
          priority:
            payload.reviewOutcome === CarePlanReviewOutcome.ESCALATION_REQUIRED
              ? NotificationPriority.URGENT
              : NotificationPriority.ROUTINE,
          reviewOutcome: payload.reviewOutcome,
          reviewedByUserId: actor.id,
          nextReviewAt: payload.nextReviewAt || null,
        },
      });

      const fullReview = await manager.findOneOrFail(ClinicalCarePlanReview, {
        where: { id: savedReview.id },
        relations: ['reviewedByUser'],
      });

      return toCarePlanReviewDto(fullReview);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  async getReviews(carePlanId: string, admissionId: string): Promise<ClinicalCarePlanReviewDto[]> {
    const reviews = await this.dataSource.getRepository(ClinicalCarePlanReview).find({
      where: { carePlanId, carePlan: { admissionId } },
      relations: ['reviewedByUser'],
      order: { createdAt: 'DESC' },
    });

    return reviews.map(toCarePlanReviewDto);
  }
}
