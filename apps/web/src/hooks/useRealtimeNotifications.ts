import { useEffect, useState } from 'react';
import { useNotifications } from '../features/notifications/NotificationContext.js';
import { realtimeClient, RoomSubscriptionResponse } from '../services/realtime.js';

export { useNotifications };

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
