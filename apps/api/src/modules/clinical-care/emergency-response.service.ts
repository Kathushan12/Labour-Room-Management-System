import { DataSource } from 'typeorm';
import {
  EmergencyResponseDto,
  CreateEmergencyResponseRequest,
  AcknowledgeEmergencyResponseRequest,
  TransitionEmergencyResponseRequest,
  EmergencyResponseStatus,
  NotificationType,
  NotificationPriority,
} from '@lrms/shared';
import { outboxService } from '../realtime/outbox.service.js';
import { notificationDispatcherService } from '../realtime/notification-dispatcher.service.js';
import { AppDataSource } from '../../config/database.js';
import { Admission, AuditLog, EmergencyResponse, User } from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors/auth.errors.js';
import { toEmergencyResponseDto } from './clinical-care.dto.js';

const ALLOWED_EMERGENCY_TRANSITIONS: Record<EmergencyResponseStatus, EmergencyResponseStatus[]> = {
  [EmergencyResponseStatus.INITIATED]: [
    EmergencyResponseStatus.ACKNOWLEDGED,
    EmergencyResponseStatus.CANCELLED,
  ],
  [EmergencyResponseStatus.ACKNOWLEDGED]: [
    EmergencyResponseStatus.IN_PROGRESS,
    EmergencyResponseStatus.RESOLVED,
    EmergencyResponseStatus.CANCELLED,
  ],
  [EmergencyResponseStatus.IN_PROGRESS]: [
    EmergencyResponseStatus.RESOLVED,
    EmergencyResponseStatus.CANCELLED,
  ],
  [EmergencyResponseStatus.RESOLVED]: [],
  [EmergencyResponseStatus.CANCELLED]: [],
};

export class EmergencyResponseService {
  constructor(private dataSource: DataSource = AppDataSource) {}

  private async generateResponseReferenceId(): Promise<string> {
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await this.dataSource.getRepository(EmergencyResponse).count();
    const seq = String(count + 1).padStart(4, '0');
    return `ER-${yearMonth}-${seq}`;
  }

  async initiateEmergencyResponse(
    admissionId: string,
    payload: CreateEmergencyResponseRequest,
    actor: RequestUser,
  ): Promise<EmergencyResponseDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const admission = await manager.findOne(Admission, {
        where: { id: admissionId },
      });
      if (!admission) {
        throw new NotFoundError('Admission episode not found');
      }

      if (payload.assignedResponderUserId) {
        const responder = await manager.findOne(User, {
          where: { id: payload.assignedResponderUserId },
        });
        if (!responder) {
          throw new NotFoundError('Assigned responder user not found');
        }
      }

      const referenceId = await this.generateResponseReferenceId();

      const response = manager.create(EmergencyResponse, {
        admissionId,
        responseReferenceId: referenceId,
        category: payload.category,
        status: EmergencyResponseStatus.INITIATED,
        clinicalReason: payload.clinicalReason,
        initiatedByUserId: actor.id,
        assignedTeam: payload.assignedTeam || null,
        assignedResponderUserId: payload.assignedResponderUserId || null,
      });

