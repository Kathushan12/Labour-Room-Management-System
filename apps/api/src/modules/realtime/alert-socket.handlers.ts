import { Socket } from 'socket.io';
import { AlertReceiptResponse, SocketEvent, UserRole } from '@lrms/shared';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../config/database.js';
import { AuditLog } from '../../database/entities/index.js';
import { logger } from '../../common/logging/logger.js';
import { escalationAlertService } from '../clinical-care/escalation-alert.service.js';
import { alertReceiptSchema } from './realtime.schemas.js';

async function auditReceiptDenied(user: RequestUser, escalationId: string | null, reason: string) {
  try {
    await AppDataSource.getRepository(AuditLog).save({
      userId: user.id,
      action: 'ALERT_RECEIPT_DENIED',
      entityName: 'ClinicalEscalation',
      entityId: escalationId,
      details: { reason },
    });
  } catch (err) {
    logger.error({ service: 'realtime-alerts', err }, 'Failed to audit denied alert receipt');
  }
}

export function registerAlertHandlers(socket: Socket): void {
  const user = socket.data.user as RequestUser | undefined;
  if (!user) return;

  if (user.role === UserRole.DOCTOR) {
    escalationAlertService.resendForDoctor(user.id).catch((err) => {
      logger.error(
        { service: 'realtime-alerts', userId: user.id, err },
        'Failed re-sending open alerts on connect',
      );
    });
  }

  socket.on(
    SocketEvent.ALERT_RECEIPT,
    async (payload: unknown, callback?: (res: AlertReceiptResponse) => void) => {
      const reply = (res: AlertReceiptResponse) => {
        if (typeof callback === 'function') callback(res);
      };

      const parsed = alertReceiptSchema.safeParse(payload);
      if (!parsed.success) {
        reply({ status: 'ERROR', reason: 'Invalid alert receipt payload' });
        return;
      }

      try {
        await escalationAlertService.markDelivered(parsed.data.escalationId, user);
        reply({ status: 'OK' });
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 403) {
          await auditReceiptDenied(user, parsed.data.escalationId, (err as Error).message);
          reply({ status: 'FORBIDDEN', reason: (err as Error).message });
          return;
        }
        logger.error(
          { service: 'realtime-alerts', escalationId: parsed.data.escalationId, err },
          'Failed recording alert receipt',
        );
        reply({ status: 'ERROR', reason: statusCode === 404 ? 'Alert not found' : 'Server error' });
      }
    },
  );
}
