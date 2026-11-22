import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  NotificationDto,
  NotificationPriority,
  NotificationType,
  NotificationUnreadCountResponse,
  SocketEvent,
  UserRole,
} from '@lrms/shared';
import { notificationsApi } from '../../services/notifications.api.js';
import { realtimeClient, ConnectionStatus } from '../../services/realtime.js';
import { useAuth } from '../../hooks/useAuth.js';
import { playAlertTone } from '../../lib/alert-sound.js';

const DOCTOR_OVERLAY_NOTIFICATION_TYPES: NotificationType[] = [
  NotificationType.CLINICAL_ESCALATION_CREATED,
  NotificationType.CLINICAL_ESCALATION_ASSIGNED,
];

interface NotificationContextType {
  notifications: NotificationDto[];
  unreadCounts: NotificationUnreadCountResponse;
  activeEmergency: NotificationDto | null;
  activeToast: NotificationDto | null;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  dismissEmergencyBanner: () => void;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, role, accessToken } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<NotificationUnreadCountResponse>({
    unreadCount: 0,
    emergencyCount: 0,
    urgentCount: 0,
  });
  const [activeEmergency, setActiveEmergency] = useState<NotificationDto | null>(null);
  const [activeToast, setActiveToast] = useState<NotificationDto | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    realtimeClient.getStatus(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playAlertSound = useCallback((priority: NotificationPriority) => {
    playAlertTone(priority === NotificationPriority.EMERGENCY);
  }, []);

  // Doctors get escalation alerts through the full-screen DoctorAlertOverlay instead.
  const isOverlayAlert = useCallback(
    (n: NotificationDto) =>
      role === UserRole.DOCTOR && DOCTOR_OVERLAY_NOTIFICATION_TYPES.includes(n.notificationType),
    [role],
  );

  // Fetch initial notifications and unread counts from REST API
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.getNotifications({ limit: 50 }),
        notificationsApi.getUnreadCount(),
      ]);
      setNotifications(listRes.items || []);
      setUnreadCounts(countRes);

      // Check for unread emergency in initial load to display banner
      const pendingEmergency = listRes.items?.find(
        (n) => n.priority === NotificationPriority.EMERGENCY && !n.readAt && !isOverlayAlert(n),
      );
      if (pendingEmergency) {
        setActiveEmergency(pendingEmergency);
      }
    } catch {
      // Offline or network error handled gracefully
    } finally {
      setIsLoading(false);
    }
  }, [user, isOverlayAlert]);

  // Connect socket when user is authenticated with access token
  useEffect(() => {
    if (!user || !accessToken) {
      realtimeClient.disconnect();
      setNotifications([]);
      setUnreadCounts({ unreadCount: 0, emergencyCount: 0, urgentCount: 0 });
      setActiveEmergency(null);
      setActiveToast(null);
      return;
    }

    // Subscribe to status changes
    const unsubStatus = realtimeClient.onStatusChange((status) => {
      setConnectionStatus(status);
      if (status === 'CONNECTED') {
        // Resync notifications when reconnected
        refreshNotifications();
      }
    });

    const socket = realtimeClient.connect(accessToken);

    // Handler for new notification
    const handleNewNotification = (data: NotificationDto) => {
      setNotifications((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n.id === data.id)) return prev;
        return [data, ...prev];
      });

      setUnreadCounts((prev) => ({
        unreadCount: prev.unreadCount + 1,
        emergencyCount:
          data.priority === NotificationPriority.EMERGENCY
            ? prev.emergencyCount + 1
            : prev.emergencyCount,
        urgentCount:
          data.priority === NotificationPriority.URGENT ? prev.urgentCount + 1 : prev.urgentCount,
      }));

      if (isOverlayAlert(data)) return;

      playAlertSound(data.priority);

      // Set emergency banner if priority is EMERGENCY
      if (data.priority === NotificationPriority.EMERGENCY) {
        setActiveEmergency(data);
      } else if (data.priority === NotificationPriority.URGENT) {
        // Show escalation toast for 8 seconds
        setActiveToast(data);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setActiveToast(null);
        }, 8000);
      }
    };

    socket.on(SocketEvent.NOTIFICATION_NEW, handleNewNotification);

    // Initial fetch
    refreshNotifications();

    return () => {
      unsubStatus();
      socket.off(SocketEvent.NOTIFICATION_NEW, handleNewNotification);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [user, accessToken, refreshNotifications, playAlertSound, isOverlayAlert]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (id: string) => {
      // Optimistic UI update
      const target = notifications.find((n) => n.id === id);
      if (!target || target.readAt) return;

      const readAtIso = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: readAtIso } : n)));

      setUnreadCounts((prev) => ({
        unreadCount: Math.max(0, prev.unreadCount - 1),
        emergencyCount:
          target.priority === NotificationPriority.EMERGENCY
            ? Math.max(0, prev.emergencyCount - 1)
            : prev.emergencyCount,
        urgentCount:
          target.priority === NotificationPriority.URGENT
            ? Math.max(0, prev.urgentCount - 1)
            : prev.urgentCount,
      }));

      if (activeEmergency?.id === id) {
        setActiveEmergency(null);
      }
      if (activeToast?.id === id) {
        setActiveToast(null);
      }

      try {
        await notificationsApi.markAsRead(id);
      } catch {
        // Revert if API failed
        refreshNotifications();
      }
    },
    [notifications, activeEmergency, activeToast, refreshNotifications],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const readAtIso = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || readAtIso })));
    setUnreadCounts({ unreadCount: 0, emergencyCount: 0, urgentCount: 0 });
    setActiveEmergency(null);
    setActiveToast(null);

    try {
      await notificationsApi.markAllAsRead();
    } catch {
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const dismissEmergencyBanner = useCallback(() => {
    setActiveEmergency(null);
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCounts,
        activeEmergency,
        activeToast,
        connectionStatus,
        isLoading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        dismissEmergencyBanner,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notifications: [],
      unreadCounts: { unreadCount: 0, emergencyCount: 0, urgentCount: 0 },
      activeEmergency: null,
      activeToast: null,
      connectionStatus: 'DISCONNECTED',
      isLoading: false,
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      refreshNotifications: async () => {},
      dismissEmergencyBanner: () => {},
      dismissToast: () => {},
    };
  }
  return context;
}
