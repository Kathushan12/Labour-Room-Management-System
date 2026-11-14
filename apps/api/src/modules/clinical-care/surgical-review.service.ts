import { DataSource } from 'typeorm';
import {
  SurgicalReviewDto,
  CreateSurgicalReviewRequest,
  RecordSurgicalDecisionRequest,
  UpdateSurgicalCoordinationRequest,
  SurgicalReviewStatus,
  CaesareanDecision,
  AnaesthesiaReviewStatus,
  TheatreReadinessStatus,
  UserRole,
  NotificationType,
  NotificationPriority,
} from '@lrms/shared';
import { outboxService } from '../realtime/outbox.service.js';
import { notificationDispatcherService } from '../realtime/notification-dispatcher.service.js';
import { AppDataSource } from '../../config/database.js';
import { Admission, AuditLog, SurgicalReview, User } from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../common/errors/auth.errors.js';
import { toSurgicalReviewDto } from './clinical-care.dto.js';

const ALLOWED_SURGICAL_TRANSITIONS: Record<SurgicalReviewStatus, SurgicalReviewStatus[]> = {
  [SurgicalReviewStatus.REVIEW_REQUESTED]: [
    SurgicalReviewStatus.CONSULTANT_REVIEW,
    SurgicalReviewStatus.DECISION_PENDING,
    SurgicalReviewStatus.DECISION_RECORDED,
    SurgicalReviewStatus.CANCELLED,
  ],
  [SurgicalReviewStatus.CONSULTANT_REVIEW]: [
    SurgicalReviewStatus.DECISION_PENDING,
    SurgicalReviewStatus.DECISION_RECORDED,
    SurgicalReviewStatus.PREPARATION_IN_PROGRESS,
    SurgicalReviewStatus.CANCELLED,
  ],
  [SurgicalReviewStatus.DECISION_PENDING]: [
    SurgicalReviewStatus.DECISION_RECORDED,
    SurgicalReviewStatus.CANCELLED,
  ],
  [SurgicalReviewStatus.DECISION_RECORDED]: [
    SurgicalReviewStatus.PREPARATION_IN_PROGRESS,
    SurgicalReviewStatus.READY_FOR_HANDOVER,
    SurgicalReviewStatus.CANCELLED,
  ],
  [SurgicalReviewStatus.PREPARATION_IN_PROGRESS]: [
    SurgicalReviewStatus.READY_FOR_HANDOVER,
    SurgicalReviewStatus.CANCELLED,
  ],
  [SurgicalReviewStatus.READY_FOR_HANDOVER]: [],
  [SurgicalReviewStatus.CANCELLED]: [],
};

export class SurgicalReviewService {
  constructor(private dataSource: DataSource = AppDataSource) {}

  private async generateReviewReferenceId(): Promise<string> {
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await this.dataSource.getRepository(SurgicalReview).count();
    const seq = String(count + 1).padStart(4, '0');
    return `SR-${yearMonth}-${seq}`;
  }

  async requestSurgicalReview(
    admissionId: string,
    payload: CreateSurgicalReviewRequest,
    actor: RequestUser,
  ): Promise<SurgicalReviewDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const admission = await manager.findOne(Admission, {
        where: { id: admissionId },
      });
      if (!admission) {
        throw new NotFoundError('Admission episode not found');
      }

      if (payload.consultantUserId) {
        const consultant = await manager.findOne(User, {
          where: { id: payload.consultantUserId },
        });
        if (!consultant) {
          throw new NotFoundError('Nominated consultant user not found');
        }
      }

      const referenceId = await this.generateReviewReferenceId();

      const review = manager.create(SurgicalReview, {
        admissionId,
        reviewReferenceId: referenceId,
        status: SurgicalReviewStatus.REVIEW_REQUESTED,
        caesareanDecision: CaesareanDecision.CONSIDERED,
        clinicalIndication: payload.clinicalIndication,
        requestedByUserId: actor.id,
        consultantUserId: payload.consultantUserId || null,
        anaesthesiaReviewStatus: AnaesthesiaReviewStatus.PENDING,
        theatreReadinessStatus: TheatreReadinessStatus.NOT_INITIATED,
      });

