import React, { useState, useEffect } from 'react';
import { useClinicalDashboardData } from '../dashboard/useClinicalDashboardData.js';
import { PatientHeader } from '../../components/shared/PatientHeader.js';
import { PageHeader } from '../../components/shared/HeadersAndCards.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import { ClinicalObservationPanel } from './components/ClinicalObservationPanel.js';
import { Activity, Loader2, UserCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button.js';
import { humanizeEnum } from '../../lib/labels.js';

export const FetalObservationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { admissions, loading, error } = useClinicalDashboardData();
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>('');

  useEffect(() => {
    if (!selectedAdmissionId && admissions.length > 0) setSelectedAdmissionId(admissions[0].id);
  }, [admissions, selectedAdmissionId]);

  const selectedAdm = admissions.find((a) => a.id === selectedAdmissionId);

  return (
    <div className="space-y-6 p-4 pt-0 sm:p-6 sm:pt-0 lg:p-8 lg:pt-0">
      {selectedAdm && (
        <PatientHeader refId={selectedAdm.admissionReferenceId} bedNumber={selectedAdm.bedNumber} />
      )}
      <PageHeader
        title="Fetal Observations & Heart Rate Monitoring"
        description="Structured periodic assessment of fetal heart rate baseline, variability, decelerations, and liquor characteristics."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Fetal Monitoring', active: true },
        ]}
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            CTG SURVEILLANCE
          </span>
        }
      />

      {error && <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs">{error}</div>}

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-700" />
          <span>Loading inpatient admissions...</span>
        </div>
      ) : admissions.length === 0 ? (
        <EmptyState
          title="No Active Inpatients"
          description="Admit a patient first, then come back here to record observations."
          actionLabel="Go to Admissions"
          onAction={() => navigate('/admissions')}
        />
      ) : (
        <div className="space-y-6">
          {/* Patient Selector Ribbon */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="fetal-patient-select"
                  className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] block"
                >
                  Select Active Inpatient
                </label>
                <select
                  id="fetal-patient-select"
                  aria-label="Select Active Inpatient"
                  value={selectedAdmissionId}
                  onChange={(e) => setSelectedAdmissionId(e.target.value)}
                  className="w-full min-w-0 max-w-full truncate font-bold text-slate-900 bg-transparent border-0 border-b border-indigo-500 focus:ring-0 focus:border-indigo-700 text-sm py-0.5 pr-8 pl-0 cursor-pointer"
                >
                  {admissions.map((adm) => (
                    <option key={adm.id} value={adm.id}>
                      {adm.admissionReferenceId} · {adm.bedNumber ?? 'No bed'} ({humanizeEnum(adm.admissionCategory)})
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
                    <UserCheck className="w-3.5 h-3.5 mr-1 text-indigo-700" />
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
