import { DataSource } from 'typeorm';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  EmergencyOverride,
  PatientStaffAssignment,
  Shift,
  ShiftStaffAssignment,
  StaffWardAssignment,
  User,
} from '../../database/entities/index.js';
import { NotificationPriority, NotificationType, UserRole } from '@lrms/shared';
import { logger } from '../../common/logging/logger.js';

export interface RecipientResolutionContext {
  eventType: NotificationType;
  priority: NotificationPriority;
  admissionId?: string | null;
  wardId?: string | null;
  explicitRecipientUserId?: string | null;
  initiatorUserId?: string | null;
}

export class NotificationRecipientService {
  constructor(private dataSource: DataSource = AppDataSource) {}

  /**
   * Resolves list of authorized user IDs who should receive this notification.
   * Enforces Caldicott data protection: ADMIN users are strictly excluded from
   * patient clinical notifications.
   */
  async resolveRecipients(context: RecipientResolutionContext): Promise<string[]> {
    const recipientUserIds = new Set<string>();

    // 1. Explicit targeted recipient (e.g., assigned reviewer, direct escalation assignee)
    if (context.explicitRecipientUserId) {
      recipientUserIds.add(context.explicitRecipientUserId);
    }

    // 2. Patient-specific assignment resolution
    if (context.admissionId) {
      // Find all active patient staff assignments (attending doctor, primary nurse, etc.)
      const activeAssignments = await this.dataSource.getRepository(PatientStaffAssignment).find({
        where: {
          admissionId: context.admissionId,
        },
        select: ['staffId', 'unassignedAt'],
      });

      for (const assignment of activeAssignments) {
        if (!assignment.unassignedAt) {
          recipientUserIds.add(assignment.staffId);
        }
      }

      // Find clinicians with active, unexpired break-glass emergency overrides
      const activeOverrides = await this.dataSource
        .getRepository(EmergencyOverride)
        .createQueryBuilder('eo')
        .where('eo.admissionId = :admissionId', { admissionId: context.admissionId })
        .andWhere('eo.revokedAt IS NULL')
        .andWhere('(eo.expiresAt IS NULL OR eo.expiresAt > :now)', { now: new Date() })
        .select(['eo.staffId'])
        .getMany();

      for (const override of activeOverrides) {
        recipientUserIds.add(override.staffId);
      }

      // For URGENT or EMERGENCY priority alerts, also notify all on-duty clinicians in the ward
      if (
        context.priority === NotificationPriority.EMERGENCY ||
        context.priority === NotificationPriority.URGENT
      ) {
        let wardId = context.wardId;
        if (!wardId) {
          const admission = await this.dataSource
            .getRepository(Admission)
            .findOne({ where: { id: context.admissionId }, select: ['wardId'] });
          wardId = admission?.wardId ?? null;
        }

        if (wardId) {
          const onDutyStaff = await this.resolveOnDutyWardStaff(wardId);
          for (const staffId of onDutyStaff) {
            recipientUserIds.add(staffId);
          }
        }
      }
    } else if (context.wardId) {
      // Ward-level operational announcement: notify on-duty staff in the ward
      const onDutyStaff = await this.resolveOnDutyWardStaff(context.wardId);
      for (const staffId of onDutyStaff) {
        recipientUserIds.add(staffId);
      }
    }

    if (recipientUserIds.size === 0) {
      logger.warn(
        { service: 'recipient-resolver', context },
        'No eligible recipients resolved for notification',
      );
      return [];
    }

    // Filter candidate recipients: must be active and have appropriate role
    // CALDICOTT ENFORCEMENT: System Administrators (ADMIN) must NOT receive clinical patient alerts
    const candidateIds = Array.from(recipientUserIds);
    const validUsers = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.role', 'role')
      .where('user.id IN (:...ids)', { ids: candidateIds })
      .andWhere('user.isActive = true')
      .getMany();

    const authorizedUserIds = validUsers
      .filter((user) => {
        // Clinical notifications are restricted to DOCTOR and NURSE_STAFF
        if (context.admissionId) {
          return user.role?.name === UserRole.DOCTOR || user.role?.name === UserRole.NURSE_STAFF;
        }
        return true;
      })
      .map((u) => u.id);

    logger.debug(
      {
        service: 'recipient-resolver',
        eventType: context.eventType,
        priority: context.priority,
        admissionId: context.admissionId,
        recipientCount: authorizedUserIds.length,
      },
      'Resolved notification recipients',
    );

    return authorizedUserIds;
  }

  /**
   * Resolves clinicians currently assigned to a ward who are scheduled on an active shift.
   */
  private async resolveOnDutyWardStaff(wardId: string): Promise<string[]> {
    try {
      // Get all active ward assignments
      const wardAssignments = await this.dataSource.getRepository(StaffWardAssignment).find({
        where: {
          wardId,
          isActive: true,
        },
        select: ['userId', 'endedAt'],
      });

      const assignedUserIds = wardAssignments.filter((wa) => !wa.endedAt).map((wa) => wa.userId);

      if (assignedUserIds.length === 0) {
        return [];
      }

      // Check which of these clinicians are on an in-progress shift
      const activeShifts = await this.dataSource
        .getRepository(Shift)
        .createQueryBuilder('shift')
        .innerJoin(
          ShiftStaffAssignment,
          'ssa',
          'ssa.shiftId = shift.id AND ssa.status != :cancelledStatus',
          { cancelledStatus: 'CANCELLED' },
        )
        .where('shift.wardId = :wardId', { wardId })
        .andWhere('shift.status = :inProgressStatus', { inProgressStatus: 'IN_PROGRESS' })
        .andWhere('ssa.userId IN (:...userIds)', { userIds: assignedUserIds })
        .select(['ssa.userId AS "userId"'])
        .getRawMany();

      if (activeShifts.length > 0) {
        return Array.from(new Set(activeShifts.map((r: { userId: string }) => r.userId)));
      }

      // Fallback: if no active shift found, return all assigned ward staff
      return assignedUserIds;
    } catch (err) {
      logger.error(
        { service: 'recipient-resolver', wardId, err },
        'Failed resolving ward on-duty staff',
      );
      return [];
    }
  }
}

export const notificationRecipientService = new NotificationRecipientService();
