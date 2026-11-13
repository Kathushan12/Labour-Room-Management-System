import React, { useState } from 'react';
import { PageHeader, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { PREVIEW_ADMISSIONS } from '../../mocks/ui-preview/preview-data.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import { AlertTriangle, CheckCircle2, BellRing, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FetalObservationRecord {
  id: string;
  timestamp: string;
  recordedBy: string;
  fetalHeartRateBpm: number;
  variability: string;
  accelerations: boolean;
  decelerations: string;
  liquorStatus: string;
}

const SAMPLE_FETAL_LOGS: FetalObservationRecord[] = [
  {
    id: 'fob-1',
    timestamp: '2026-11-11T09:10:00Z',
    recordedBy: 'Staff Midwife Silva',
    fetalHeartRateBpm: 104, // Bradycardia alert
    variability: '< 5 bpm (Reduced)',
    accelerations: false,
    decelerations: 'Late Decelerations',
    liquorStatus: 'Meconium-Stained (Grade 1)',
  },
  {
    id: 'fob-2',
    timestamp: '2026-11-11T08:40:00Z',
    recordedBy: 'Staff Midwife Silva',
    fetalHeartRateBpm: 128,
    variability: '5-25 bpm (Normal)',
    accelerations: true,
    decelerations: 'None',
    liquorStatus: 'Clear',
  },
  {
    id: 'fob-3',
    timestamp: '2026-11-11T08:10:00Z',
    recordedBy: 'Staff Midwife Silva',
    fetalHeartRateBpm: 136,
    variability: '5-25 bpm (Normal)',
    accelerations: true,
    decelerations: 'None',
    liquorStatus: 'Intact Membranes',
  },
];

