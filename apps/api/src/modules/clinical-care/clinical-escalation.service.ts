import { DataSource, EntityManager, IsNull } from 'typeorm';
import {
  ClinicalEscalationDto,
  EscalationFeedItemDto,
  CreateEscalationRequest,
  AcknowledgeEscalationRequest,
  AssignEscalationRequest,
  TransitionEscalationRequest,
  ResolveEscalationRequest,
  ReverseEscalationRequest,
  AlreadyEscalatedDetails,
  AdmissionStatus,
  CarePlanState,
  EscalationCategory,
  EscalationPriority,
  EscalationReason,
  EscalationStatus,
  ClinicalObservationType,
  NotificationType,
  NotificationPriority,
  AlertStateChange,
  UserRole,
} from '@lrms/shared';
import { escalationAlertService } from './escalation-alert.service.js';
import { patientAuthorizationService } from '../admissions/patient-authorization.service.js';
import { outboxService } from '../realtime/outbox.service.js';
import { notificationDispatcherService } from '../realtime/notification-dispatcher.service.js';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  AuditLog,
  BedAllocationHistory,
  CarePlanTransition,
  ClinicalEscalation,
  ClinicalEscalationHistory,
  User,
  MaternalObservation,
  FetalObservation,
  LabourAssessment,
  ContractionObservation,
} from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from '../../common/errors/auth.errors.js';
import { toAlertReceiptState, toEscalationDto } from './clinical-care.dto.js';
import { applyAdmissionVisibilityScope } from '../admissions/patient-authorization.service.js';
import { changeCarePlanState } from '../admissions/care-plan-state.service.js';

const REASON_CATEGORY: Record<EscalationReason, EscalationCategory> = {
  [EscalationReason.FETAL_DISTRESS]: EscalationCategory.FETAL,
  [EscalationReason.FAILURE_TO_PROGRESS]: EscalationCategory.LABOUR_PROGRESSION,
  [EscalationReason.MATERNAL_COMPLICATION]: EscalationCategory.MATERNAL,
  [EscalationReason.OTHER]: EscalationCategory.OBSTETRIC_EMERGENCY,
};

const REASON_LABEL: Record<EscalationReason, string> = {
  [EscalationReason.FETAL_DISTRESS]: 'Fetal distress',
  [EscalationReason.FAILURE_TO_PROGRESS]: 'Failure to progress',
  [EscalationReason.MATERNAL_COMPLICATION]: 'Maternal complication',
  [EscalationReason.OTHER]: 'Other',
};

const ALLOWED_ESCALATION_TRANSITIONS: Record<EscalationStatus, EscalationStatus[]> = {
  [EscalationStatus.OPEN]: [EscalationStatus.ACKNOWLEDGED, EscalationStatus.CANCELLED],
  [EscalationStatus.ACKNOWLEDGED]: [
    EscalationStatus.UNDER_REVIEW,
    EscalationStatus.ACTION_IN_PROGRESS,
    EscalationStatus.ESCALATED,
    EscalationStatus.CANCELLED,
  ],
  [EscalationStatus.UNDER_REVIEW]: [
    EscalationStatus.ACTION_IN_PROGRESS,
    EscalationStatus.ESCALATED,
    EscalationStatus.RESOLVED,
    EscalationStatus.CANCELLED,
  ],
  [EscalationStatus.ACTION_IN_PROGRESS]: [
    EscalationStatus.RESOLVED,
    EscalationStatus.ESCALATED,
    EscalationStatus.CANCELLED,
  ],
  [EscalationStatus.ESCALATED]: [
    EscalationStatus.ACTION_IN_PROGRESS,
    EscalationStatus.UNDER_REVIEW,
    EscalationStatus.RESOLVED,
    EscalationStatus.CANCELLED,
  ],
  [EscalationStatus.RESOLVED]: [EscalationStatus.CLOSED],
  [EscalationStatus.CLOSED]: [],
  [EscalationStatus.CANCELLED]: [],
};

