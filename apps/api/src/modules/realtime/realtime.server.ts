import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../../config/env.js';
import { authenticateSocket } from './realtime.auth.js';
import { handleRoomJoin, handleRoomLeave } from './realtime.rooms.js';
import { registerAlertHandlers } from './alert-socket.handlers.js';
import { SocketEvent } from '@lrms/shared';
import { logger } from '../../common/logging/logger.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';

let io: SocketIOServer | null = null;

export function initRealtimeServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: env.WEB_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling'],
  });

  // Attach authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as RequestUser;
    logger.info(
      { service: 'realtime-server', socketId: socket.id, userId: user?.id, role: user?.role },
      'Authenticated client connected',
    );

    // Auto-join personal user room
    if (user?.id) {
      socket.join(`user:${user.id}`);
    }

    // Acknowledge connection
    socket.emit(SocketEvent.CONNECTION_READY, {
      socketId: socket.id,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });

    // Handle room join requests
    socket.on(
      SocketEvent.JOIN_ROOM,
      async (payload: { room: string }, callback?: (res: any) => void) => {
        try {
          const result = await handleRoomJoin(socket, payload.room);
          if (callback) callback(result);
        } catch (err) {
          if (callback) callback({ status: 'ERROR', reason: (err as Error).message });
        }
      },
    );

    // Handle room leave requests
    socket.on(
      SocketEvent.LEAVE_ROOM,
      async (payload: { room: string }, callback?: (res: any) => void) => {
        try {
          const result = await handleRoomLeave(socket, payload.room);
          if (callback) callback(result);
        } catch (err) {
          if (callback) callback({ status: 'ERROR', reason: (err as Error).message });
        }
      },
    );

    registerAlertHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info(
        { service: 'realtime-server', socketId: socket.id, userId: user?.id, reason },
        'Client disconnected',
      );
    });
  });

  logger.info({ service: 'realtime-server' }, 'Socket.IO real-time server initialized');
  return io;
}

export function getRealtimeServer(): SocketIOServer | null {
  return io;
}

export async function closeRealtimeServer(): Promise<void> {
  if (io) {
    await new Promise<void>((resolve) => {
      io!.close(() => {
        resolve();
      });
    });
    io = null;
    logger.info({ service: 'realtime-server' }, 'Socket.IO real-time server closed');
  }
}

export function emitToUser(userId: string, event: SocketEvent, payload: unknown): boolean {
  if (!io) return false;
  io.to(`user:${userId}`).emit(event, payload);
  return true;
}

export async function isUserOnline(userId: string): Promise<boolean> {
  if (!io) return false;
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length > 0;
}

export function emitToAdmission(
  admissionId: string,
  event: SocketEvent,
  payload: unknown,
): boolean {
  if (!io) return false;
  io.to(`admission:${admissionId}`).emit(event, payload);
  return true;
}

export function emitToWard(wardId: string, event: SocketEvent, payload: unknown): boolean {
  if (!io) return false;
  io.to(`ward:${wardId}`).emit(event, payload);
  return true;
}

/**
 * Forcibly disconnects all active socket connections belonging to a user
 * (e.g., when their session is revoked or account is deactivated).
 */
export async function disconnectUserSessions(userId: string): Promise<number> {
  if (!io) return 0;
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  let count = 0;
  for (const s of sockets) {
    s.disconnect(true);
    count++;
  }
  logger.info(
    { service: 'realtime-server', userId, disconnectedSockets: count },
    'Disconnected user socket sessions',
  );
  return count;
}