export const FetalObservationsPage: React.FC = () => {
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(PREVIEW_ADMISSIONS[0].id);
  const [logs, setLogs] = useState(SAMPLE_FETAL_LOGS);

  // Form states
  const [fhr, setFhr] = useState('132');
  const [variability, setVariability] = useState('5-25 bpm (Normal)');
  const [accelerations] = useState(true);
  const [decelerations, setDecelerations] = useState('None');
  const [liquor, setLiquor] = useState('Clear');
  const [loggedSuccess, setLoggedSuccess] = useState(false);

  const selectedAdm =
    PREVIEW_ADMISSIONS.find((a) => a.id === selectedAdmissionId) || PREVIEW_ADMISSIONS[0];

  const handleLogObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: FetalObservationRecord = {
      id: `fob-${Date.now()}`,
      timestamp: new Date().toISOString(),
      recordedBy: 'Staff Midwife Silva (SLNC-55219)',
      fetalHeartRateBpm: Number(fhr),
      variability,
      accelerations,
      decelerations,
      liquorStatus: liquor,
    };
    setLogs([newEntry, ...logs]);
    setLoggedSuccess(true);
    setTimeout(() => setLoggedSuccess(false), 3000);
  };

  const isFhrAbnormal = Number(fhr) < 110 || Number(fhr) > 160 || decelerations !== 'None';

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Fetal Observations & Heart Rate Monitoring"
        description="Continuous and periodic monitoring of fetal heart rate (bpm), CTG baseline variability, decelerations, and liquor condition."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Fetal Vitals', active: true },
        ]}
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            CTG MONITORING
          </span>
        }
      />

      {/* Bed Selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Label className="text-xs font-semibold text-slate-700">Active Inpatient Bed</Label>
          <select
            value={selectedAdmissionId}
            onChange={(e) => setSelectedAdmissionId(e.target.value)}
            className="mt-1 w-full sm:w-80 h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {PREVIEW_ADMISSIONS.map((adm) => (
              <option key={adm.id} value={adm.id}>
                {adm.bedNumber} — {adm.referenceId} ({adm.patientPlaceholder})
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-600 sm:text-right">
          <span className="font-semibold text-slate-800">Normal Baseline: </span>
          <span className="font-bold text-teal-800">110 – 160 bpm</span>
          <div className="text-[11px] text-slate-500">
            Values outside baseline trigger immediate clinical escalation protocol.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <div className="lg:col-span-1">
          <SectionCard
            title="Log Fetal Observation"
            description="Recorded into electronic partogram"
          >
            <form onSubmit={handleLogObservation} className="space-y-4 text-xs">
              {loggedSuccess && (
                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Fetal observation recorded successfully.</span>
                </div>
              )}

              {/* FHR in BPM */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Fetal Heart Rate (bpm)
                  </Label>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Unit: BPM</span>
                </div>
                <Input
                  type="number"
                  min="50"
                  max="240"
                  value={fhr}
                  onChange={(e) => setFhr(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              {/* Abnormal Flag Notice */}
              {isFhrAbnormal && (
                <div className="p-2 rounded bg-red-50 border border-red-200 text-red-900 text-[11px] flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Abnormal Fetal Parameters: </span>
                    <span>Values suggest fetal distress. Consider escalating doctor alert.</span>
                  </div>
                </div>
              )}

              {/* Variability */}
              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Baseline Variability
                </Label>
                <select
                  value={variability}
                  onChange={(e) => setVariability(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="5-25 bpm (Normal)">5-25 bpm (Normal)</option>
                  <option value="< 5 bpm (Reduced)">&lt; 5 bpm (Reduced / Abnormal)</option>
                  <option value="> 25 bpm (Marked)">&gt; 25 bpm (Marked / Saltatory)</option>
                </select>
              </div>

              {/* Decelerations */}
              <div>
                <Label className="text-[11px] font-semibold text-slate-700">Decelerations</Label>
                <select
                  value={decelerations}
                  onChange={(e) => setDecelerations(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="None">None</option>
                  <option value="Early Decelerations">Early Decelerations</option>
                  <option value="Variable Decelerations">Variable Decelerations</option>
                  <option value="Late Decelerations">Late Decelerations (Pathological)</option>
                  <option value="Prolonged Deceleration">Prolonged Deceleration</option>
                </select>
              </div>

              {/* Liquor Status */}
              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Amniotic Fluid / Liquor
                </Label>
                <select
                  value={liquor}
                  onChange={(e) => setLiquor(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Intact Membranes">Intact Membranes</option>
                  <option value="Clear">Clear Liquor</option>
                  <option value="Meconium-Stained (Grade 1)">Meconium-Stained (Grade 1)</option>
                  <option value="Meconium-Stained (Grade 2/3)">
                    Meconium-Stained (Grade 2/3 - Thick)
                  </option>
                  <option value="Blood-Stained">Blood-Stained Liquor</option>
                </select>
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs h-9"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Record Fetal Vitals
              </Button>

              {isFhrAbnormal && (
                <Link to="/alerts" className="block pt-1">
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full text-xs h-9 font-semibold"
                  >
                    <BellRing className="w-4 h-4 mr-1.5" />
                    Escalate Emergency Doctor Alert
                  </Button>
                </Link>
              )}
            </form>
          </SectionCard>
        </div>

        {/* Fetal Observation Timeline Table */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Fetal Observation Log"
            description={`Sequential CTG observations for ${selectedAdm.referenceId} (${selectedAdm.bedNumber})`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="pb-2.5">Time</th>
                    <th className="pb-2.5">FHR (bpm)</th>
                    <th className="pb-2.5">Variability</th>
                    <th className="pb-2.5">Decelerations</th>
                    <th className="pb-2.5">Liquor</th>
                    <th className="pb-2.5">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((obs) => {
                    const isAbnormal =
                      obs.fetalHeartRateBpm < 110 ||
                      obs.fetalHeartRateBpm > 160 ||
                      obs.decelerations.includes('Late');
                    return (
                      <tr key={obs.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono text-slate-600">
                          {new Date(obs.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3">
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded ${
                              isAbnormal
                                ? 'bg-red-100 text-red-900 border border-red-300'
                                : 'text-slate-900 bg-slate-100'
                            }`}
                          >
                            {obs.fetalHeartRateBpm} bpm
                          </span>
                        </td>
                        <td className="py-3 text-slate-700">{obs.variability}</td>
                        <td className="py-3">
                          <span
                            className={`font-medium ${
                              obs.decelerations.includes('Late')
                                ? 'text-red-700 font-bold'
                                : 'text-slate-700'
                            }`}
                          >
                            {obs.decelerations}
                          </span>
                        </td>
                        <td className="py-3 text-slate-700">{obs.liquorStatus}</td>
                        <td className="py-3 text-[11px] text-slate-500">{obs.recordedBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