export class ClinicalEscalationService {
  constructor(private dataSource: DataSource = AppDataSource) {}

  private async generateEscalationReferenceId(): Promise<string> {
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await this.dataSource.getRepository(ClinicalEscalation).count();
    const seq = String(count + 1).padStart(4, '0');
    return `ESC-${yearMonth}-${seq}`;
  }

  async createEscalation(
    admissionId: string,
    payload: CreateEscalationRequest,
    actor: RequestUser,
  ): Promise<ClinicalEscalationDto> {
    const category = payload.category ?? REASON_CATEGORY[payload.reason];
    const priority = payload.priority ?? EscalationPriority.EMERGENCY;
    const clinicalReason = payload.clinicalReason?.trim() || REASON_LABEL[payload.reason];

    // REQ-6.4: plan change, reason, user, time and alert are written in one transaction.
    const result = await this.dataSource.transaction(async (manager) => {
      const admission = await manager.findOne(Admission, {
        where: { id: admissionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!admission) {
        throw new NotFoundError('Admission episode not found');
      }
      if (admission.status !== AdmissionStatus.ADMITTED) {
        throw new ConflictError('Only an active admission can be escalated', 'ADMISSION_NOT_ACTIVE');
      }
      if (admission.currentCarePlan === CarePlanState.EMERGENCY_CESAREAN) {
        throw await this.alreadyEscalatedError(manager, admission.id);
      }
      if (
        admission.currentCarePlan === CarePlanState.DELIVERED ||
        admission.currentCarePlan === CarePlanState.DISCHARGED
      ) {
        throw new ConflictError(
          `Cannot escalate an admission whose care plan is ${admission.currentCarePlan}`,
          'CARE_PLAN_NOT_ESCALATABLE',
        );
      }

      let recipientUserId: string | null = null;
      if (payload.assignedRecipientUserId) {
        const recipient = await manager.findOne(User, {
          where: { id: payload.assignedRecipientUserId },
          relations: ['role'],
        });
        if (!recipient) {
          throw new NotFoundError('Assigned recipient user not found');
        }
        if (!recipient.isActive || recipient.role?.name !== UserRole.DOCTOR) {
          throw new BadRequestError('Escalation alerts can only be sent to an active doctor');
        }
        recipientUserId = recipient.id;
      } else {
        recipientUserId = await escalationAlertService.resolveRecipient(manager, admission);
      }

      // Verify observation link if provided
      if (payload.sourceObservationId && payload.sourceObservationType) {
        let obsExists = false;
        switch (payload.sourceObservationType) {
          case ClinicalObservationType.MATERNAL:
            obsExists = !!(await manager.findOne(MaternalObservation, {
              where: { id: payload.sourceObservationId, admissionId },
            }));
            break;
          case ClinicalObservationType.FETAL:
            obsExists = !!(await manager.findOne(FetalObservation, {
              where: { id: payload.sourceObservationId, admissionId },
            }));
            break;
          case ClinicalObservationType.LABOUR_ASSESSMENT:
            obsExists = !!(await manager.findOne(LabourAssessment, {
              where: { id: payload.sourceObservationId, admissionId },
            }));
            break;
          case ClinicalObservationType.CONTRACTION:
            obsExists = !!(await manager.findOne(ContractionObservation, {
              where: { id: payload.sourceObservationId, admissionId },
            }));
            break;
          default:
            obsExists = true;
            break;
        }
        if (!obsExists) {
          throw new NotFoundError('Source clinical observation not found for this admission');
        }
      }

      const referenceId = await this.generateEscalationReferenceId();

      const transition = await changeCarePlanState(
        manager,
        admission,
        CarePlanState.EMERGENCY_CESAREAN,
        actor.id,
        `Escalated: ${REASON_LABEL[payload.reason]}`,
        { isEmergency: true },
      );

      const escalation = manager.create(ClinicalEscalation, {
        admissionId,
        escalationReferenceId: referenceId,
        category,
        priority,
        status: EscalationStatus.OPEN,
        reasonCode: payload.reason,
        carePlanTransitionId: transition.id,
        clinicalReason,
        sourceObservationType: payload.sourceObservationType || null,
        sourceObservationId: payload.sourceObservationId || null,
        initiatedByUserId: actor.id,
        assignedRecipientUserId: recipientUserId,
      });

      // dispatched_at is filled by the database default inside this transaction (REQ-7.1).
      const savedEscalation = await manager.save(ClinicalEscalation, escalation);

      // Save initial history record
      const history = manager.create(ClinicalEscalationHistory, {
        escalationId: savedEscalation.id,
        fromStatus: EscalationStatus.OPEN,
        toStatus: EscalationStatus.OPEN,
        changedByUserId: actor.id,
        newAssignedUserId: recipientUserId,
        reason: 'Initial escalation creation',
      });
      await manager.save(ClinicalEscalationHistory, history);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'CLINICAL_ESCALATION_CREATED',
          entityName: 'ClinicalEscalation',
          entityId: savedEscalation.id,
          details: {
            admissionId,
            referenceId,
            reason: payload.reason,
            category,
            priority,
            carePlanTransitionId: transition.id,
            sourceObservationType: payload.sourceObservationType,
            sourceObservationId: payload.sourceObservationId,
          },
        }),
      );

      // Outbox Event for real-time notification
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.CLINICAL_ESCALATION_CREATED,
        aggregateType: 'ClinicalEscalation',
        aggregateId: savedEscalation.id,
        admissionId,
        payload: {
          category,
          priority: priority as unknown as NotificationPriority,
          referenceId,
          clinicalReason,
          assignedRecipientUserId: recipientUserId,
          initiatedByUserId: actor.id,
          sourceObservationType: payload.sourceObservationType || null,
          sourceObservationId: payload.sourceObservationId || null,
        },
      });

