import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertStatePayload, SocketEvent } from '@lrms/shared';
import { useNotifications } from '../features/notifications/NotificationContext.js';
import { realtimeClient, RoomSubscriptionResponse } from '../services/realtime.js';

export { useNotifications };

/**
 * Subscribes to a server socket event for the lifetime of the component.
 */
export function useSocketEvent<T>(event: SocketEvent, handler: (payload: T) => void) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => realtimeClient.on<T>(event, (payload) => handlerRef.current(payload)), [event]);
}

/**
 * Reloads screen data when an alert changes state (REQ-7.9) and after a reconnect, so missed
 * events are caught up. Joins the admission and/or ward room that carries alert:state.
 */
export function useAlertStateRefresh(
  reload: () => void,
  scope: { admissionId?: string | null; wardId?: string | null },
) {
  useAdmissionRoom(scope.admissionId);
  useWardRoom(scope.wardId);

  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReload = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => reloadRef.current(), 250);
  }, []);

  useSocketEvent<AlertStatePayload>(SocketEvent.ALERT_STATE, (payload) => {
    if (scope.admissionId && payload.admissionId !== scope.admissionId) return;
    scheduleReload();
  });

  useEffect(() => {
    let wasConnected = realtimeClient.getStatus() === 'CONNECTED';
    const unsubscribe = realtimeClient.onStatusChange((status) => {
      const connected = status === 'CONNECTED';
      if (connected && !wasConnected) scheduleReload();
      wasConnected = connected;
    });
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleReload]);
}

/**
 * Hook to automatically subscribe a clinician's active socket session to an admission room
 * while viewing that patient episode, and leave upon unmounting.
 */
export function useAdmissionRoom(admissionId?: string | null) {
  const [subscriptionState, setSubscriptionState] = useState<RoomSubscriptionResponse | null>(null);

  useEffect(() => {
    if (!admissionId) return;

    const room = `admission:${admissionId}`;
    let isMounted = true;

    realtimeClient.joinRoom(room).then((res) => {
      if (isMounted) {
        setSubscriptionState(res);
      }
    });

    return () => {
      isMounted = false;
      realtimeClient.leaveRoom(room);
    };
  }, [admissionId]);

  return subscriptionState;
}

/**
 * Hook to subscribe to a ward room.
 */
export function useWardRoom(wardId?: string | null) {
  const [subscriptionState, setSubscriptionState] = useState<RoomSubscriptionResponse | null>(null);

  useEffect(() => {
    if (!wardId) return;

    const room = `ward:${wardId}`;
    let isMounted = true;

    realtimeClient.joinRoom(room).then((res) => {
      if (isMounted) {
        setSubscriptionState(res);
      }
    });

    return () => {
      isMounted = false;
      realtimeClient.leaveRoom(room);
    };
  }, [wardId]);

  return subscriptionState;
}
