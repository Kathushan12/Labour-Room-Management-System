export interface HealthLiveResponse {
  status: 'ok';
  service: 'lrms-api';
  timestamp: string;
  uptimeSeconds: number;
}

export interface DatabaseStatus {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

export interface HealthReadyResponse {
  status: 'ready' | 'not_ready';
  service: 'lrms-api';
  timestamp: string;
  database: DatabaseStatus;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