      return this.getEscalationById(savedEscalation.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  async getEscalations(admissionId: string): Promise<ClinicalEscalationDto[]> {
    const escalations = await this.dataSource.getRepository(ClinicalEscalation).find({
      where: { admissionId },
      relations: [
        'initiatedByUser',
        'assignedRecipientUser',
        'acknowledgedByUser',
        'resolvedByUser',
        'history',
        'history.changedByUser',
      ],
      order: {
        createdAt: 'DESC',
        history: {
          createdAt: 'ASC',
        },
      },
    });

    return escalationAlertService.attachRecipientContact(escalations.map(toEscalationDto));
  }

  async listVisibleEscalations(actor: RequestUser, limit = 100): Promise<EscalationFeedItemDto[]> {
    const visibleAdmissions = this.dataSource
      .getRepository(Admission)
      .createQueryBuilder('admission')
      .select('admission.id');
    applyAdmissionVisibilityScope(visibleAdmissions, actor, 'admission');

    const escalations = await this.dataSource
      .getRepository(ClinicalEscalation)
      .createQueryBuilder('escalation')
      .innerJoinAndSelect('escalation.admission', 'admission')
      .leftJoinAndSelect('escalation.initiatedByUser', 'initiatedByUser')
      .leftJoinAndSelect('escalation.assignedRecipientUser', 'assignedRecipientUser')
      .leftJoinAndSelect('escalation.acknowledgedByUser', 'acknowledgedByUser')
      .where(`escalation.admissionId IN (${visibleAdmissions.getQuery()})`)
      .setParameters(visibleAdmissions.getParameters())
      .orderBy('escalation.createdAt', 'DESC')
      .take(limit)
      .getMany();

    const admissionIds = [...new Set(escalations.map((e) => e.admissionId))];
    const bedByAdmission = new Map<string, string>();
    if (admissionIds.length > 0) {
      const allocations = await this.dataSource
        .getRepository(BedAllocationHistory)
        .createQueryBuilder('alloc')
        .innerJoinAndSelect('alloc.bed', 'bed')
        .where('alloc.admissionId IN (:...admissionIds)', { admissionIds })
        .andWhere('alloc.releasedAt IS NULL')
        .getMany();
      for (const a of allocations) bedByAdmission.set(a.admissionId, a.bed.bedNumber);
    }

    return escalationAlertService.attachRecipientContact(
      escalations.map((e) => ({
        ...toEscalationDto(e),
        admissionReferenceId: e.admission.admissionReferenceId,
        bedNumber: bedByAdmission.get(e.admissionId) ?? null,
      })),
    );
  }

  async getEscalationById(
    escalationId: string,
    manager = this.dataSource.manager,
    admissionId?: string,
  ): Promise<ClinicalEscalationDto> {
    const escalation = await manager.findOne(ClinicalEscalation, {
      where: admissionId ? { id: escalationId, admissionId } : { id: escalationId },
      relations: [
        'initiatedByUser',
        'assignedRecipientUser',
        'acknowledgedByUser',
        'resolvedByUser',
        'history',
        'history.changedByUser',
      ],
      order: {
        history: {
          createdAt: 'ASC',
        },
      },
    });

    if (!escalation) {
      throw new NotFoundError('Clinical escalation not found');
    }

    const [dto] = await escalationAlertService.attachRecipientContact([toEscalationDto(escalation)]);
    return dto;
  }

  async acknowledgeEscalation(
    admissionId: string,
    escalationId: string,
    payload: AcknowledgeEscalationRequest,
    actor: RequestUser,
  ): Promise<ClinicalEscalationDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const escalation = await manager.findOne(ClinicalEscalation, {
        where: { id: escalationId, admissionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!escalation) {
        throw new NotFoundError('Clinical escalation not found');
      }

      // Acknowledgement is the doctor's proof of receipt, so only the alerted doctor may give it.
      // With no recipient, any doctor with access to the patient may acknowledge.
      if (escalation.assignedRecipientUserId) {
        if (escalation.assignedRecipientUserId !== actor.id) {
          throw new ForbiddenError(
            'Only the doctor this alert was sent to can acknowledge it',
            'ALERT_ACK_NOT_RECIPIENT',
          );
        }
      } else {
        if (actor.role !== UserRole.DOCTOR) {
          throw new ForbiddenError('Only a doctor can acknowledge this alert', 'ALERT_ACK_DENIED');
        }
        await patientAuthorizationService.assertCanAccessAdmission(
          actor,
          admissionId,
          null,
          null,
          'ALERT_ACKNOWLEDGE',
          manager,
        );
      }

      if (escalation.status !== EscalationStatus.OPEN) {
        throw new ConflictError(
          `Cannot acknowledge escalation in '${escalation.status}' state (only OPEN escalations can be acknowledged)`,
        );
      }

      const previousStatus = escalation.status;
      // Database clock keeps the receipt times consistent with dispatched_at.
      await manager.query(
        `UPDATE "clinical_escalations"
            SET "status" = $2, "acknowledged_at" = now(), "acknowledged_by_user_id" = $3,
                "delivered_at" = COALESCE("delivered_at", now()), "updated_at" = now()
          WHERE "id" = $1`,
        [escalation.id, EscalationStatus.ACKNOWLEDGED, actor.id],
      );

      // Save history record
      const history = manager.create(ClinicalEscalationHistory, {
        escalationId: escalation.id,
        fromStatus: previousStatus,
        toStatus: EscalationStatus.ACKNOWLEDGED,
        changedByUserId: actor.id,
        notes: payload.notes || 'Escalation acknowledged by clinician',
      });
      await manager.save(ClinicalEscalationHistory, history);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'CLINICAL_ESCALATION_ACKNOWLEDGED',
          entityName: 'ClinicalEscalation',
          entityId: escalation.id,
          details: {
            escalationReferenceId: escalation.escalationReferenceId,
            admissionId: escalation.admissionId,
          },
        }),
      );

