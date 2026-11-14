import React, { useState } from 'react';
import { PartographDto } from '@lrms/shared';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { Activity, Clock, GitCommit, HeartPulse, Info, Waves } from 'lucide-react';

interface PartographViewProps {
  partograph?: PartographDto;
  data?: PartographDto;
  onRefresh?: () => void;
}

export const PartographView: React.FC<PartographViewProps> = ({
  partograph: directPartograph,
  data,
  onRefresh,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [showReferenceLines, setShowReferenceLines] = useState(true);

  const partograph = directPartograph || data;

  const fetalCondition = partograph?.fetalCondition || {
    fhrSeries: [],
    liquorSeries: [],
    mouldingSeries: [],
  };
  const labourProgress = partograph?.labourProgress || {
    cervicalDilationSeries: [],
    fetalDescentSeries: [],
    alertLinePoints: [],
    actionLinePoints: [],
  };
  const contractions = partograph?.contractions || [];
  const maternalCondition = partograph?.maternalCondition || {
    bloodPressureSeries: [],
    pulseRateSeries: [],
    temperatureSeries: [],
    bloodGlucoseSeries: [],
  };

  // Format timestamp in Asia/Colombo (+05:30)
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Colombo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Colombo',
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* WHO Composite Chart Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-xl shadow-sm">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold tracking-tight flex items-center space-x-2">
            <Activity className="w-5 h-5 text-teal-400" />
            <span>WHO Partograph Composite Chart</span>
          </h3>
          <p className="text-xs text-slate-300">
            Colombo South Teaching Hospital — Ward 18 Labour Room Surveillance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {partograph?.admissionReferenceId && (
            <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md font-mono text-slate-200">
              {partograph.admissionReferenceId}
            </span>
          )}
          <span className="px-2.5 py-1 bg-teal-900/60 border border-teal-700/60 text-teal-200 rounded-md font-medium">
            Timezone: Asia/Colombo (+05:30)
          </span>
        </div>
      </div>

      {/* Header Strip with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">
            Active Labour Monitoring Surveillance
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">Standard WHO 4-hour alert/action protocol</span>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={showReferenceLines}
              onChange={(e) => setShowReferenceLines(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Show WHO Alert & Action Reference Lines</span>
          </label>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="text-xs h-7 px-2 border-slate-300"
            >
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* WHO Reference Guide Note with Alert and Action Lines */}
      {showReferenceLines && (
        <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1.5">
          <div className="flex items-center space-x-2 font-bold">
            <Info className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>Standard WHO Partograph Reference Lines</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700">
            <div className="flex items-center space-x-2 bg-white/70 p-2 rounded border border-purple-100">
              <span className="w-3.5 h-1 bg-amber-500 rounded" />
              <div>
                <span className="font-bold text-amber-900 block">WHO Alert Line</span>
                <span className="text-[11px] text-slate-600">
                  Starts at active phase (≥ 4 cm), progression rate of 1 cm/hr
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-white/70 p-2 rounded border border-purple-100">
              <span className="w-3.5 h-1 bg-rose-500 rounded" />
              <div>
                <span className="font-bold text-rose-900 block">WHO Action Line</span>
                <span className="text-[11px] text-slate-600">
                  Parallel reference line plotted 4 hours to the right of the Alert Line
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: FETAL CONDITION (FHR, LIQUOR, MOULDING) */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Fetal Condition — Fetal Heart Rate (bpm), Liquor & Moulding
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">Normal Baseline: 110–160 bpm</span>
        </div>

        {fetalCondition.fhrSeries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">FHR</th>
                  <th className="py-2 px-3">Assessment</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fetalCondition.fhrSeries.map((pt, idx) => {
                  const isNormal = pt.fhrBpm >= 110 && pt.fhrBpm <= 160;
                  const isBradycardia = pt.fhrBpm < 110;
                  return (
                    <tr
                      key={idx}
                      onClick={() =>
                        setSelectedPoint(
                          `FHR: ${pt.fhrBpm} bpm recorded at ${formatTime(pt.timestamp)}`,
                        )
                      }
                      className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {formatTime(pt.timestamp)} ({formatDate(pt.timestamp)})
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {pt.fhrBpm} <span className="font-normal text-slate-500">bpm</span>
                      </td>
                      <td className="py-2 px-3">
                        {isNormal ? (
                          <span className="text-emerald-700 font-medium">
                            Normal Baseline (110–160)
                          </span>
                        ) : isBradycardia ? (
                          <span className="text-rose-700 font-bold">
                            Fetal Bradycardia (&lt; 110)
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold">
                            Fetal Tachycardia (&gt; 160)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {pt.isAmended && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                          >
                            Amended
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No FHR observations recorded.</p>
        )}

        {/* Liquor and Moulding Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <span className="font-semibold text-slate-700">Amniotic Fluid / Liquor:</span>{' '}
            {fetalCondition.liquorSeries.length > 0 ? (
              <span className="text-slate-900 font-medium">
                Latest: {fetalCondition.liquorSeries[fetalCondition.liquorSeries.length - 1].status}{' '}
                at{' '}
                {formatTime(
                  fetalCondition.liquorSeries[fetalCondition.liquorSeries.length - 1].timestamp,
                )}
              </span>
            ) : (
              <span className="text-slate-400 italic">Not recorded</span>
            )}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Cranial Moulding:</span>{' '}
            {fetalCondition.mouldingSeries.length > 0 ? (
              <span className="text-slate-900 font-medium">
                Latest:{' '}
                {fetalCondition.mouldingSeries[fetalCondition.mouldingSeries.length - 1].moulding}{' '}
                at{' '}
                {formatTime(
                  fetalCondition.mouldingSeries[fetalCondition.mouldingSeries.length - 1].timestamp,
                )}
              </span>
            ) : (
              <span className="text-slate-400 italic">Not recorded</span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: LABOUR PROGRESS (CERVICAL DILATION & FETAL DESCENT) */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <GitCommit className="w-4 h-4 text-purple-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Labour Progress — Cervical Dilation (✕) & Fetal Descent (○)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">Scale: 0–10 cm / 5–0 fifths</span>
        </div>

        {labourProgress.cervicalDilationSeries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Dilation (cm)</th>
                  <th className="py-2 px-3">Fetal Descent / Station</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labourProgress.cervicalDilationSeries.map((pt, idx) => (
                  <tr
                    key={idx}
                    onClick={() =>
                      setSelectedPoint(
                        `Cervical Dilation: ${pt.dilationCm} cm recorded at ${formatTime(pt.timestamp)}`,
                      )
                    }
                    className="cursor-pointer hover:bg-purple-50/50 transition-colors"
                  >
                    <td className="py-2 px-3 font-mono text-slate-700">
                      {formatTime(pt.timestamp)} ({formatDate(pt.timestamp)})
                    </td>
                    <td className="py-2 px-3 font-bold text-purple-900">
                      {pt.dilationCm} cm{' '}
                      {pt.dilationCm >= 10 ? (
                        <span className="text-xs font-normal text-emerald-700">
                          (Fully Dilated)
                        </span>
                      ) : pt.dilationCm >= 4 ? (
                        <span className="text-xs font-normal text-teal-700">(Active Phase)</span>
                      ) : (
                        <span className="text-xs font-normal text-slate-500">(Latent Phase)</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {labourProgress.fetalDescentSeries[idx] ? (
                        <span>
                          {labourProgress.fetalDescentSeries[idx].descentFifths != null
                            ? `${labourProgress.fetalDescentSeries[idx].descentFifths}/5 fifths`
                            : ''}
                          {labourProgress.fetalDescentSeries[idx].station
                            ? ` (${labourProgress.fetalDescentSeries[idx].station})`
                            : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {pt.isAmended && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                        >
                          Amended
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            No cervical dilation assessments recorded.
          </p>
        )}
      </div>

      {/* SECTION 3: UTERINE CONTRACTIONS */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <Waves className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. Uterine Contractions — Frequency (/ 10 min) & Duration (seconds)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">Normal Active: 3–5 / 10 min</span>
        </div>

        {contractions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Frequency</th>
                  <th className="py-2 px-3">Duration (sec)</th>
                  <th className="py-2 px-3">Intensity Shading</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractions.map((c, idx) => (
                  <tr
                    key={idx}
                    onClick={() =>
                      setSelectedPoint(
                        `Contractions: ${c.frequencyPer10Min} in 10 min (${c.durationSeconds}s) at ${formatTime(c.timestamp)}`,
                      )
                    }
                    className="cursor-pointer hover:bg-amber-50/50 transition-colors"
                  >
                    <td className="py-2 px-3 font-mono text-slate-700">
                      {formatTime(c.timestamp)} ({formatDate(c.timestamp)})
                    </td>
                    <td className="py-2 px-3 font-bold text-amber-900">
                      {c.frequencyPer10Min}{' '}
                      <span className="font-normal text-slate-500">/ 10 min</span>
                    </td>
                    <td className="py-2 px-3 text-slate-800">
                      {c.durationSeconds ? `${c.durationSeconds} seconds` : '—'}
                    </td>
                    <td className="py-2 px-3">
                      {c.intensity === 'STRONG' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-900 text-white font-medium">
                          Solid (&gt; 40s)
                        </span>
                      ) : c.intensity === 'MODERATE' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-900 font-medium border border-amber-300">
                          Diagonal Striped (20–40s)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-800 border border-slate-300">
                          Dotted (&lt; 20s)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No contraction observations recorded.</p>
        )}
      </div>

      {/* SECTION 4: MATERNAL CONDITION (BP, PULSE, TEMP, GLUCOSE) */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <HeartPulse className="w-4 h-4 text-rose-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              4. Maternal Condition — Maternal Vital Signs: Blood Pressure (mmHg), Pulse (bpm) &
              Temperature (°C)
            </h4>
          </div>
        </div>

        {maternalCondition.bloodPressureSeries.length > 0 ||
        maternalCondition.pulseRateSeries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Blood Pressure (mmHg)</th>
                  <th className="py-2 px-3">Pulse (bpm)</th>
                  <th className="py-2 px-3">Temperature (°C)</th>
                  <th className="py-2 px-3">Glucose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maternalCondition.bloodPressureSeries.map((bp, idx) => {
                  const pulse = maternalCondition.pulseRateSeries[idx];
                  const temp = maternalCondition.temperatureSeries[idx];
                  const gluc = maternalCondition.bloodGlucoseSeries[idx];
                  return (
                    <tr
                      key={idx}
                      onClick={() =>
                        setSelectedPoint(
                          `Maternal Vitals: BP ${bp.systolic}/${bp.diastolic} mmHg at ${formatTime(bp.timestamp)}`,
                        )
                      }
                      className="cursor-pointer hover:bg-rose-50/50 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {formatTime(bp.timestamp)} ({formatDate(bp.timestamp)})
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {bp.systolic} / {bp.diastolic}
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        {pulse ? `${pulse.pulseBpm} bpm` : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        {temp ? `${temp.tempCelsius} °C` : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        {gluc ? `${gluc.value} ${gluc.unit}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No maternal vitals recorded.</p>
        )}
      </div>

      {/* Selected Point Inspector Strip */}
      {selectedPoint && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-teal-700 flex-shrink-0" />
            <span className="font-semibold">{selectedPoint}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPoint(null)}
            className="text-xs text-teal-800 h-6 px-2 hover:bg-teal-100"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
};
