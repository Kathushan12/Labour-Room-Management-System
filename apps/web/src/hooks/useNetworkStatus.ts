import { useState, useEffect, useCallback } from 'react';
import { fetchHealthLive, fetchHealthReady } from '../services/api.js';

export interface NetworkStatusState {
  browserOnline: boolean;
  apiConnected: boolean;
  dbReady: boolean;
  dbLatencyMs: number | null;
  loading: boolean;
  lastChecked: Date | null;
  errorMessage: string | null;
}

export function useNetworkStatus(pollIntervalMs = 20000) {
  const [state, setState] = useState<NetworkStatusState>({
    browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    apiConnected: false,
    dbReady: false,
    dbLatencyMs: null,
    loading: true,
    lastChecked: null,
    errorMessage: null,
  });

  const checkStatus = useCallback(async () => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      setState((prev) => ({
        ...prev,
        browserOnline: false,
        apiConnected: false,
        dbReady: false,
        loading: false,
        lastChecked: new Date(),
        errorMessage: 'Browser reports offline / no network connectivity',
      }));
      return;
    }

    try {
      const [liveRes, readyRes] = await Promise.all([fetchHealthLive(), fetchHealthReady()]);

      const apiOk = liveRes.success && liveRes.data?.status === 'ok';
      const dbOk = readyRes.success && readyRes.data?.status === 'ready';
      const latency = readyRes.data?.database?.latencyMs ?? null;

      let error: string | null = null;
      if (!apiOk) {
        error = liveRes.error?.message || 'Backend API service is unreachable';
      } else if (!dbOk) {
        error = readyRes.error?.message || 'PostgreSQL database dependency is not ready';
      }

      setState({
        browserOnline: true,
        apiConnected: apiOk,
        dbReady: dbOk,
        dbLatencyMs: latency,
        loading: false,
        lastChecked: new Date(),
        errorMessage: error,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        apiConnected: false,
        dbReady: false,
        loading: false,
        lastChecked: new Date(),
        errorMessage: err instanceof Error ? err.message : 'Network failure during health probe',
      }));
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, browserOnline: true }));
      checkStatus();
    };

    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        browserOnline: false,
        apiConnected: false,
        dbReady: false,
        errorMessage: 'Network connection lost',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkStatus();

    const timer = setInterval(checkStatus, pollIntervalMs);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, [checkStatus, pollIntervalMs]);

  return { ...state, refresh: checkStatus };
}
