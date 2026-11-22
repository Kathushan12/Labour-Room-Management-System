import { io, Socket } from 'socket.io-client';
import { env } from '../config/env.js';
import { SocketEvent } from '@lrms/shared';

type SocketHandler = (...args: unknown[]) => void;

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface RoomSubscriptionResponse {
  status: 'JOINED' | 'DENIED' | 'LEFT';
  room?: string;
  reason?: string;
}

class RealtimeClient {
  private socket: Socket | null = null;
  private currentStatus: ConnectionStatus = 'DISCONNECTED';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private joinedRooms: Set<string> = new Set();
  // Kept across socket instances so listeners exist before the first server event arrives.
  private eventHandlers: Map<string, Set<SocketHandler>> = new Map();

  /**
   * Initializes the WebSocket connection using an access token.
   */
  connect(accessToken: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    const socketUrl = env.API_BASE_URL.replace(/\/api\/v1\/?$/, '');

    this.updateStatus('CONNECTING');

    this.socket = io(socketUrl, {
      path: '/socket.io',
      auth: {
        token: `Bearer ${accessToken}`,
      },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    for (const [event, handlers] of this.eventHandlers) {
      for (const handler of handlers) this.socket.on(event, handler);
    }

    this.socket.on('connect', () => {
      this.updateStatus('CONNECTED');
      // Re-join any previously tracked rooms upon reconnect
      for (const room of this.joinedRooms) {
        this.socket?.emit(SocketEvent.JOIN_ROOM, { room });
      }
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Server revoked session or kicked client - do not reconnect automatically
        this.updateStatus('DISCONNECTED');
      } else {
        this.updateStatus('RECONNECTING');
      }
    });

    this.socket.on('connect_error', () => {
      this.updateStatus('DISCONNECTED');
    });

    return this.socket;
  }

  /**
   * Disconnects the socket and clears state.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedRooms.clear();
    this.updateStatus('DISCONNECTED');
  }

  /**
   * Joins a room with acknowledgment callback.
   */
  joinRoom(room: string): Promise<RoomSubscriptionResponse> {
    return new Promise((resolve) => {
      // Remember the room so it is joined on (re)connect even if requested before connecting.
      this.joinedRooms.add(room);
      if (!this.socket?.connected) {
        resolve({ status: 'DENIED', reason: 'Socket not connected; will join on connect' });
        return;
      }

      this.socket.emit(SocketEvent.JOIN_ROOM, { room }, (response: RoomSubscriptionResponse) => {
        if (response?.status !== 'JOINED') {
          this.joinedRooms.delete(room);
        }
        resolve(response);
      });
    });
  }

  /**
   * Subscribes to a server event on the current and any future socket.
   */
  on<T>(event: SocketEvent, handler: (payload: T) => void): () => void {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    const listener = handler as SocketHandler;
    handlers.add(listener);
    this.socket?.on(event, listener);
    return () => {
      handlers.delete(listener);
      this.socket?.off(event, listener);
    };
  }

  /**
   * Emits an event and waits for the server's acknowledgement (null on timeout or offline).
   */
  emitWithAck<T>(event: SocketEvent, payload: unknown, timeoutMs = 5000): Promise<T | null> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(null);
        return;
      }
      this.socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, response: T) => {
        resolve(err ? null : response);
      });
    });
  }

  /**
   * Leaves a room.
   */
  leaveRoom(room: string): Promise<RoomSubscriptionResponse> {
    return new Promise((resolve) => {
      this.joinedRooms.delete(room);
      if (!this.socket?.connected) {
        resolve({ status: 'LEFT', room });
        return;
      }

      this.socket.emit(SocketEvent.LEAVE_ROOM, { room }, (response: RoomSubscriptionResponse) => {
        this.joinedRooms.delete(room);
        resolve(response);
      });
    });
  }

  /**
   * Registers a listener for connection status changes.
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  private updateStatus(status: ConnectionStatus): void {
    this.currentStatus = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch {
        // Ignore listener error
      }
    }
  }
}

export const realtimeClient = new RealtimeClient();
