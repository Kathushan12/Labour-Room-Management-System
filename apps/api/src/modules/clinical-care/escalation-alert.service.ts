import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import {
  AlertNewPayload,
  AlertStateChange,
  AlertStatePayload,
  BedActiveAlertDto,
  ClinicalEscalationDto,
  EscalationStatus,
  NotificationPriority,
  NotificationType,
  Permission,
  SocketEvent,
  StaffAssignmentRole,
  UserRole,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  AdmissionRiskFlag,
  AuditLog,
  BedAllocationHistory,
  ClinicalEscalation,
  Notification,
  NotificationDeliveryAttempt,
  PatientStaffAssignment,
  StaffProfile,
  User,
} from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { ForbiddenError, NotFoundError } from '../../common/errors/auth.errors.js';
import { logger } from '../../common/logging/logger.js';
import {
  emitToAdmission,
  emitToUser,
  emitToWard,
  isUserOnline,
} from '../realtime/realtime.server.js';
import { notificationRecipientService } from '../realtime/notification-recipient.service.js';
import { notificationService } from '../realtime/notification.service.js';
import { decryptStaffContactNumber } from '../users/user.dto.js';
import { toAlertReceiptState } from './clinical-care.dto.js';

export const ALERT_RESEND_INTERVAL_SECONDS = 15;
const ESCALATION_RESOURCE_TYPE = 'ClinicalEscalation';
const CLOSED_STATUSES = [
  EscalationStatus.RESOLVED,
  EscalationStatus.CLOSED,
  EscalationStatus.CANCELLED,
];

// TypeORM's postgres driver returns [rows, rowCount] for UPDATE ... RETURNING.
function returningRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  return (result as T[]) ?? [];
}

export class EscalationAlertService {
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(private dataSource: DataSource = AppDataSource) {}

  /**
   * Picks the doctor who receives the alert: the attending doctor, otherwise an on-duty ward
   * doctor, otherwise nobody (the nurse screen then shows "No doctor assigned").
   */
  async resolveRecipient(manager: EntityManager, admission: Admission): Promise<string | null> {
    const attending = await manager.findOne(PatientStaffAssignment, {
      where: {
        admissionId: admission.id,
        assignmentRole: StaffAssignmentRole.ATTENDING_DOCTOR,
        unassignedAt: IsNull(),
      },
      relations: ['staff', 'staff.role'],
      order: { assignedAt: 'DESC' },
    });
    if (attending?.staff?.isActive && attending.staff.role?.name === UserRole.DOCTOR) {
      return attending.staffId;
    }

    if (!admission.wardId) return null;
    const onDutyIds = await notificationRecipientService.resolveOnDutyWardStaff(admission.wardId);
    if (onDutyIds.length === 0) return null;

    const doctors = await manager.find(User, {
      where: { id: In(onDutyIds), isActive: true },
      relations: ['role'],
      order: { fullName: 'ASC' },
    });
    return doctors.find((u) => u.role?.name === UserRole.DOCTOR)?.id ?? null;
  }

  private async buildAlertPayload(
    escalation: ClinicalEscalation,
    manager: EntityManager,
  ): Promise<AlertNewPayload> {
    const [admission, allocation, flags] = await Promise.all([
      manager.findOneOrFail(Admission, { where: { id: escalation.admissionId } }),
      manager.findOne(BedAllocationHistory, {
        where: { admissionId: escalation.admissionId, releasedAt: IsNull() },
        relations: ['bed'],
      }),
      manager.find(AdmissionRiskFlag, {
        where: { admissionId: escalation.admissionId, isActive: true },
        relations: ['definition'],
      }),
    ]);

    return {
      escalationId: escalation.id,
      admissionId: escalation.admissionId,
      escalationReferenceId: escalation.escalationReferenceId,
      admissionReferenceId: admission.admissionReferenceId,
      bedNumber: allocation?.bed?.bedNumber ?? null,
      riskFlags: flags.map((f) => f.definition?.label).filter((l): l is string => !!l),
      category: escalation.category,
      priority: escalation.priority,
      clinicalReason: escalation.clinicalReason,
      dispatchedAt: escalation.dispatchedAt.toISOString(),
    };
  }

