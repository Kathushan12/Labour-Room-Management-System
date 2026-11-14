import { io, Socket } from 'socket.io-client';
import { env } from '../config/env.js';
import { SocketEvent } from '@lrms/shared';

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
      if (!this.socket?.connected) {
        resolve({ status: 'DENIED', reason: 'Socket not connected' });
        return;
      }

      this.socket.emit(SocketEvent.JOIN_ROOM, { room }, (response: RoomSubscriptionResponse) => {
        if (response?.status === 'JOINED') {
          this.joinedRooms.add(room);
        }
        resolve(response);
      });
    });
  }

  /**
   * Leaves a room.
   */
  leaveRoom(room: string): Promise<RoomSubscriptionResponse> {
    return new Promise((resolve) => {
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
