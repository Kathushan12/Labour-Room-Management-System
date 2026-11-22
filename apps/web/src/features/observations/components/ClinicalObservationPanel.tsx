import React, { useState, useEffect, useCallback } from 'react';
import {
  AdmissionObservationsSummaryDto,
  ClinicalObservationType,
  ObservationHighlight,
  PartographDto,
  Permission,
} from '@lrms/shared';
import { observationsApi } from '../../../services/observations.api.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { SectionCard } from '../../../components/shared/HeadersAndCards.js';
import { Button } from '../../../components/ui/button.js';
import { Badge } from '../../../components/ui/badge.js';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Clock,
  GitCommit,
  HeartPulse,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Waves,
} from 'lucide-react';
import { MaternalObservationForm } from './MaternalObservationForm.js';
import { FetalObservationForm } from './FetalObservationForm.js';
import { LabourAssessmentForm } from './LabourAssessmentForm.js';
import { ContractionObservationForm } from './ContractionObservationForm.js';
import { ObservationAmendmentDialog } from './ObservationAmendmentDialog.js';
import { PartographView } from './PartographView.js';
import { EscalationCreateDialog } from '../../clinical-care/components/EscalationCreateDialog.js';
import { humanizeEnum } from '../../../lib/labels.js';

const HIGHLIGHT_LABELS: Record<ObservationHighlight, string> = {
  SYSTOLIC_HIGH: 'Systolic high',
  DIASTOLIC_HIGH: 'Diastolic high',
  PULSE_LOW: 'Pulse low',
  PULSE_HIGH: 'Pulse high',
  FHR_LOW: 'FHR low',
  FHR_HIGH: 'FHR high',
};

// REQ-5.4 / SAF-6: out-of-range values are marked with a symbol and text, never colour alone.
const HighlightBadges: React.FC<{ highlights: ObservationHighlight[] }> = ({ highlights }) => (
  <>
    {highlights.map((h) => (
      <Badge
        key={h}
        variant="outline"
        className="text-[10px] bg-red-50 text-red-800 border-red-300 font-semibold"
      >
        <AlertTriangle className="w-3 h-3 mr-0.5" aria-hidden="true" />
        {HIGHLIGHT_LABELS[h]}
      </Badge>
    ))}
  </>
);

interface ClinicalObservationPanelProps {
  admissionId: string;
}

type TabType = 'partograph' | 'maternal' | 'fetal' | 'labour' | 'contractions' | 'history';