  /**
   * Emits alert:new to the escalation's current recipient. No-op unless the escalation is still
   * open and `recipientUserId` is that recipient.
   */
  async emitAlertNew(
    escalationId: string,
    recipientUserId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<boolean> {
    const escalation = await manager.findOne(ClinicalEscalation, { where: { id: escalationId } });
    if (
      !escalation ||
      escalation.status !== EscalationStatus.OPEN ||
      escalation.assignedRecipientUserId !== recipientUserId
    ) {
      return false;
    }
    const payload = await this.buildAlertPayload(escalation, manager);
    return emitToUser(recipientUserId, SocketEvent.ALERT_NEW, payload);
  }

  /**
   * Re-sends an open alert and records the attempt against the doctor's escalation notification.
   */
  async sendAlert(escalationId: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const escalation = await manager.findOne(ClinicalEscalation, { where: { id: escalationId } });
      const doctorId = escalation?.assignedRecipientUserId;
      if (!escalation || !doctorId || escalation.status !== EscalationStatus.OPEN) return false;

      const notification = await manager.findOne(Notification, {
        where: {
          recipientUserId: doctorId,
          resourceType: ESCALATION_RESOURCE_TYPE,
          resourceId: escalation.id,
        },
        order: { createdAt: 'DESC' },
      });

      if (notification) {
        await manager.save(
          NotificationDeliveryAttempt,
          manager.create(NotificationDeliveryAttempt, {
            notificationId: notification.id,
            recipientUserId: doctorId,
            deliveryChannel: 'SOCKET_IO',
            status: 'DISPATCHED',
          }),
        );
      } else {
        // createNotification records the first delivery attempt itself.
        await notificationService.createNotification(
          {
            recipientUserId: doctorId,
            notificationType: NotificationType.CLINICAL_ESCALATION_CREATED,
            priority: NotificationPriority.EMERGENCY,
            title: `Escalation ${escalation.escalationReferenceId}`,
            safeMessage: 'Emergency escalation alert',
            resourceType: ESCALATION_RESOURCE_TYPE,
            resourceId: escalation.id,
            admissionId: escalation.admissionId,
          },
          manager,
        );
      }

      return this.emitAlertNew(escalation.id, doctorId, manager);
    });
  }

  /**
   * Records the doctor's device receipt (REQ-7.3). Idempotent; delivered_at is written once.
   */
  async markDelivered(escalationId: string, actor: RequestUser): Promise<void> {
    if (actor.role !== UserRole.DOCTOR || !actor.permissions.includes(Permission.ALERTS_RECEIVE)) {
      throw new ForbiddenError('Only doctors can confirm alert receipt', 'ALERT_RECEIPT_DENIED');
    }

    const delivered = await this.dataSource.transaction(async (manager) => {
      const rows = returningRows<{ id: string }>(
        await manager.query(
          `UPDATE "clinical_escalations"
              SET "delivered_at" = now(), "updated_at" = now()
            WHERE "id" = $1 AND "assigned_recipient_user_id" = $2
              AND "delivered_at" IS NULL AND "status" = $3
          RETURNING "id"`,
          [escalationId, actor.id, EscalationStatus.OPEN],
        ),
      );

      if (rows.length === 0) {
        const escalation = await manager.findOne(ClinicalEscalation, {
          where: { id: escalationId },
        });
        if (!escalation) throw new NotFoundError('Clinical escalation not found');
        if (escalation.assignedRecipientUserId !== actor.id) {
          throw new ForbiddenError('This alert was not sent to you', 'ALERT_RECEIPT_NOT_RECIPIENT');
        }
        return false;
      }

      await manager.query(
        `UPDATE "notification_delivery_attempts" a
            SET "status" = 'DELIVERED', "delivered_at" = now()
           FROM "notifications" n
          WHERE a."notification_id" = n."id" AND n."resource_type" = $1
            AND n."resource_id" = $2 AND a."recipient_user_id" = $3 AND a."status" = 'DISPATCHED'`,
        [ESCALATION_RESOURCE_TYPE, escalationId, actor.id],
      );

      await manager.save(
        AuditLog,
        manager.create(AuditLog, {
          userId: actor.id,
          action: 'ALERT_DELIVERED',
          entityName: 'ClinicalEscalation',
          entityId: escalationId,
          details: { channel: 'SOCKET_IO' },
        }),
      );
      return true;
    });

    if (delivered) await this.emitState(escalationId, AlertStateChange.DELIVERED);
  }

  /**
   * Re-sends undelivered alerts whose last attempt is older than the resend interval (REQ-7.6).
   * Only doctors with a connected socket are retried; reconnects are handled by resendForDoctor.
   */
  async resendDue(): Promise<number> {
    const due: { id: string; doctorId: string }[] = await this.dataSource.query(
      `SELECT e."id", e."assigned_recipient_user_id" AS "doctorId"
         FROM "clinical_escalations" e
        WHERE e."status" = $1 AND e."delivered_at" IS NULL
          AND e."assigned_recipient_user_id" IS NOT NULL
          AND GREATEST(e."dispatched_at", COALESCE((
                SELECT MAX(a."attempted_at")
                  FROM "notification_delivery_attempts" a
                  JOIN "notifications" n ON n."id" = a."notification_id"
                 WHERE n."resource_type" = $2 AND n."resource_id" = e."id"
                   AND a."recipient_user_id" = e."assigned_recipient_user_id"
              ), e."dispatched_at")) <= now() - make_interval(secs => $3)
        ORDER BY e."dispatched_at" ASC
        LIMIT 50`,
      [EscalationStatus.OPEN, ESCALATION_RESOURCE_TYPE, ALERT_RESEND_INTERVAL_SECONDS],
    );

    let sent = 0;
    for (const row of due) {
      if (!(await isUserOnline(row.doctorId))) continue;
      if (await this.sendAlert(row.id)) sent++;
    }
    if (sent > 0) {
      logger.info({ service: 'escalation-alert', resent: sent }, 'Re-sent undelivered alerts');
    }
    return sent;
  }

  /**
   * Called when a doctor's socket connects: re-sends every open alert for them so the
   * full-screen alert reappears after a reload or reconnect.
   */
  async resendForDoctor(doctorId: string): Promise<void> {
    const open = await this.dataSource.getRepository(ClinicalEscalation).find({
      where: { assignedRecipientUserId: doctorId, status: EscalationStatus.OPEN },
      select: ['id'],
      order: { dispatchedAt: 'ASC' },
    });
    for (const esc of open) {
      await this.sendAlert(esc.id);
    }
  }

  /**
   * Marks open alerts as timed out once the ward's timeout has passed (REQ-7.7).
   */
  async sweepTimeouts(): Promise<number> {
    const timedOut = await this.dataSource.transaction(async (manager) => {
      const rows = returningRows<{ id: string; escalation_reference_id: string }>(
        await manager.query(
          `UPDATE "clinical_escalations" e
              SET "timed_out_at" = now(), "updated_at" = now()
            WHERE e."status" = $1 AND e."timed_out_at" IS NULL
              AND e."dispatched_at" + make_interval(secs => COALESCE((
                    SELECT w."alert_timeout_seconds"
                      FROM "admissions" a JOIN "wards" w ON w."id" = a."ward_id"
                     WHERE a."id" = e."admission_id"
                  ), 120)) <= now()
          RETURNING e."id", e."escalation_reference_id"`,
          [EscalationStatus.OPEN],
        ),
      );

      for (const row of rows) {
        await manager.save(
          AuditLog,
          manager.create(AuditLog, {
            userId: null,
            action: 'ALERT_TIMED_OUT',
            entityName: 'ClinicalEscalation',
            entityId: row.id,
            details: { escalationReferenceId: row.escalation_reference_id },
          }),
        );
      }
      return rows;
    });

    for (const row of timedOut) {
      await this.emitState(row.id, AlertStateChange.TIMED_OUT);
    }
    return timedOut.length;
  }

  /**
   * Broadcasts an alert state change to the patient's room, the ward board, the doctor and the
   * nurse who escalated (REQ-7.9). The payload carries no patient identifiers.
   */
  async emitState(escalationId: string, state: AlertStateChange): Promise<void> {
    const escalation = await this.dataSource.getRepository(ClinicalEscalation).findOne({
      where: { id: escalationId },
      relations: ['admission'],
    });
    if (!escalation) return;

    const wardId = escalation.admission?.wardId ?? '';
    const payload: AlertStatePayload = {
      escalationId: escalation.id,
      admissionId: escalation.admissionId,
      wardId,
      state,
      dispatchedAt: escalation.dispatchedAt.toISOString(),
      deliveredAt: escalation.deliveredAt?.toISOString() ?? null,
      acknowledgedAt: escalation.acknowledgedAt?.toISOString() ?? null,
      timedOutAt: escalation.timedOutAt?.toISOString() ?? null,
    };

    emitToAdmission(escalation.admissionId, SocketEvent.ALERT_STATE, payload);
    if (wardId) emitToWard(wardId, SocketEvent.ALERT_STATE, payload);
    emitToUser(escalation.initiatedByUserId, SocketEvent.ALERT_STATE, payload);
    if (escalation.assignedRecipientUserId) {
      emitToUser(escalation.assignedRecipientUserId, SocketEvent.ALERT_STATE, payload);
    }
  }

  private async loadContactNumbers(userIds: string[]): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    if (userIds.length === 0) return result;
    const profiles = await this.dataSource
      .getRepository(StaffProfile)
      .find({ where: { userId: In(userIds) } });
    for (const p of profiles) {
      try {
        result.set(p.userId, decryptStaffContactNumber(p));
      } catch {
        result.set(p.userId, null);
      }
    }
    return result;
  }

  /**
   * Adds the doctor's phone number to alerts that timed out without acknowledgement, so the
   * nurse can call (REQ-7.7). Other alerts never expose it.
   */
  async attachRecipientContact<T extends ClinicalEscalationDto>(dtos: T[]): Promise<T[]> {
    const needsPhone = (d: T) => !!d.timedOutAt && !d.acknowledgedAt && !!d.assignedRecipientUserId;
    const ids = [...new Set(dtos.filter(needsPhone).map((d) => d.assignedRecipientUserId!))];
    const phones = await this.loadContactNumbers(ids);
    return dtos.map((d) =>
      needsPhone(d)
        ? { ...d, recipientContactNumber: phones.get(d.assignedRecipientUserId!) ?? null }
        : d,
    );
  }

  /**
   * Latest not-yet-closed alert per admission, for the ward bed board.
   */
  async getActiveAlertsByAdmission(
    admissionIds: string[],
  ): Promise<Map<string, BedActiveAlertDto>> {
    const result = new Map<string, BedActiveAlertDto>();
    if (admissionIds.length === 0) return result;

    const escalations = await this.dataSource
      .getRepository(ClinicalEscalation)
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.assignedRecipientUser', 'doctor')
      .where('e.admissionId IN (:...admissionIds)', { admissionIds })
      .andWhere('e.status NOT IN (:...closed)', { closed: CLOSED_STATUSES })
      .orderBy('e.dispatchedAt', 'DESC')
      .getMany();

    const latest = new Map<string, ClinicalEscalation>();
    for (const e of escalations) {
      if (!latest.has(e.admissionId)) latest.set(e.admissionId, e);
    }

    const phoneIds = [...latest.values()]
      .filter((e) => e.timedOutAt && !e.acknowledgedAt && e.assignedRecipientUserId)
      .map((e) => e.assignedRecipientUserId!);
    const phones = await this.loadContactNumbers([...new Set(phoneIds)]);

    for (const [admissionId, e] of latest) {
      const showPhone = !!e.timedOutAt && !e.acknowledgedAt && !!e.assignedRecipientUserId;
      result.set(admissionId, {
        escalationId: e.id,
        escalationReferenceId: e.escalationReferenceId,
        alertState: toAlertReceiptState(e),
        dispatchedAt: e.dispatchedAt.toISOString(),
        timedOutAt: e.timedOutAt?.toISOString() ?? null,
        recipientName: e.assignedRecipientUser?.fullName ?? null,
        recipientContactNumber: showPhone ? (phones.get(e.assignedRecipientUserId!) ?? null) : null,
      });
    }
    return result;
  }

  start(intervalMs = 1000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    logger.info(
      { service: 'escalation-alert', intervalMs },
      'Alert timeout/resend monitor started',
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): Promise<void> {
    if (this.inFlight || !this.dataSource.isInitialized) return this.inFlight ?? Promise.resolve();
    this.inFlight = (async () => {
      try {
        await this.sweepTimeouts();
        await this.resendDue();
      } catch (err) {
        logger.error({ service: 'escalation-alert', err }, 'Alert monitor tick failed');
      } finally {
        this.inFlight = null;
      }
    })();
    return this.inFlight;
  }
}

export const escalationAlertService = new EscalationAlertService();
