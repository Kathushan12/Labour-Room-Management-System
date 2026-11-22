import { IsNull } from 'typeorm';
import { Socket } from 'socket.io';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../config/database.js';
import {
  AuditLog,
  EmergencyOverride,
  PatientStaffAssignment,
  StaffWardAssignment,
} from '../../database/entities/index.js';
import { UserRole } from '@lrms/shared';
import { logger } from '../../common/logging/logger.js';

export interface RoomAuthResult {
  allowed: boolean;
  reason?: string;
}

export async function authorizeRoomJoin(user: RequestUser, room: string): Promise<RoomAuthResult> {
  const parts = room.split(':');
  if (parts.length !== 2) {
    return { allowed: false, reason: 'Invalid room format. Expected type:id' };
  }

  const [type, id] = parts;

  // 1. User Room: only own user ID allowed
  if (type === 'user') {
    if (id === user.id) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Cannot subscribe to another user personal room' };
  }

  // 2. Ward Room: operational ward-level alerts
  if (type === 'ward') {
    // Admins can join ward operational rooms for bed board & operational metrics
    if (user.role === UserRole.ADMIN) {
      return { allowed: true };
    }

    // Clinicians must be assigned to this ward
    const wardAssignment = await AppDataSource.getRepository(StaffWardAssignment).findOne({
      where: {
        userId: user.id,
        wardId: id,
        isActive: true,
      },
    });

    if (wardAssignment && !wardAssignment.endedAt) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'You do not hold an active assignment to this ward' };
  }

  // 3. Admission Room: individual patient clinical room
  if (type === 'admission') {
    // Caldicott Data Protection: Administrators are strictly excluded from patient clinical rooms
    if (user.role === UserRole.ADMIN) {
      return {
        allowed: false,
        reason:
          'Administrators are restricted from subscribing to patient-identifiable clinical rooms',
      };
    }

    // Clinician must be a DOCTOR or NURSE_STAFF
    if (user.role !== UserRole.DOCTOR && user.role !== UserRole.NURSE_STAFF) {
      return { allowed: false, reason: 'Clinical role required for admission room subscription' };
    }

    // Check active direct staff assignment
    const activeAssignment = await AppDataSource.getRepository(PatientStaffAssignment).findOne({
      where: {
        admissionId: id,
        staffId: user.id,
        unassignedAt: IsNull(),
      },
    });

    if (activeAssignment) {
      return { allowed: true };
    }

    // Check active unexpired break-glass emergency override
    const activeOverride = await AppDataSource.getRepository(EmergencyOverride)
      .createQueryBuilder('eo')
      .where('eo.admissionId = :admissionId', { admissionId: id })
      .andWhere('eo.staffId = :staffId', { staffId: user.id })
      .andWhere('eo.revokedAt IS NULL')
      .andWhere('(eo.expiresAt IS NULL OR eo.expiresAt > :now)', { now: new Date() })
      .getOne();

    if (activeOverride) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason:
        'Patient authorization required (active staff assignment or unexpired emergency override)',
    };
  }

  return { allowed: false, reason: `Unknown room type: ${type}` };
}

export async function handleRoomJoin(
  socket: Socket,
  room: string,
): Promise<{ status: string; reason?: string }> {
  const user = socket.data.user as RequestUser;
  if (!user) {
    return { status: 'DENIED', reason: 'Unauthenticated socket' };
  }

  const auth = await authorizeRoomJoin(user, room);
  if (!auth.allowed) {
    await logRoomAudit(
      socket,
      user.id,
      room,
      'SOCKET_SUBSCRIPTION_DENIED',
      auth.reason || 'Unauthorized',
    );
    return { status: 'DENIED', reason: auth.reason };
  }

  socket.join(room);
  await logRoomAudit(
    socket,
    user.id,
    room,
    'SOCKET_SUBSCRIPTION_GRANTED',
    'Room subscription approved',
  );

  logger.debug({ service: 'socket-rooms', userId: user.id, room }, 'Socket joined room');
  return { status: 'JOINED' };
}

export async function handleRoomLeave(socket: Socket, room: string): Promise<{ status: string }> {
  socket.leave(room);
  logger.debug({ service: 'socket-rooms', socketId: socket.id, room }, 'Socket left room');
  return { status: 'LEFT' };
}

async function logRoomAudit(
  socket: Socket,
  userId: string,
  room: string,
  action: string,
  reason: string,
): Promise<void> {
  try {
    const auditRepo = AppDataSource.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        userId,
        action,
        entityName: 'SocketRoom',
        entityId: room,
        ipAddress: socket.handshake.address || null,
        details: {
          socketId: socket.id,
          room,
          reason,
        },
      }),
    );
  } catch {
    // Non-blocking
  }
}
