import React, { useEffect, useState } from 'react';
import { fetchHealthLive, fetchHealthReady } from '../services/api.js';
import { HealthLiveResponse, HealthReadyResponse } from '@lrms/shared';
import { CheckCircle2, XCircle, RefreshCw, Activity, Database, Server, Laptop } from 'lucide-react';

export const DevStatusCard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [liveData, setLiveData] = useState<HealthLiveResponse | null>(null);
  const [readyData, setReadyData] = useState<HealthReadyResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  const checkStatus = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [liveRes, readyRes] = await Promise.all([fetchHealthLive(), fetchHealthReady()]);

      if (liveRes.success && liveRes.data) {
        setLiveData(liveRes.data);
      } else {
        setLiveData(null);
        setApiError(liveRes.error?.message || 'API Liveness check failed');
      }

      if (readyRes.success && readyRes.data) {
        setReadyData(readyRes.data);
      } else {
        setReadyData(readyRes.data || null);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unknown network failure');
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-teal-400" />
          <h2 className="font-semibold text-base tracking-wide">Environment Service Status</h2>
        </div>
        <button
          onClick={checkStatus}
          disabled={loading}
          className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-3 py-1.5 rounded-md border border-slate-700 transition"
          title="Refresh health checks"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Frontend Status */}
        <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-start space-x-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Laptop className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Frontend Status
              </span>
              <span className="inline-flex items-center text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Active
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-1">Vite + React 18</p>
            <p className="text-xs text-slate-500 mt-0.5">Client bundle initialized</p>
          </div>
        </div>

        {/* Backend API Status */}
        <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-start space-x-3">
          <div
            className={`p-2 rounded-lg ${
              liveData ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            <Server className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Backend API Status
              </span>
              {liveData ? (
                <span className="inline-flex items-center text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Online
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium text-red-700">
                  <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" /> Offline
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {liveData ? `Express API (Uptime: ${liveData.uptimeSeconds}s)` : 'Unreachable'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {liveData ? 'GET /api/v1/health/live (200 OK)' : apiError || 'Connection refused'}
            </p>
          </div>
        </div>

        {/* Database Connection Status */}
        <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-start space-x-3">
          <div
            className={`p-2 rounded-lg ${
              readyData?.database?.connected
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Database Status
              </span>
              {readyData?.database?.connected ? (
                <span className="inline-flex items-center text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium text-amber-700">
                  <XCircle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Disconnected
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-1">PostgreSQL 16</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {readyData?.database?.connected
                ? `Active query ping: ${readyData.database.latencyMs}ms`
                : readyData?.database?.error || 'Awaiting database connectivity'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border-t border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs text-slate-500">
        <span>Verified via real backend health and PostgreSQL query probes</span>
        <span>Last checked: {lastChecked || 'Checking...'}</span>
      </div>
    </div>
  );
};