      const savedResponse = await manager.save(EmergencyResponse, response);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'EMERGENCY_RESPONSE_INITIATED',
          entityName: 'EmergencyResponse',
          entityId: savedResponse.id,
          details: {
            admissionId,
            referenceId,
            category: payload.category,
            clinicalReason: payload.clinicalReason,
            assignedTeam: payload.assignedTeam,
          },
        }),
      );

      // Outbox Event (Emergency Priority)
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.EMERGENCY_RESPONSE_INITIATED,
        aggregateType: 'EmergencyResponse',
        aggregateId: savedResponse.id,
        admissionId,
        payload: {
          category: payload.category,
          priority: NotificationPriority.EMERGENCY,
          referenceId,
          clinicalReason: payload.clinicalReason,
          assignedResponderUserId: payload.assignedResponderUserId || null,
          initiatedByUserId: actor.id,
        },
      });

      return this.getEmergencyResponseById(savedResponse.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  async getEmergencyResponses(admissionId: string): Promise<EmergencyResponseDto[]> {
    const responses = await this.dataSource.getRepository(EmergencyResponse).find({
      where: { admissionId },
      relations: ['initiatedByUser', 'assignedResponderUser', 'acknowledgedByUser'],
      order: {
        createdAt: 'DESC',
      },
    });

    return responses.map(toEmergencyResponseDto);
  }

  async getEmergencyResponseById(
    responseId: string,
    manager = this.dataSource.manager,
  ): Promise<EmergencyResponseDto> {
    const response = await manager.findOne(EmergencyResponse, {
      where: { id: responseId },
      relations: ['initiatedByUser', 'assignedResponderUser', 'acknowledgedByUser'],
    });

    if (!response) {
      throw new NotFoundError('Emergency response not found');
    }

    return toEmergencyResponseDto(response);
  }

  async acknowledgeEmergencyResponse(
    responseId: string,
    payload: AcknowledgeEmergencyResponseRequest,
    actor: RequestUser,
  ): Promise<EmergencyResponseDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const response = await manager.findOne(EmergencyResponse, {
        where: { id: responseId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!response) {
        throw new NotFoundError('Emergency response not found');
      }

      if (response.status !== EmergencyResponseStatus.INITIATED) {
        throw new ConflictError(
          `Cannot acknowledge emergency response in '${response.status}' state (only INITIATED responses can be acknowledged)`,
        );
      }

      response.status = EmergencyResponseStatus.ACKNOWLEDGED;
      response.acknowledgedAt = new Date();
      response.acknowledgedByUserId = actor.id;
      if (payload.actionNotes) {
        response.actionNotes = payload.actionNotes;
      }

      await manager.save(EmergencyResponse, response);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'EMERGENCY_RESPONSE_ACKNOWLEDGED',
          entityName: 'EmergencyResponse',
          entityId: response.id,
          details: {
            referenceId: response.responseReferenceId,
            admissionId: response.admissionId,
            actionNotes: payload.actionNotes,
          },
        }),
      );

      // Outbox Event
      await outboxService.recordEvent(manager, {
        eventType: NotificationType.EMERGENCY_RESPONSE_ACKNOWLEDGED,
        aggregateType: 'EmergencyResponse',
        aggregateId: response.id,
        admissionId: response.admissionId,
        payload: {
          referenceId: response.responseReferenceId,
          category: response.category,
          priority: NotificationPriority.ROUTINE,
          reason: payload.actionNotes || 'Emergency response acknowledged',
          acknowledgedByUserId: actor.id,
        },
      });

      return this.getEmergencyResponseById(response.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }

  async transitionEmergencyResponse(
    responseId: string,
    payload: TransitionEmergencyResponseRequest,
    actor: RequestUser,
  ): Promise<EmergencyResponseDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const response = await manager.findOne(EmergencyResponse, {
        where: { id: responseId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!response) {
        throw new NotFoundError('Emergency response not found');
      }

      const allowedTransitions = ALLOWED_EMERGENCY_TRANSITIONS[response.status] || [];
      if (!allowedTransitions.includes(payload.targetStatus)) {
        throw new BadRequestError(
          `Invalid state transition: Cannot transition emergency response from '${response.status}' to '${payload.targetStatus}'`,
        );
      }

      const previousStatus = response.status;
      response.status = payload.targetStatus;
      if (payload.actionNotes) {
        response.actionNotes = payload.actionNotes;
      }
      if (payload.resolutionNotes) {
        response.resolutionNotes = payload.resolutionNotes;
      }
      if (payload.targetStatus === EmergencyResponseStatus.RESOLVED) {
        response.resolvedAt = new Date();
      }

      await manager.save(EmergencyResponse, response);

      // Audit Log
      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action:
            payload.targetStatus === EmergencyResponseStatus.RESOLVED
              ? 'EMERGENCY_RESPONSE_RESOLVED'
              : 'EMERGENCY_RESPONSE_TRANSITIONED',
          entityName: 'EmergencyResponse',
          entityId: response.id,
          details: {
            referenceId: response.responseReferenceId,
            fromStatus: previousStatus,
            toStatus: payload.targetStatus,
            resolutionNotes: payload.resolutionNotes,
          },
        }),
      );

      // If resolved, emit real-time outbox event
      if (payload.targetStatus === EmergencyResponseStatus.RESOLVED) {
        await outboxService.recordEvent(manager, {
          eventType: NotificationType.EMERGENCY_RESPONSE_RESOLVED,
          aggregateType: 'EmergencyResponse',
          aggregateId: response.id,
          admissionId: response.admissionId,
          payload: {
            referenceId: response.responseReferenceId,
            category: response.category,
            priority: NotificationPriority.ROUTINE,
            reason: payload.resolutionNotes || payload.actionNotes || 'Emergency response resolved',
            resolvedByUserId: actor.id,
          },
        });
      }

      return this.getEmergencyResponseById(response.id, manager);
    });

    notificationDispatcherService.dispatchNow().catch(() => {});
    return result;
  }
}