export const ClinicalObservationPanel: React.FC<ClinicalObservationPanelProps> = ({
  admissionId,
}) => {
  const { permissions } = useAuth();
  const canRecordBP = permissions.includes(Permission.OBSERVATIONS_RECORD_BP);
  const canRecordFHR = permissions.includes(Permission.OBSERVATIONS_RECORD_FHR);
  const canRecordLabour = permissions.includes(Permission.OBSERVATIONS_RECORD_LABOUR);
  const canRecordContraction = permissions.includes(Permission.OBSERVATIONS_RECORD_CONTRACTION);
  const canCorrect = permissions.includes(Permission.OBSERVATIONS_CORRECT);

  const [activeTab, setActiveTab] = useState<TabType>('partograph');
  const [summary, setSummary] = useState<AdmissionObservationsSummaryDto | null>(null);
  const [partograph, setPartograph] = useState<PartographDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forms open states
  const [showMaternalForm, setShowMaternalForm] = useState(false);
  const [showFetalForm, setShowFetalForm] = useState(false);
  const [showLabourForm, setShowLabourForm] = useState(false);
  const [showContractionForm, setShowContractionForm] = useState(false);

  // Amendment dialog states
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [amendmentTarget, setAmendmentTarget] = useState<{
    id: string;
    type: ClinicalObservationType;
    values: Record<string, any>;
  } | null>(null);

  // Escalation dialog states
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateTarget, setEscalateTarget] = useState<{
    obsId: string;
    obsType: ClinicalObservationType;
    summary: string;
  } | null>(null);

  const handleOpenEscalate = (obsId: string, obsType: ClinicalObservationType, summary: string) => {
    setEscalateTarget({ obsId, obsType, summary });
    setEscalateOpen(true);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, partRes] = await Promise.all([
        observationsApi.getObservationsSummary(admissionId),
        observationsApi.getPartograph(admissionId),
      ]);
      setSummary(sumRes);
      setPartograph(partRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load clinical observations';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAmend = (
    id: string,
    type: ClinicalObservationType,
    values: Record<string, any>,
  ) => {
    setAmendmentTarget({ id, type, values });
    setAmendmentOpen(true);
  };

  const handleActionSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
    setShowMaternalForm(false);
    setShowFetalForm(false);
    setShowLabourForm(false);
    setShowContractionForm(false);
    loadData();
  };

  return (
    <SectionCard
      title="Clinical Labour Observations & Partograph"
      description="Chronological maternal-fetal surveillance, labour progression monitoring, and composite Partograph tracking"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="text-xs h-7 px-2 border-slate-300"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center space-x-2">
          <Clock className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Observation KPI Overview Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="text-center p-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Maternal Vitals
            </span>
            <span className="text-sm font-bold text-slate-900">
              {(summary as any)?.maternalCount ?? summary?.maternalObservations?.length ?? 0}
            </span>
          </div>
          <div className="text-center p-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              FHR Records
            </span>
            <span className="text-sm font-bold text-indigo-700">
              {(summary as any)?.fetalCount ?? summary?.fetalObservations?.length ?? 0}
            </span>
          </div>
          <div className="text-center p-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Labour Checks
            </span>
            <span className="text-sm font-bold text-purple-700">
              {(summary as any)?.labourAssessmentCount ?? summary?.labourAssessments?.length ?? 0}
            </span>
          </div>
          <div className="text-center p-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Contractions
            </span>
            <span className="text-sm font-bold text-amber-700">
              {summary?.contractionCount ?? summary?.contractions?.length ?? 0}
            </span>
          </div>
          <div className="text-center p-1.5 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Amendments
            </span>
            <span className="text-sm font-bold text-slate-800">
              {(summary as any)?.amendmentsCount ?? summary?.amendments?.length ?? 0}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2 mb-4">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'partograph'}
          aria-label="WHO Partograph"
          onClick={() => setActiveTab('partograph')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'partograph'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Partograph</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'maternal'}
          aria-label="Maternal Vitals"
          onClick={() => setActiveTab('maternal')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'maternal'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>
            Maternal Vitals (
            {(summary as any)?.maternalCount ?? summary?.maternalObservations?.length ?? 0})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'fetal'}
          aria-label="Fetal Monitoring"
          onClick={() => setActiveTab('fetal')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'fetal'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>
            Fetal Monitoring (
            {(summary as any)?.fetalCount ?? summary?.fetalObservations?.length ?? 0})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'labour'}
          aria-label="Labour Progress"
          onClick={() => setActiveTab('labour')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'labour'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>
            Labour Progress (
            {(summary as any)?.labourAssessmentCount ?? summary?.labourAssessments?.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'contractions'}
          aria-label="Contractions"
          onClick={() => setActiveTab('contractions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'contractions'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>
            Contractions ({summary?.contractionCount ?? summary?.contractions?.length ?? 0})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          aria-label="Observation History"
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'history'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Observation History & Amendments</span>
        </button>
      </div>

      {loading && !partograph ? (
        <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
          <span>Loading clinical surveillance data...</span>
        </div>
      ) : (
        <div>
          {summary?.fhrObservationDue && (
            <div
              role="status"
              className="mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center gap-2"
            >
              <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                <strong>Observation due:</strong> no fetal heart rate recorded in the last 30
                minutes.
              </span>
            </div>
          )}
          {/* TAB 1: PARTOGRAPH */}
          {activeTab === 'partograph' && partograph && (
            <PartographView partograph={partograph} onRefresh={loadData} />
          )}

          {/* TAB 2: MATERNAL VITALS */}
          {activeTab === 'maternal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Maternal Blood Pressure & Vitals Log
                </h4>
                {canRecordBP && !showMaternalForm && (
                  <Button
                    size="sm"
                    onClick={() => setShowMaternalForm(true)}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-7 px-2.5"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Record Maternal Vitals
                  </Button>
                )}
              </div>

              {showMaternalForm && (
                <div className="p-4 border border-teal-200 bg-teal-50/30 rounded-xl">
                  <MaternalObservationForm
                    admissionId={admissionId}
                    onSuccess={() =>
                      handleActionSuccess('Maternal observation recorded successfully')
                    }
                    onCancel={() => setShowMaternalForm(false)}
                  />
                </div>
              )}

              {summary?.maternalObservations && summary.maternalObservations.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  {summary.maternalObservations.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {obs.systolicBp && obs.diastolicBp
                              ? `BP: ${obs.systolicBp}/${obs.diastolicBp} mmHg`
                              : 'Vitals Recorded'}
                          </span>
                          {obs.pulseRateBpm && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              Pulse: {obs.pulseRateBpm} bpm
                            </Badge>
                          )}
                          {obs.temperatureCelsius && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              Temp: {obs.temperatureCelsius} °C
                            </Badge>
                          )}
                          {obs.bloodGlucoseValue != null && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              Glucose: {obs.bloodGlucoseValue}{' '}
                              {obs.bloodGlucoseUnit === 'MG_DL' ? 'mg/dL' : 'mmol/L'}
                            </Badge>
                          )}
                          <HighlightBadges highlights={obs.highlights ?? []} />
                          {obs.supersedesId && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                            >
                              Amended
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Measured:{' '}
                          <span className="font-mono text-slate-700">
                            {new Date(obs.observationTimestamp).toLocaleString('en-GB', {
                              timeZone: 'Asia/Colombo',
                            })}
                          </span>
                          {obs.recordedByUser && ` by ${obs.recordedByUser.fullName}`}
                          {obs.clinicalNotes && ` — "${obs.clinicalNotes}"`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleOpenEscalate(
                              obs.id,
                              ClinicalObservationType.MATERNAL,
                              `BP: ${obs.systolicBp}/${obs.diastolicBp} mmHg, Pulse: ${obs.pulseRateBpm} bpm`,
                            )
                          }
                          className="text-xs text-rose-700 hover:bg-rose-50 h-7 px-2"
                          data-testid="btn-escalate-maternal-obs"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Escalate
                        </Button>
                        {canCorrect && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleOpenAmend(obs.id, ClinicalObservationType.MATERNAL, {
                                systolicBp: obs.systolicBp,
                                diastolicBp: obs.diastolicBp,
                                pulseRateBpm: obs.pulseRateBpm,
                                temperatureCelsius: obs.temperatureCelsius,
                                respiratoryRate: obs.respiratoryRate,
                                oxygenSaturationPercent: obs.oxygenSaturationPercent,
                                clinicalNotes: obs.clinicalNotes,
                              })
                            }
                            className="text-xs text-amber-700 hover:bg-amber-50 h-7 px-2"
                          >
                            <History className="w-3 h-3 mr-1" />
                            Amend
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">
                  No maternal vitals recorded yet.
                </p>
              )}
            </div>
          )}

          {/* TAB 3: FETAL MONITORING */}
          {activeTab === 'fetal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Fetal Heart Rate & Liquor Monitoring
                </h4>
                {canRecordFHR && !showFetalForm && (
                  <Button
                    size="sm"
                    onClick={() => setShowFetalForm(true)}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs h-7 px-2.5"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Record FHR
                  </Button>
                )}
              </div>

              {showFetalForm && (
                <div className="p-4 border border-indigo-200 bg-indigo-50/30 rounded-xl">
                  <FetalObservationForm
                    admissionId={admissionId}
                    onSuccess={() => handleActionSuccess('Fetal observation recorded successfully')}
                    onCancel={() => setShowFetalForm(false)}
                  />
                </div>
              )}

              {summary?.fetalObservations && summary.fetalObservations.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  {summary.fetalObservations.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-indigo-900 text-sm">
                            FHR: {obs.fetalHeartRateBpm} bpm
                          </span>
                          <HighlightBadges highlights={obs.highlights ?? []} />
                          {obs.liquorStatus && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              Amniotic fluid: {obs.liquorStatus}
                            </Badge>
                          )}
                          {obs.variability && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              Var: {obs.variability}
                            </Badge>
                          )}
                          {obs.supersedesId && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                            >
                              Amended
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Measured:{' '}
                          <span className="font-mono text-slate-700">
                            {new Date(obs.observationTimestamp).toLocaleString('en-GB', {
                              timeZone: 'Asia/Colombo',
                            })}
                          </span>
                          {obs.recordedByUser && ` by ${obs.recordedByUser.fullName}`}
                          {obs.clinicalNotes && ` — "${obs.clinicalNotes}"`}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleOpenEscalate(
                              obs.id,
                              ClinicalObservationType.FETAL,
                              `FHR: ${obs.fetalHeartRateBpm} bpm, Liquor: ${obs.liquorStatus || 'N/A'}`,
                            )
                          }
                          className="text-xs text-rose-700 hover:bg-rose-50 h-7 px-2"
                          data-testid="btn-escalate-fetal-obs"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Escalate
                        </Button>
                        {canCorrect && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleOpenAmend(obs.id, ClinicalObservationType.FETAL, {
                                fetalHeartRateBpm: obs.fetalHeartRateBpm,
                                liquorStatus: obs.liquorStatus,
                                variability: obs.variability,
                                decelerations: obs.decelerations,
                                accelerations: obs.accelerations,
                                clinicalNotes: obs.clinicalNotes,
                              })
                            }
                            className="text-xs text-amber-700 hover:bg-amber-50 h-7 px-2"
                          >
                            <History className="w-3 h-3 mr-1" />
                            Amend
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">
                  No fetal observations recorded yet.
                </p>
              )}
            </div>
          )}

          {/* TAB 4: LABOUR PROGRESSION */}
          {activeTab === 'labour' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Cervical Dilation & Descent Assessments
                </h4>
                {canRecordLabour && !showLabourForm && (
                  <Button
                    size="sm"
                    onClick={() => setShowLabourForm(true)}
                    className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-7 px-2.5"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Record Labour Progression
                  </Button>
                )}
              </div>

              {showLabourForm && (
                <div className="p-4 border border-purple-200 bg-purple-50/30 rounded-xl">
                  <LabourAssessmentForm
                    admissionId={admissionId}
                    onSuccess={() => handleActionSuccess('Labour assessment recorded successfully')}
                    onCancel={() => setShowLabourForm(false)}
                  />
                </div>
              )}

              {summary?.labourAssessments && summary.labourAssessments.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  {summary.labourAssessments.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-purple-900 text-sm">
                            {obs.cervicalDilationCm != null
                              ? `Dilation: ${obs.cervicalDilationCm} cm`
                              : 'Labour Checked'}
                          </span>
                          {obs.cervicalEffacementPercent != null && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              Effacement: {obs.cervicalEffacementPercent}%
                            </Badge>
                          )}
                          {obs.fetalDescentFifths != null && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              Descent: {obs.fetalDescentFifths}/5
                            </Badge>
                          )}
                          {obs.membraneStatus && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              {humanizeEnum(obs.membraneStatus)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Assessment at:{' '}
                          <span className="font-mono text-slate-700">
                            {new Date(obs.observationTimestamp).toLocaleString('en-GB', {
                              timeZone: 'Asia/Colombo',
                            })}
                          </span>
                          {obs.recordedByUser && ` by ${obs.recordedByUser.fullName}`}
                          {obs.clinicalNotes && ` — "${obs.clinicalNotes}"`}
                        </div>
                      </div>

                      {canCorrect && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleOpenAmend(obs.id, ClinicalObservationType.LABOUR_ASSESSMENT, {
                              cervicalDilationCm: obs.cervicalDilationCm,
                              cervicalEffacementPercent: obs.cervicalEffacementPercent,
                              fetalStation: obs.fetalStation,
                              fetalDescentFifths: obs.fetalDescentFifths,
                              membraneStatus: obs.membraneStatus,
                              liquorAppearance: obs.liquorAppearance,
                              fetalPosition: obs.fetalPosition,
                              caput: obs.caput,
                              moulding: obs.moulding,
                              clinicalNotes: obs.clinicalNotes,
                            })
                          }
                          className="text-xs text-amber-700 hover:bg-amber-50 h-7 px-2"
                        >
                          <History className="w-3 h-3 mr-1" />
                          Amend
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">
                  No labour assessments recorded yet.
                </p>
              )}
            </div>
          )}

          {/* TAB 5: CONTRACTIONS */}
          {activeTab === 'contractions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Uterine Contractions Log
                </h4>
                {canRecordContraction && !showContractionForm && (
                  <Button
                    size="sm"
                    onClick={() => setShowContractionForm(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-2.5"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Record Contractions
                  </Button>
                )}
              </div>

              {showContractionForm && (
                <div className="p-4 border border-amber-200 bg-amber-50/30 rounded-xl">
                  <ContractionObservationForm
                    admissionId={admissionId}
                    onSuccess={() =>
                      handleActionSuccess('Contraction observation recorded successfully')
                    }
                    onCancel={() => setShowContractionForm(false)}
                  />
                </div>
              )}

              {summary?.contractions && summary.contractions.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  {summary.contractions.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-amber-900 text-sm">
                            {obs.contractionsCount} in {obs.observationWindowMinutes} min
                          </span>
                          {obs.durationSeconds && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              Duration: {obs.durationSeconds}s
                            </Badge>
                          )}
                          {obs.intensity && (
                            <Badge variant="outline" className="text-[10px] text-slate-700">
                              Intensity: {obs.intensity}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Recorded at:{' '}
                          <span className="font-mono text-slate-700">
                            {new Date(obs.observationTimestamp).toLocaleString('en-GB', {
                              timeZone: 'Asia/Colombo',
                            })}
                          </span>
                          {obs.recordedByUser && ` by ${obs.recordedByUser.fullName}`}
                          {obs.clinicalNotes && ` — "${obs.clinicalNotes}"`}
                        </div>
                      </div>

                      {canCorrect && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleOpenAmend(obs.id, ClinicalObservationType.CONTRACTION, {
                              contractionsCount: obs.contractionsCount,
                              observationWindowMinutes: obs.observationWindowMinutes,
                              durationSeconds: obs.durationSeconds,
                              intensity: obs.intensity,
                              clinicalNotes: obs.clinicalNotes,
                            })
                          }
                          className="text-xs text-amber-700 hover:bg-amber-50 h-7 px-2"
                        >
                          <History className="w-3 h-3 mr-1" />
                          Amend
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">
                  No contraction observations recorded yet.
                </p>
              )}
            </div>
          )}

          {/* TAB 6: CHRONOLOGICAL AUDITED AMENDMENT TIMELINE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Audited Clinical Amendments & Corrections Log
              </h4>

              {summary?.amendments && summary.amendments.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  {summary.amendments.map((amd) => (
                    <div key={amd.id} className="p-3.5 space-y-1.5 hover:bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-50 text-amber-900 border-amber-300"
                          >
                            {humanizeEnum(amd.observationType)} amended
                          </Badge>
                          <span className="font-mono text-slate-500 text-[11px]">
                            {new Date(amd.createdAt).toLocaleString('en-GB', {
                              timeZone: 'Asia/Colombo',
                            })}
                          </span>
                        </div>
                        {amd.amendedByUser && (
                          <span className="text-slate-600 font-medium">
                            Amended by: {amd.amendedByUser.fullName}
                          </span>
                        )}
                      </div>

                      <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-800 text-[11px]">
                        <span className="font-bold">Clinical Rationale:</span> "
                        {amd.amendmentReason}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                  No amendments recorded. All observations are original bedside entries.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Amendment Dialog */}
      {amendmentOpen && amendmentTarget && (
        <ObservationAmendmentDialog
          isOpen={amendmentOpen}
          onClose={() => {
            setAmendmentOpen(false);
            setAmendmentTarget(null);
          }}
          admissionId={admissionId}
          observationId={amendmentTarget.id}
          observationType={amendmentTarget.type}
          currentValues={amendmentTarget.values}
          onSuccess={() => handleActionSuccess('Clinical observation amended successfully')}
        />
      )}

      {/* Escalation Dialog */}
      {escalateOpen && escalateTarget && (
        <EscalationCreateDialog
          admissionId={admissionId}
          sourceObservationId={escalateTarget.obsId}
          sourceObservationType={escalateTarget.obsType}
          sourceObservationSummary={escalateTarget.summary}
          isOpen={escalateOpen}
          onClose={() => {
            setEscalateOpen(false);
            setEscalateTarget(null);
          }}
          onCreated={loadData}
        />
      )}
    </SectionCard>
  );
};
