import React, { useState } from 'react';
import { PageHeader, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { PREVIEW_ADMISSIONS } from '../../mocks/ui-preview/preview-data.js';
import { GlucoseUnit } from '@lrms/shared';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import { PlusCircle, CheckCircle2 } from 'lucide-react';

interface MaternalObservationRecord {
  id: string;
  timestamp: string;
  recordedBy: string;
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  temperatureC: number;
  glucoseValue: number;
  glucoseUnit: GlucoseUnit;
  cervicalDilationCm: number;
  contractionFrequency: number;
}

const SAMPLE_MATERNAL_LOGS: MaternalObservationRecord[] = [
  {
    id: 'mob-1',
    timestamp: '2026-11-11T09:00:00Z',
    recordedBy: 'Staff Midwife Silva',
    systolicBp: 125,
    diastolicBp: 82,
    heartRate: 78,
    temperatureC: 36.8,
    glucoseValue: 5.4,
    glucoseUnit: GlucoseUnit.MMOL_L,
    cervicalDilationCm: 5,
    contractionFrequency: 3,
  },
  {
    id: 'mob-2',
    timestamp: '2026-11-11T07:30:00Z',
    recordedBy: 'Staff Midwife Silva',
    systolicBp: 120,
    diastolicBp: 80,
    heartRate: 74,
    temperatureC: 36.7,
    glucoseValue: 5.2,
    glucoseUnit: GlucoseUnit.MMOL_L,
    cervicalDilationCm: 4,
    contractionFrequency: 2,
  },
  {
    id: 'mob-3',
    timestamp: '2026-11-11T06:35:00Z',
    recordedBy: 'Staff Midwife Silva',
    systolicBp: 118,
    diastolicBp: 78,
    heartRate: 76,
    temperatureC: 36.6,
    glucoseValue: 5.1,
    glucoseUnit: GlucoseUnit.MMOL_L,
    cervicalDilationCm: 3,
    contractionFrequency: 2,
  },
];

export const MaternalObservationsPage: React.FC = () => {
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(PREVIEW_ADMISSIONS[0].id);
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>(GlucoseUnit.MMOL_L);
  const [observations, setObservations] = useState(SAMPLE_MATERNAL_LOGS);

  // Form states for preview logging
  const [systolic, setSystolic] = useState('125');
  const [diastolic, setDiastolic] = useState('82');
  const [heartRate, setHeartRate] = useState('80');
  const [temperature, setTemperature] = useState('36.8');
  const [glucose, setGlucose] = useState('5.4');
  const [dilation, setDilation] = useState('5');
  const [frequency, setFrequency] = useState('3');
  const [loggedSuccess, setLoggedSuccess] = useState(false);

  const selectedAdm =
    PREVIEW_ADMISSIONS.find((a) => a.id === selectedAdmissionId) || PREVIEW_ADMISSIONS[0];

  const handleLogObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: MaternalObservationRecord = {
      id: `mob-${Date.now()}`,
      timestamp: new Date().toISOString(),
      recordedBy: 'Staff Midwife Silva (SLNC-55219)',
      systolicBp: Number(systolic),
      diastolicBp: Number(diastolic),
      heartRate: Number(heartRate),
      temperatureC: Number(temperature),
      glucoseValue: Number(glucose),
      glucoseUnit,
      cervicalDilationCm: Number(dilation),
      contractionFrequency: Number(frequency),
    };
    setObservations([newEntry, ...observations]);
    setLoggedSuccess(true);
    setTimeout(() => setLoggedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Maternal Observations & Vitals"
        description="Routine recording of maternal blood pressure, pulse, temperature, blood glucose, cervical dilation, and contractions."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Maternal Vitals', active: true },
        ]}
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
            PARTOGRAM PROTOCOL
          </span>
        }
      />

      {/* Inpatient Selection Ribbon */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Label className="text-xs font-semibold text-slate-700">
            Select Active Inpatient Bed
          </Label>
          <select
            value={selectedAdmissionId}
            onChange={(e) => setSelectedAdmissionId(e.target.value)}
            className="mt-1 w-full sm:w-80 h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {PREVIEW_ADMISSIONS.map((adm) => (
              <option key={adm.id} value={adm.id}>
                {adm.bedNumber} — {adm.referenceId} ({adm.patientPlaceholder})
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-600 sm:text-right">
          <span className="font-semibold text-slate-800">Care Plan: </span>
          <span className="text-teal-700 font-bold">{selectedAdm.carePlan.replace(/_/g, ' ')}</span>
          <div className="text-[11px] text-slate-500">
            Attending: {selectedAdm.assignedDoctor} | Duty Midwife: {selectedAdm.assignedNurse}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vital Entry Form */}
        <div className="lg:col-span-1">
          <SectionCard
            title="Log New Maternal Vitals"
            description="Observations appended to partogram timeline"
          >
            <form onSubmit={handleLogObservation} className="space-y-4 text-xs">
              {loggedSuccess && (
                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Observation recorded successfully in shift log.</span>
                </div>
              )}

              {/* Blood Pressure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Systolic (mmHg)
                  </Label>
                  <Input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Diastolic (mmHg)
                  </Label>
                  <Input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Pulse and Temp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">Pulse (bpm)</Label>
                  <Input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">Temp (°C)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Blood Glucose with explicit Unit Selector */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-700">Blood Glucose</Label>
                  <div className="flex items-center space-x-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setGlucoseUnit(GlucoseUnit.MMOL_L)}
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        glucoseUnit === GlucoseUnit.MMOL_L
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      mmol/L
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlucoseUnit(GlucoseUnit.MG_DL)}
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        glucoseUnit === GlucoseUnit.MG_DL
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      mg/dL
                    </button>
                  </div>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              {/* Cervical Dilation and Contractions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Cervical Dilation (cm)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={dilation}
                    onChange={(e) => setDilation(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Contractions / 10m
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs h-9 mt-2"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Record Vitals in Shift Log
              </Button>
            </form>
          </SectionCard>
        </div>

        {/* Observations Table */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Maternal Observations Timeline"
            description={`Sequential vital chart for ${selectedAdm.referenceId} (${selectedAdm.bedNumber})`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="pb-2.5">Time</th>
                    <th className="pb-2.5">BP (mmHg)</th>
                    <th className="pb-2.5">Pulse / Temp</th>
                    <th className="pb-2.5">Blood Glucose</th>
                    <th className="pb-2.5">Dilation</th>
                    <th className="pb-2.5">Contractions</th>
                    <th className="pb-2.5">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {observations.map((obs) => {
                    const isHighBp = obs.systolicBp >= 140 || obs.diastolicBp >= 90;
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
                            className={`font-bold font-mono ${
                              isHighBp
                                ? 'text-red-700 bg-red-50 px-1 py-0.5 rounded'
                                : 'text-slate-900'
                            }`}
                          >
                            {obs.systolicBp}/{obs.diastolicBp}
                          </span>
                        </td>
                        <td className="py-3 text-slate-700">
                          {obs.heartRate} bpm / {obs.temperatureC} °C
                        </td>
                        <td className="py-3 font-semibold text-teal-800">
                          {obs.glucoseValue}{' '}
                          {obs.glucoseUnit === GlucoseUnit.MMOL_L ? 'mmol/L' : 'mg/dL'}
                        </td>
                        <td className="py-3 font-bold text-slate-800">
                          {obs.cervicalDilationCm} cm
                        </td>
                        <td className="py-3 text-slate-700">{obs.contractionFrequency} / 10 min</td>
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