      // Outbox Event
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.CLINICAL_ESCALATION_ACKNOWLEDGED,
        aggregateType: 'ClinicalEscalation',
        aggregateId: escalation.id,
        admissionId: escalation.admissionId,
        payload: {
          referenceId: escalation.escalationReferenceId,
          category: escalation.category,
          priority: NotificationPriority.ROUTINE,
          reason: payload.notes || 'Escalation acknowledged by clinician',
          acknowledgedByUserId: actor.id,
        },
      });

      return this.getEscalationById(escalation.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    await escalationAlertService.emitState(escalationId, AlertStateChange.ACKNOWLEDGED);
    return result;
  }

  async assignEscalation(
    admissionId: string,
    escalationId: string,
    payload: AssignEscalationRequest,
    actor: RequestUser,
  ): Promise<ClinicalEscalationDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const escalation = await manager.findOne(ClinicalEscalation, {
        where: { id: escalationId, admissionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!escalation) {
        throw new NotFoundError('Clinical escalation not found');
      }

      if (
        escalation.status === EscalationStatus.CLOSED ||
        escalation.status === EscalationStatus.CANCELLED
      ) {
        throw new ConflictError(
          `Cannot reassign an escalation in terminal state '${escalation.status}'`,
        );
      }

      const newRecipient = await manager.findOne(User, {
        where: { id: payload.assignedRecipientUserId },
        relations: ['role'],
      });
      if (!newRecipient) {
        throw new NotFoundError('Assigned recipient user not found');
      }
      if (!newRecipient.isActive || newRecipient.role?.name !== UserRole.DOCTOR) {
        throw new BadRequestError('Escalation alerts can only be sent to an active doctor');
      }

      const previousAssignedUserId = escalation.assignedRecipientUserId;
      escalation.assignedRecipientUserId = payload.assignedRecipientUserId;

      await manager.save(ClinicalEscalation, escalation);

      // Save history record
      const history = manager.create(ClinicalEscalationHistory, {
        escalationId: escalation.id,
        fromStatus: escalation.status,
        toStatus: escalation.status,
        changedByUserId: actor.id,
        previousAssignedUserId,
        newAssignedUserId: payload.assignedRecipientUserId,
        reason: payload.reason,
      });
      await manager.save(ClinicalEscalationHistory, history);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'CLINICAL_ESCALATION_ASSIGNED',
          entityName: 'ClinicalEscalation',
          entityId: escalation.id,
          details: {
            escalationReferenceId: escalation.escalationReferenceId,
            previousAssignedUserId,
            newAssignedUserId: payload.assignedRecipientUserId,
            reason: payload.reason,
          },
        }),
      );

      // Outbox Event
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.CLINICAL_ESCALATION_ASSIGNED,
        aggregateType: 'ClinicalEscalation',
        aggregateId: escalation.id,
        admissionId: escalation.admissionId,
        payload: {
          referenceId: escalation.escalationReferenceId,
          category: escalation.category,
          priority: NotificationPriority.ROUTINE,
          assignedRecipientUserId: payload.assignedRecipientUserId,
          previousAssignedUserId,
          reason: payload.reason,
          initiatedByUserId: actor.id,
        },
      });

      return this.getEscalationById(escalation.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  async transitionEscalation(
    admissionId: string,
    escalationId: string,
    payload: TransitionEscalationRequest,
    actor: RequestUser,
  ): Promise<ClinicalEscalationDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const escalation = await manager.findOne(ClinicalEscalation, {
        where: { id: escalationId, admissionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!escalation) {
        throw new NotFoundError('Clinical escalation not found');
      }

      if (payload.targetStatus === EscalationStatus.ACKNOWLEDGED) {
        throw new BadRequestError(
          'Use the acknowledge action; only the alerted doctor can acknowledge an escalation',
        );
      }

      const allowedTransitions = ALLOWED_ESCALATION_TRANSITIONS[escalation.status] || [];
      if (!allowedTransitions.includes(payload.targetStatus)) {
        throw new BadRequestError(
          `Invalid state transition: Cannot transition escalation from '${escalation.status}' to '${payload.targetStatus}'`,
        );
      }

      const previousStatus = escalation.status;
      escalation.status = payload.targetStatus;

      if (payload.targetStatus === EscalationStatus.UNDER_REVIEW && !escalation.assessmentAt) {
        escalation.assessmentAt = new Date();
      }

      await manager.save(ClinicalEscalation, escalation);

      // Save history record
      const history = manager.create(ClinicalEscalationHistory, {
        escalationId: escalation.id,
        fromStatus: previousStatus,
        toStatus: payload.targetStatus,
        changedByUserId: actor.id,
        reason: payload.reason || null,
        notes: payload.notes || null,
      });
      await manager.save(ClinicalEscalationHistory, history);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'CLINICAL_ESCALATION_TRANSITIONED',
          entityName: 'ClinicalEscalation',
          entityId: escalation.id,
          details: {
            escalationReferenceId: escalation.escalationReferenceId,
            fromStatus: previousStatus,
            toStatus: payload.targetStatus,
            reason: payload.reason,
          },
        }),
      );

      // If escalated, emit real-time outbox event
      if (payload.targetStatus === EscalationStatus.ESCALATED) {
        await outboxService.recordEvent(manager, {
          eventType: NotificationType.CLINICAL_ESCALATION_ESCALATED,
          aggregateType: 'ClinicalEscalation',
          aggregateId: escalation.id,
          admissionId: escalation.admissionId,
          payload: {
            referenceId: escalation.escalationReferenceId,
            category: escalation.category,
            priority: NotificationPriority.URGENT,
            reason: payload.reason || 'Escalated to senior clinician',
            initiatedByUserId: actor.id,
          },
        });
      }

      return this.getEscalationById(escalation.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  async resolveEscalation(
    admissionId: string,
    escalationId: string,
    payload: ResolveEscalationRequest,
    actor: RequestUser,
  ): Promise<ClinicalEscalationDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const escalation = await manager.findOne(ClinicalEscalation, {
        where: { id: escalationId, admissionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!escalation) {
        throw new NotFoundError('Clinical escalation not found');
      }

      if (
        escalation.status === EscalationStatus.CLOSED ||
        escalation.status === EscalationStatus.CANCELLED
      ) {
        throw new ConflictError(
          `Cannot resolve an escalation already in terminal state '${escalation.status}'`,
        );
      }

      const previousStatus = escalation.status;
      escalation.status = EscalationStatus.RESOLVED;
      escalation.resolvedAt = new Date();
      escalation.resolvedByUserId = actor.id;
      escalation.clinicalResponseNotes = payload.clinicalResponseNotes;
      if (payload.closureReason) {
        escalation.closureReason = payload.closureReason;
      }

      await manager.save(ClinicalEscalation, escalation);

      // Save history record
      const history = manager.create(ClinicalEscalationHistory, {
        escalationId: escalation.id,
        fromStatus: previousStatus,
        toStatus: EscalationStatus.RESOLVED,
        changedByUserId: actor.id,
        reason: payload.closureReason || 'Clinical response completed',
        notes: payload.clinicalResponseNotes,
      });
      await manager.save(ClinicalEscalationHistory, history);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'CLINICAL_ESCALATION_RESOLVED',
          entityName: 'ClinicalEscalation',
          entityId: escalation.id,
          details: {
            escalationReferenceId: escalation.escalationReferenceId,
            admissionId: escalation.admissionId,
            clinicalResponseNotes: payload.clinicalResponseNotes,
          },
        }),
      );

      // Outbox Event
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.CLINICAL_ESCALATION_RESOLVED,
        aggregateType: 'ClinicalEscalation',
        aggregateId: escalation.id,
        admissionId: escalation.admissionId,
        payload: {
          referenceId: escalation.escalationReferenceId,
          category: escalation.category,
          priority: NotificationPriority.ROUTINE,
          reason: payload.closureReason || payload.clinicalResponseNotes,
          resolvedByUserId: actor.id,
        },
      });

      return this.getEscalationById(escalation.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  /**
   * REQ-6.6: only a doctor may reverse an emergency escalation, with a reason. The care plan
   * returns to the state it had before the escalation; the alert record itself is unchanged.
   */
  async reverseEscalation(
    admissionId: string,
    escalationId: string,
    payload: ReverseEscalationRequest,
    actor: RequestUser,
  ): Promise<ClinicalEscalationDto> {
    if (actor.role !== UserRole.DOCTOR) {
      throw new ForbiddenError('Only a doctor can reverse an escalation', 'ROLE_NOT_AUTHORIZED');
    }

    return this.dataSource.transaction(async (manager) => {
      const admission = await manager.findOne(Admission, {
        where: { id: admissionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!admission) {
        throw new NotFoundError('Admission episode not found');
      }
      const escalation = await manager.findOne(ClinicalEscalation, {
        where: { id: escalationId, admissionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!escalation) {
        throw new NotFoundError('Clinical escalation not found');
      }
      if (escalation.reversedAt) {
        throw new ConflictError('This escalation has already been reversed', 'ALREADY_REVERSED');
      }
      if (!escalation.carePlanTransitionId) {
        throw new ConflictError(
          'This escalation did not change the care plan, so there is nothing to reverse',
          'NOT_REVERSIBLE',
        );
      }
      if (admission.currentCarePlan !== CarePlanState.EMERGENCY_CESAREAN) {
        throw new ConflictError(
          `Care plan is ${admission.currentCarePlan}, not EMERGENCY_CESAREAN`,
          'NOT_REVERSIBLE',
        );
      }

      const original = await manager.findOneOrFail(CarePlanTransition, {
        where: { id: escalation.carePlanTransitionId },
      });
      await changeCarePlanState(
        manager,
        admission,
        original.previousState,
        actor.id,
        `Escalation reversed: ${payload.reason}`,
      );

      escalation.reversedAt = new Date();
      escalation.reversedByUserId = actor.id;
      escalation.reversalReason = payload.reason;
      await manager.save(ClinicalEscalation, escalation);

      await manager.save(
        ClinicalEscalationHistory,
        manager.create(ClinicalEscalationHistory, {
          escalationId: escalation.id,
          fromStatus: escalation.status,
          toStatus: escalation.status,
          changedByUserId: actor.id,
          reason: `Escalation reversed: ${payload.reason}`,
        }),
      );

      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'EMERGENCY_ESCALATION_REVERSED',
          entityName: 'ClinicalEscalation',
          entityId: escalation.id,
          details: {
            admissionId,
            escalationReferenceId: escalation.escalationReferenceId,
            restoredCarePlan: original.previousState,
            reason: payload.reason,
          },
        }),
      );

      return this.getEscalationById(escalation.id, manager);
    });
  }

  private async alreadyEscalatedError(
    manager: EntityManager,
    admissionId: string,
  ): Promise<ConflictError> {
    const current = await manager.findOne(ClinicalEscalation, {
      where: { admissionId, reversedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    const details: AlreadyEscalatedDetails | undefined = current
      ? {
          escalationId: current.id,
          escalationReferenceId: current.escalationReferenceId,
          alertState: toAlertReceiptState(current),
          timedOut: Boolean(current.timedOutAt) && !current.acknowledgedAt,
        }
      : undefined;
    return new ConflictError(
      'This patient is already on EMERGENCY_CESAREAN. See the current alert status.',
      'ALREADY_ESCALATED',
      details,
    );
  }
}
