import { apiFetch } from './api.js';
import {
  NotificationDto,
  NotificationListResponse,
  NotificationQueryFilters,
  NotificationUnreadCountResponse,
} from '@lrms/shared';

export const notificationsApi = {
  /**
   * Fetches the inbox notifications for the authenticated clinician.
   */
  async getNotifications(filters?: NotificationQueryFilters): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.notificationType) params.append('notificationType', filters.notificationType);
    if (filters?.unreadOnly) params.append('unreadOnly', 'true');
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.cursor) params.append('cursor', filters.cursor);
    if (filters?.since) params.append('since', filters.since);

    const qs = params.toString();
    const endpoint = `/notifications${qs ? `?${qs}` : ''}`;
    const res = await apiFetch<NotificationListResponse>(endpoint, { method: 'GET' });
    if (!res.data) throw new Error(res.error?.message || 'Failed to fetch notifications');
    return res.data;
  },

  /**
   * Retrieves unread notification count breakdown.
   */
  async getUnreadCount(): Promise<NotificationUnreadCountResponse> {
    const res = await apiFetch<NotificationUnreadCountResponse>('/notifications/unread-count', {
      method: 'GET',
    });
    if (!res.data) throw new Error(res.error?.message || 'Failed to fetch unread count');
    return res.data;
  },

  /**
   * Retrieves a single notification by ID.
   */
  async getNotificationById(id: string): Promise<NotificationDto> {
    const res = await apiFetch<NotificationDto>(`/notifications/${id}`, { method: 'GET' });
    if (!res.data) throw new Error(res.error?.message || 'Failed to fetch notification');
    return res.data;
  },

  /**
   * Marks a single notification as read.
   * NOTE: This marks the notification as read in the user's inbox;
   * it NEVER constitutes clinical acknowledgement of an emergency or escalation.
   */
  async markAsRead(id: string): Promise<NotificationDto> {
    const res = await apiFetch<NotificationDto>(`/notifications/${id}/read`, { method: 'PATCH' });
    if (!res.data) throw new Error(res.error?.message || 'Failed to mark notification as read');
    return res.data;
  },

  /**
   * Marks all unread notifications for the user as read.
   */
  async markAllAsRead(): Promise<{ count: number }> {
    const res = await apiFetch<{ count: number }>('/notifications/read-all', { method: 'POST' });
    if (!res.data) throw new Error(res.error?.message || 'Failed to mark all as read');
    return res.data;
  },
};
