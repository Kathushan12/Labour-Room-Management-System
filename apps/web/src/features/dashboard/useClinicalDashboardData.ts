import { useCallback, useEffect, useState } from 'react';
import {
  AdmissionStatus,
  AdmissionSummaryDto,
  BedBoardSummaryDto,
  EscalationFeedItemDto,
} from '@lrms/shared';
import { fetchAdmissions } from '../../services/admissions.api.js';
import { fetchWardBedBoard } from '../../services/wards.api.js';
import { clinicalCareApi } from '../../services/clinical-care.api.js';
import { useActiveWard } from '../../hooks/useActiveWard.js';

export interface DashboardAdmission extends AdmissionSummaryDto {
  bedNumber: string | null;
}

export interface ClinicalDashboardData {
  admissions: DashboardAdmission[];
  bedBoard: BedBoardSummaryDto | null;
  alerts: EscalationFeedItemDto[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// The admissions list is row-scoped by the API to the signed-in clinician's active assignments.
export function useClinicalDashboardData(): ClinicalDashboardData {
  const { ward, loading: wardLoading } = useActiveWard();
  const [admissions, setAdmissions] = useState<DashboardAdmission[]>([]);
  const [bedBoard, setBedBoard] = useState<BedBoardSummaryDto | null>(null);
  const [alerts, setAlerts] = useState<EscalationFeedItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [admissionsRes, boardRes, alertsRes] = await Promise.all([
        fetchAdmissions({ status: AdmissionStatus.ADMITTED, limit: 50 }),
        ward ? fetchWardBedBoard(ward.id) : Promise.resolve(null),
        clinicalCareApi.getVisibleEscalations().catch(() => [] as EscalationFeedItemDto[]),
      ]);

      if (!admissionsRes.success || !admissionsRes.data) {
        setError(admissionsRes.error?.message || 'Could not load admissions.');
        return;
      }

      const board = boardRes && boardRes.success && boardRes.data ? boardRes.data : null;
      const bedByAdmission = new Map<string, string>();
      for (const bed of board?.beds ?? []) {
        if (bed.currentAllocation) {
          bedByAdmission.set(bed.currentAllocation.admissionId, bed.bedNumber);
        }
      }

      setAdmissions(
        admissionsRes.data.items.map((a) => ({
          ...a,
          bedNumber: bedByAdmission.get(a.id) ?? null,
        })),
      );
      setBedBoard(board);
      setAlerts(alertsRes);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [ward]);

  useEffect(() => {
    if (!wardLoading) void load();
  }, [wardLoading, load]);

  return { admissions, bedBoard, alerts, loading, error, reload: load };
}