      const savedReview = await manager.save(SurgicalReview, review);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'SURGICAL_REVIEW_REQUESTED',
          entityName: 'SurgicalReview',
          entityId: savedReview.id,
          details: {
            admissionId,
            referenceId,
            clinicalIndication: payload.clinicalIndication,
            consultantUserId: payload.consultantUserId,
          },
        }),
      );

      // Outbox Event
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.SURGICAL_REVIEW_REQUESTED,
        aggregateType: 'SurgicalReview',
        aggregateId: savedReview.id,
        admissionId,
        payload: {
          referenceId,
          priority: NotificationPriority.URGENT,
          clinicalIndication: payload.clinicalIndication,
          recipientUserId: payload.consultantUserId || null,
          consultantUserId: payload.consultantUserId || null,
          requestedByUserId: actor.id,
        },
      });

      return this.getSurgicalReviewById(savedReview.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  async getSurgicalReviews(admissionId: string): Promise<SurgicalReviewDto[]> {
    const reviews = await this.dataSource.getRepository(SurgicalReview).find({
      where: { admissionId },
      relations: ['requestedByUser', 'consultantUser'],
      order: {
        createdAt: 'DESC',
      },
    });

    return reviews.map(toSurgicalReviewDto);
  }

  async getSurgicalReviewById(
    reviewId: string,
    manager = this.dataSource.manager,
  ): Promise<SurgicalReviewDto> {
    const review = await manager.findOne(SurgicalReview, {
      where: { id: reviewId },
      relations: ['requestedByUser', 'consultantUser'],
    });

    if (!review) {
      throw new NotFoundError('Surgical review not found');
    }

    return toSurgicalReviewDto(review);
  }

  async recordConsultantDecision(
    reviewId: string,
    payload: RecordSurgicalDecisionRequest,
    actor: RequestUser,
  ): Promise<SurgicalReviewDto> {
    if (actor.role !== UserRole.DOCTOR) {
      throw new ForbiddenError(
        'Separation of Duties: Only medical officers / obstetric consultants can record a surgical decision',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const review = await manager.findOne(SurgicalReview, {
        where: { id: reviewId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!review) {
        throw new NotFoundError('Surgical review not found');
      }

      if (
        review.status === SurgicalReviewStatus.READY_FOR_HANDOVER ||
        review.status === SurgicalReviewStatus.CANCELLED
      ) {
        throw new BadRequestError(
          `Cannot record decision on a surgical review in terminal state '${review.status}'`,
        );
      }

      const now = new Date();
      review.caesareanDecision = payload.caesareanDecision;
      review.decisionRationale = payload.decisionRationale;
      review.decisionRecordedAt = now;
      review.consultantAssessedAt = now;
      review.consultantUserId = payload.consultantUserId || actor.id;

      if (payload.caesareanDecision === CaesareanDecision.APPROVED_FOR_THEATRE) {
        review.status = SurgicalReviewStatus.PREPARATION_IN_PROGRESS;
      } else {
        review.status = SurgicalReviewStatus.DECISION_RECORDED;
      }

      await manager.save(SurgicalReview, review);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'SURGICAL_DECISION_RECORDED',
          entityName: 'SurgicalReview',
          entityId: review.id,
          details: {
            referenceId: review.reviewReferenceId,
            admissionId: review.admissionId,
            caesareanDecision: payload.caesareanDecision,
            decisionRationale: payload.decisionRationale,
            consultantUserId: review.consultantUserId,
          },
        }),
      );

      const decisionPriority =
        payload.caesareanDecision === CaesareanDecision.APPROVED_FOR_THEATRE
          ? NotificationPriority.EMERGENCY
          : NotificationPriority.URGENT;

      // Outbox Event
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.SURGICAL_DECISION_RECORDED,
        aggregateType: 'SurgicalReview',
        aggregateId: review.id,
        admissionId: review.admissionId,
        payload: {
          referenceId: review.reviewReferenceId,
          priority: decisionPriority,
          decision: payload.caesareanDecision,
          decisionRationale: payload.decisionRationale,
          consultantUserId: review.consultantUserId,
        },
      });

      return this.getSurgicalReviewById(review.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  async updateCoordination(
    reviewId: string,
    payload: UpdateSurgicalCoordinationRequest,
    actor: RequestUser,
  ): Promise<SurgicalReviewDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const review = await manager.findOne(SurgicalReview, {
        where: { id: reviewId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!review) {
        throw new NotFoundError('Surgical review not found');
      }

      if (
        review.status === SurgicalReviewStatus.READY_FOR_HANDOVER ||
        review.status === SurgicalReviewStatus.CANCELLED
      ) {
        throw new BadRequestError(
          `Cannot update coordination on a surgical review in terminal state '${review.status}'`,
        );
      }

      const now = new Date();
      if (payload.anaesthesiaReviewStatus) {
        review.anaesthesiaReviewStatus = payload.anaesthesiaReviewStatus;
      }
      if (payload.anaesthesiaNotes !== undefined) {
        review.anaesthesiaNotes = payload.anaesthesiaNotes;
      }
      if (payload.theatreReadinessStatus) {
        review.theatreReadinessStatus = payload.theatreReadinessStatus;
        if (
          payload.theatreReadinessStatus === TheatreReadinessStatus.THEATRE_READY &&
          !review.theatreReadyAt
        ) {
          review.theatreReadyAt = now;
        }
      }
      if (payload.handoverNotes !== undefined) {
        review.handoverNotes = payload.handoverNotes;
      }

      // Check target status transition or auto-handover
      if (payload.targetStatus) {
        const allowed = ALLOWED_SURGICAL_TRANSITIONS[review.status] || [];
        if (!allowed.includes(payload.targetStatus)) {
          throw new BadRequestError(
            `Invalid surgical status transition from '${review.status}' to '${payload.targetStatus}'`,
          );
        }
        review.status = payload.targetStatus;
        if (payload.targetStatus === SurgicalReviewStatus.READY_FOR_HANDOVER) {
          review.handedOverAt = now;
        }
      } else if (
        payload.theatreReadinessStatus === TheatreReadinessStatus.THEATRE_READY &&
        review.status === SurgicalReviewStatus.PREPARATION_IN_PROGRESS
      ) {
        // Can stay in PREPARATION_IN_PROGRESS or be marked ready for handover
      }

      await manager.save(SurgicalReview, review);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'SURGICAL_COORDINATION_UPDATED',
          entityName: 'SurgicalReview',
          entityId: review.id,
          details: {
            referenceId: review.reviewReferenceId,
            admissionId: review.admissionId,
            anaesthesiaReviewStatus: review.anaesthesiaReviewStatus,
            theatreReadinessStatus: review.theatreReadinessStatus,
            status: review.status,
          },
        }),
      );

      // Outbox Event
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.THEATRE_READINESS_UPDATED,
        aggregateType: 'SurgicalReview',
        aggregateId: review.id,
        admissionId: review.admissionId,
        payload: {
          referenceId: review.reviewReferenceId,
          priority: NotificationPriority.URGENT,
          theatreReadinessStatus: review.theatreReadinessStatus,
          anaesthesiaReviewStatus: review.anaesthesiaReviewStatus,
          status: review.status,
          updatedByUserId: actor.id,
        },
      });

      return this.getSurgicalReviewById(review.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }
}
