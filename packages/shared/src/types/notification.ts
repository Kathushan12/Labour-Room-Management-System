import { NotificationPriority, NotificationType } from '../enums/index.js';

export interface NotificationDto {
  id: string;
  recipientUserId: string;
  outboxEventId?: string | null;
  notificationType: NotificationType;
  priority: NotificationPriority;
  title: string;
  safeMessage: string;
  resourceType: string;
  resourceId: string;
  admissionId?: string | null;
  readAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationDto[];
  total: number;
  unreadCount: number;
  nextCursor?: string | null;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
  emergencyCount: number;
  urgentCount: number;
}

export interface NotificationQueryFilters {
  priority?: NotificationPriority;
  notificationType?: NotificationType;
  unreadOnly?: boolean;
  limit?: number;
  cursor?: string;
  since?: string;
}

export interface SocketAuthPayload {
  token?: string;
}

export interface SocketAlertPayload {
  notificationId: string;
  eventType: NotificationType;
  priority: NotificationPriority;
  title: string;
  safeMessage: string;
  resourceType: string;
  resourceId: string;
  admissionId?: string | null;
  timestamp: string;
}

export interface RoomSubscriptionRequest {
  room: string;
}

export interface RoomSubscriptionResponse {
  room: string;
  status: 'JOINED' | 'LEFT' | 'DENIED';
  reason?: string;
}
