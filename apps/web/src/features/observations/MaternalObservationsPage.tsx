import React, { useState, useEffect } from 'react';
import { AdmissionStatus, AdmissionSummaryDto } from '@lrms/shared';
import { fetchAdmissions } from '../../services/admissions.api.js';
import { PageHeader } from '../../components/shared/HeadersAndCards.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import { ClinicalObservationPanel } from './components/ClinicalObservationPanel.js';
import { HeartPulse, Loader2, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button.js';
import { humanizeEnum } from '../../lib/labels.js';

export const MaternalObservationsPage: React.FC = () => {
  const [admissions, setAdmissions] = useState<AdmissionSummaryDto[]>([]);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAdmissions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAdmissions({ status: AdmissionStatus.ADMITTED, limit: 50 });
        if (isMounted) {
          if (res.success && res.data?.items) {
            setAdmissions(res.data.items);
            if (res.data.items.length > 0) {
              setSelectedAdmissionId(res.data.items[0].id);
            }
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load active admissions');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAdmissions();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedAdm = admissions.find((a) => a.id === selectedAdmissionId);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Maternal Observations & Vitals"
        description="Routine recording of maternal blood pressure, pulse, temperature, blood glucose, and clinical vitals."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Maternal Vitals', active: true },
        ]}
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            WARD 18 SURVEILLANCE
          </span>
        }
      />

      {error && <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs">{error}</div>}

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
          <span>Loading inpatient admissions...</span>
        </div>
      ) : admissions.length === 0 ? (
        <EmptyState
          title="No Active Inpatients"
          description="There are currently no active patient admissions in Ward 18 to record maternal observations for."
          actionLabel="Go to Admissions"
          onAction={() => {}}
        />
      ) : (
        <div className="space-y-6">
          {/* Patient / Admission Selector Ribbon */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <label
                  htmlFor="maternal-patient-select"
                  className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] block"
                >
                  Select Active Inpatient
                </label>
                <select
                  id="maternal-patient-select"
                  aria-label="Select Active Inpatient"
                  value={selectedAdmissionId}
                  onChange={(e) => setSelectedAdmissionId(e.target.value)}
                  className="font-bold text-slate-900 bg-transparent border-0 border-b border-teal-500 focus:ring-0 focus:border-teal-700 text-sm py-0.5 pr-8 pl-0 cursor-pointer"
                >
                  {admissions.map((adm) => (
                    <option key={adm.id} value={adm.id}>
                      {adm.admissionReferenceId} ({humanizeEnum(adm.admissionCategory)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedAdm && (
              <div className="flex items-center space-x-2">
                <Link to={`/admissions/${selectedAdm.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2.5 border-slate-300"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1 text-teal-700" />
                    View Admission File
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Embedded Live Observations Panel */}
          {selectedAdmissionId && <ClinicalObservationPanel admissionId={selectedAdmissionId} />}
        </div>
      )}
    </div>
  );
};
