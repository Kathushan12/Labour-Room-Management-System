import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AdmissionDto,
  AdmissionStatus,
  BedAllocationHistoryDto,
  BedDisplayStatus,
  BedDto,
  BedFunctioningStatus,
  Permission,
  RiskFlagDefinitionDto,
  RiskFlagKey,
} from '@lrms/shared';
import {
  fetchAdmissionDetail,
  fetchRiskFlagDefinitions,
  updateAdmissionRiskFlags,
} from '../../services/admissions.api.js';
import {
  allocateBed,
  fetchAdmissionBedHistory,
  fetchBedsByWard,
  releaseBed,
  transferBed,
} from '../../services/beds.api.js';
import { AdmissionStaffResponsibilityCard } from './components/AdmissionStaffResponsibilityCard.js';
import { ClinicalObservationPanel } from '../observations/components/ClinicalObservationPanel.js';
import { ClinicalCarePanel } from '../clinical-care/components/ClinicalCarePanel.js';
import { PostpartumDeliveryTab } from '../delivery/components/PostpartumDeliveryTab.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PermissionGuard } from '../../components/auth/PermissionGuard.js';
import { PageHeader, SectionCard, StatCard } from '../../components/shared/HeadersAndCards.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import { AdmissionCategoryBadge, BedStatusBadge } from '../../components/status/Badges.js';
import { Button } from '../../components/ui/button.js';
import { Badge } from '../../components/ui/badge.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.js';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Baby,
  BedDouble,
  Clock,
  FileText,
  History,
  Loader2,
  LogOut,
  Pencil,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { formatColomboDate, formatColomboDateTime } from '../../lib/datetime.js';

const CORE_RISK_KEYS: RiskFlagKey[] = [
  RiskFlagKey.HYPERTENSION,
  RiskFlagKey.GESTATIONAL_DIABETES,
  RiskFlagKey.PRIOR_CESAREAN,
  RiskFlagKey.OBSERVATION_20PLUS,
];

export const AdmissionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();

  const [clinicalTab, setClinicalTab] = useState<'care-plan' | 'observations' | 'delivery'>(
    'care-plan',
  );
  const [admission, setAdmission] = useState<AdmissionDto | null>(null);
  const [bedHistory, setBedHistory] = useState<BedAllocationHistoryDto[]>([]);
  const [availableBeds, setAvailableBeds] = useState<BedDto[]>([]);
  const [riskDefinitions, setRiskDefinitions] = useState<RiskFlagDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Risk-flag update dialog state
  const [flagsOpen, setFlagsOpen] = useState(false);
  const [selectedFlags, setSelectedFlags] = useState<RiskFlagKey[]>([]);
  const [noFlagsConfirmed, setNoFlagsConfirmed] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [savingFlags, setSavingFlags] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);

  // Bed Allocation Dialog States
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [bedActionLoading, setBedActionLoading] = useState(false);
  const [bedActionError, setBedActionError] = useState<string | null>(null);

  // Bed Transfer Dialog State
  const [transferOpen, setTransferOpen] = useState(false);
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Bed Release Dialog State
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');

  const loadBedHistory = useCallback(async (admissionId: string) => {
    try {
      const res = await fetchAdmissionBedHistory(admissionId);
      if (res.success && res.data) {
        setBedHistory(res.data.items);
      }
    } catch {
      // Non-critical if history API fails
    }
  }, []);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchAdmissionDetail(id);
      if (!res.success || !res.data) {
        setErrorMsg(res.error?.message || 'Unable to load admission detail.');
      } else {
        setAdmission(res.data);
        await loadBedHistory(res.data.id);
      }
    } catch {
      setErrorMsg('Network error loading admission detail.');
    } finally {
      setLoading(false);
    }
  }, [id, loadBedHistory]);

  useEffect(() => {
    loadDetail();
    fetchRiskFlagDefinitions()
      .then((res) => {
        if (res.success && res.data) {
          setRiskDefinitions(res.data.items);
        }
      })
      .catch(() => {});
  }, [loadDetail]);

  const activeBedAllocation = bedHistory.find((a) => !a.releasedAt);

  // Load available functioning beds for allocation/transfer
  const loadWardAvailableBeds = async () => {
    if (!admission?.wardId) return;
    try {
      const res = await fetchBedsByWard(admission.wardId);
      if (res.success && res.data) {
        setAvailableBeds(
          res.data.items.filter(
            (b) =>
              b.functioningStatus === BedFunctioningStatus.FUNCTIONING &&
              b.displayStatus === BedDisplayStatus.AVAILABLE,
          ),
        );
      }
    } catch {
      // Fallback
    }
  };

  const openAllocateDialog = async () => {
    setSelectedBedId('');
    setAllocationNotes('');
    setBedActionError(null);
    await loadWardAvailableBeds();
    setAllocateOpen(true);
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admission || !selectedBedId) return;
    setBedActionLoading(true);
    setBedActionError(null);
    try {
      const res = await allocateBed(
        admission.id,
        selectedBedId,
        allocationNotes.trim() || undefined,
      );
      if (!res.success) {
        setBedActionError(res.error?.message || 'Failed to allocate bed.');
        return;
      }
      setAllocateOpen(false);
      await loadBedHistory(admission.id);
    } catch {
      setBedActionError('Network error executing bed allocation.');
    } finally {
      setBedActionLoading(false);
    }
  };

  const openTransferDialog = async () => {
    setTargetBedId('');
    setTransferReason('');
    setBedActionError(null);
    await loadWardAvailableBeds();
    setTransferOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBedAllocation || !targetBedId) return;
    setBedActionLoading(true);
    setBedActionError(null);
    try {
      const res = await transferBed(
        activeBedAllocation.id,
        targetBedId,
        transferReason.trim() || undefined,
      );
      if (!res.success) {
        setBedActionError(res.error?.message || 'Failed to transfer bed.');
        return;
      }
      setTransferOpen(false);
      if (admission) await loadBedHistory(admission.id);
    } catch {
      setBedActionError('Network error executing bed transfer.');
    } finally {
      setBedActionLoading(false);
    }
  };

  const openReleaseDialog = () => {
    setReleaseReason('');
    setBedActionError(null);
    setReleaseOpen(true);
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBedAllocation) return;
    setBedActionLoading(true);
    setBedActionError(null);
    try {
      const res = await releaseBed(activeBedAllocation.id, releaseReason.trim() || undefined);
      if (!res.success) {
        setBedActionError(res.error?.message || 'Failed to release bed.');
        return;
      }
      setReleaseOpen(false);
      if (admission) await loadBedHistory(admission.id);
    } catch {
      setBedActionError('Network error executing bed release.');
    } finally {
      setBedActionLoading(false);
    }
  };

  const openRiskDialog = () => {
    if (!admission) return;
    setSelectedFlags(admission.riskFlags.map((f) => f.key));
    setNoFlagsConfirmed(admission.noListedRiskFlagsConfirmed);
    setFlagReason('');
    setFlagError(null);
    setFlagsOpen(true);
  };

  const handleSaveFlags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admission) return;
    setFlagError(null);

    if (selectedFlags.length === 0 && !noFlagsConfirmed) {
      setFlagError('Select at least one risk flag or confirm that no listed risk flags apply.');
      return;
    }

    setSavingFlags(true);
    try {
      const res = await updateAdmissionRiskFlags(admission.id, {
        riskFlagKeys: selectedFlags,
        noListedRiskFlagsConfirmed: noFlagsConfirmed,
        reason: flagReason.trim() || null,
      });

      if (!res.success || !res.data) {
        setFlagError(res.error?.message || 'Failed to update clinical risk flags.');
        return;
      }

      setAdmission(res.data);
      setFlagsOpen(false);
    } catch {
      setFlagError('Network error updating clinical risk flags.');
    } finally {
      setSavingFlags(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-xs text-slate-500">
        <Loader2 className="w-5 h-5 mr-2 animate-spin text-teal-600" />
        Loading admission record...
      </div>
    );
  }

  if (errorMsg || !admission) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <Link to="/admissions">
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Admissions
          </Button>
        </Link>
        <EmptyState
          title="Admission Record Unavailable"
          description={errorMsg || 'Admission record could not be retrieved.'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={`Admission Record: ${admission.admissionReferenceId}`}
        description="Server-generated admission reference, physical bed assignment, triage risk flags, intake metadata, and linked patient master file."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admissions', href: '/admissions' },
          { label: admission.admissionReferenceId, active: true },
        ]}
        badge={<AdmissionCategoryBadge category={admission.admissionCategory} />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admissions">
              <Button size="sm" variant="outline" className="text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Register
              </Button>
            </Link>
            <PermissionGuard permission={Permission.PATIENTS_VIEW}>
              {admission.patientId && (
                <Link to={`/patients/${admission.patientId}`}>
                  <Button
                    size="sm"
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium"
                  >
                    Open Patient Master Record
                  </Button>
                </Link>
              )}
            </PermissionGuard>
          </div>
        }
      />

      {/* Core Metadata Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Reference ID"
          value={admission.admissionReferenceId}
          subtitle="Unique PostgreSQL sequence"
          icon={<FileText className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          title="Admission Status"
          value={admission.status}
          subtitle={
            admission.dischargedAt
              ? `Closed ${formatColomboDate(admission.dischargedAt)}`
              : 'Active intake record'
          }
          icon={<Clock className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Admitted By"
          value={admission.admittedByFullName || 'Authorized Staff'}
          subtitle="Admitting triage nurse"
          icon={<UserCheck className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Bed Allocation"
          value={activeBedAllocation ? activeBedAllocation.bedNumber : 'None'}
          subtitle={activeBedAllocation ? 'Currently occupied' : 'Awaiting physical bed'}
          icon={<BedDouble className="w-5 h-5 text-teal-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Bed Allocation Card */}
          <SectionCard
            title="Labour Room Bed Assignment"
            description="Physical bed allocation, ward location, transfer audit, and bed release controls."
            action={
              admission.status === AdmissionStatus.ADMITTED && (
                <div className="flex items-center gap-2">
                  {activeBedAllocation ? (
                    <>
                      <PermissionGuard permission={Permission.BEDS_TRANSFER}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openTransferDialog}
                          className="text-xs h-8 text-teal-800 border-teal-300 hover:bg-teal-50"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                          Transfer Bed
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard permission={Permission.BEDS_RELEASE}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openReleaseDialog}
                          className="text-xs h-8 text-slate-700 border-slate-300 hover:bg-slate-50"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1.5" />
                          Release Bed
                        </Button>
                      </PermissionGuard>
                    </>
                  ) : (
                    <PermissionGuard permission={Permission.BEDS_ALLOCATE}>
                      <Button
                        size="sm"
                        onClick={openAllocateDialog}
                        className="text-xs h-8 bg-teal-700 hover:bg-teal-800 text-white"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        Allocate Bed
                      </Button>
                    </PermissionGuard>
                  )}
                </div>
              )
            }
          >
            <div className="space-y-4 text-xs">
              {activeBedAllocation ? (
                <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BedDouble className="w-5 h-5 text-teal-700" />
                      <div>
                        <span className="font-bold text-sm text-teal-950">
                          {activeBedAllocation.bedNumber}
                        </span>
                        <span className="ml-2 text-[11px] text-teal-800">
                          (Ward 18 — Labour Room)
                        </span>
                      </div>
                    </div>
                    <BedStatusBadge displayStatus={BedDisplayStatus.OCCUPIED} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-teal-100 text-teal-900">
                    <div>
                      <span className="text-teal-700">Allocated At: </span>
                      <span className="font-mono font-medium">
                        {formatColomboDateTime(activeBedAllocation.assignedAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-teal-700">Assigned By: </span>
                      <span className="font-medium">{activeBedAllocation.assignedByUserName}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 flex items-start space-x-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">No Physical Bed Allocated</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      This inpatient admission is active but has not yet been assigned to a
                      sanitized labour room bed.
                    </p>
                  </div>
                </div>
              )}

              {/* Bed Allocation History for this Admission */}
              {bedHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center space-x-1.5 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Admission Bed Stay History</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                          <th className="pb-1.5">Bed Number</th>
                          <th className="pb-1.5">Assigned At</th>
                          <th className="pb-1.5">Released At</th>
                          <th className="pb-1.5">Release Reason</th>
                          <th className="pb-1.5">Assigned By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bedHistory.map((bh) => (
                          <tr key={bh.id} className="hover:bg-slate-50">
                            <td className="py-1.5 font-bold">{bh.bedNumber}</td>
                            <td className="py-1.5 font-mono text-[11px]">
                              {formatColomboDateTime(bh.assignedAt)}
                            </td>
                            <td className="py-1.5 font-mono text-[11px]">
                              {bh.releasedAt ? (
                                formatColomboDateTime(bh.releasedAt)
                              ) : (
                                <span className="text-emerald-700 font-bold">Active Current</span>
                              )}
                            </td>
                            <td className="py-1.5 text-slate-600">{bh.releaseReason || '—'}</td>
                            <td className="py-1.5 text-slate-600">{bh.assignedByUserName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Clinical Risk Flag Screening */}
          <SectionCard
            title="Clinical Risk Flag Screening"
            description="Explicitly recorded risk markers and historical audit updates"
            action={
              admission.status === AdmissionStatus.ADMITTED && (
                <PermissionGuard permission={Permission.ADMISSIONS_TOGGLE_RISK_FLAGS}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openRiskDialog}
                    className="text-xs h-8"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Update Risk Flags
                  </Button>
                </PermissionGuard>
              )
            }
          >
            <div className="space-y-4 text-xs">
              {admission.riskFlags.length > 0 ? (
                <div className="space-y-2">
                  {admission.riskFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-amber-950">{flag.label}</span>
                        {flag.notes && <p className="text-amber-800 mt-0.5">{flag.notes}</p>}
                      </div>
                      <span className="text-[11px] text-amber-800">
                        Recorded by {flag.flaggedByFullName || flag.flaggedByUsername || 'Staff'} ·{' '}
                        {formatColomboDateTime(flag.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                  {admission.noListedRiskFlagsConfirmed
                    ? 'Confirmed during triage assessment that none of the listed clinical risk flags were present.'
                    : 'No clinical risk flags currently active.'}
                </div>
              )}

              {admission.historicalRiskFlags.some((f) => !f.isActive) && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                    Historical Deactivated Risk Flags
                  </p>
                  {admission.historicalRiskFlags
                    .filter((f) => !f.isActive)
                    .map((flag) => (
                      <div
                        key={flag.id}
                        className="p-2.5 rounded border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-between"
                      >
                        <span className="line-through">{flag.label}</span>
                        <span className="text-[11px]">
                          Removed{' '}
                          {flag.deactivatedAt ? formatColomboDateTime(flag.deactivatedAt) : ''}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Intake & Patient Reference"
            description="Non-identifying admission metadata (PII guarded on Patient Master File)"
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Patient Reference:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {admission.patientId ? `PT-${admission.patientId.slice(0, 8)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Encrypted PII on File:</span>
                <Badge variant="outline" className="text-[10px]">
                  {admission.hasPii ? 'Yes (AES-256-GCM)' : 'Not Entered'}
                </Badge>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Admitted At:</span>
                <span className="font-mono text-slate-800">
                  {formatColomboDateTime(admission.admittedAt)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Screening Completed:</span>
                <span className="font-mono text-slate-800">
                  {admission.riskAssessmentCompletedAt
                    ? formatColomboDateTime(admission.riskAssessmentCompletedAt)
                    : '—'}
                </span>
              </div>
            </div>
          </SectionCard>

          <AdmissionStaffResponsibilityCard admissionId={admission.id} wardId={admission.wardId} />
        </div>
      </div>

      {/* Clinical Subsystems: Surveillance, Partograph, Care Plans & Escalations */}
      <div className="mt-8 space-y-6">
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
          <button
            type="button"
            role="tab"
            aria-selected={clinicalTab === 'care-plan'}
            onClick={() => setClinicalTab('care-plan')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              clinicalTab === 'care-plan'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Care Plan, Escalation & Emergency Response
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={clinicalTab === 'observations'}
            onClick={() => setClinicalTab('observations')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              clinicalTab === 'observations'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="h-4 w-4" />
            Observations & Partograph
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={clinicalTab === 'delivery'}
            onClick={() => setClinicalTab('delivery')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
              clinicalTab === 'delivery'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Baby className="h-4 w-4" />
            Delivery, Newborn & Postpartum
          </button>
        </div>

        {clinicalTab === 'care-plan' && (
          <ClinicalCarePanel admissionId={admission.id} userRole={role || undefined} />
        )}

        {clinicalTab === 'observations' && <ClinicalObservationPanel admissionId={admission.id} />}

        {clinicalTab === 'delivery' && (
          <PostpartumDeliveryTab admissionId={admission.id} userRole={role || undefined} />
        )}
      </div>

      {/* Allocate Bed Dialog */}
      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Allocate Bed — {admission.admissionReferenceId}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Assign an available, functioning labour room bed to this inpatient.
            </DialogDescription>
          </DialogHeader>

          {bedActionError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{bedActionError}</span>
            </div>
          )}

          <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="allocate-bed-select" className="text-xs font-semibold text-slate-700">
                Available Functioning Bed
              </Label>
              <select
                id="allocate-bed-select"
                aria-label="Available Functioning Bed"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none"
                value={selectedBedId}
                onChange={(e) => setSelectedBedId(e.target.value)}
                required
              >
                <option value="">-- Choose an available bed --</option>
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bedNumber} (Ward 18)
                  </option>
                ))}
              </select>
              {availableBeds.length === 0 && (
                <p className="text-[11px] text-red-600 mt-1">
                  No available functioning beds in this ward currently. Check Bed Board for turnover
                  or maintenance.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="allocate-notes" className="text-xs font-semibold text-slate-700">
                Allocation Notes (Optional)
              </Label>
              <Input
                id="allocate-notes"
                value={allocationNotes}
                onChange={(e) => setAllocationNotes(e.target.value)}
                placeholder="e.g. Admitted directly from antenatal clinic triage"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAllocateOpen(false)}
                disabled={bedActionLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bedActionLoading || !selectedBedId}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                {bedActionLoading ? 'Allocating...' : 'Confirm Allocation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Bed Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Transfer Bed — {admission.admissionReferenceId}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Current Bed: {activeBedAllocation?.bedNumber}. Move inpatient to another available
              bed.
            </DialogDescription>
          </DialogHeader>

          {bedActionError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{bedActionError}</span>
            </div>
          )}

          <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>Turnover Notice:</strong> Transferring will release{' '}
            {activeBedAllocation?.bedNumber} and automatically flag it as <em>Cleaning Required</em>
            .
          </div>

          <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
            <div>
              <Label
                htmlFor="transfer-target-select"
                className="text-xs font-semibold text-slate-700"
              >
                Target Available Bed
              </Label>
              <select
                id="transfer-target-select"
                aria-label="Target Available Bed"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none"
                value={targetBedId}
                onChange={(e) => setTargetBedId(e.target.value)}
                required
              >
                <option value="">-- Choose destination bed --</option>
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bedNumber} (Available)
                  </option>
                ))}
              </select>
              {availableBeds.length === 0 && (
                <p className="text-[11px] text-red-600 mt-1">
                  No other available functioning beds in this ward.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="transfer-reason" className="text-xs font-semibold text-slate-700">
                Reason for Bed Transfer
              </Label>
              <Input
                id="transfer-reason"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Closer observation near nurse station required"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransferOpen(false)}
                disabled={bedActionLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bedActionLoading || !targetBedId}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                {bedActionLoading ? 'Transferring...' : 'Confirm Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Release Bed Dialog */}
      <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Release Bed {activeBedAllocation?.bedNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Release current labour room bed without closing admission{' '}
              {admission.admissionReferenceId}.
            </DialogDescription>
          </DialogHeader>

          {bedActionError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{bedActionError}</span>
            </div>
          )}

          <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <strong>Important:</strong> Releasing the bed marks it as <em>Cleaning Required</em>.
            This does <strong>NOT</strong> discharge the patient or close the admission record.
          </div>

          <form onSubmit={handleReleaseSubmit} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="release-reason" className="text-xs font-semibold text-slate-700">
                Reason for Bed Release
              </Label>
              <Input
                id="release-reason"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                placeholder="e.g. Observation completed, transferring to antenatal ward"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReleaseOpen(false)}
                disabled={bedActionLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bedActionLoading}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                {bedActionLoading ? 'Releasing...' : 'Confirm Release'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Risk Flag Update Dialog */}
      <Dialog open={flagsOpen} onOpenChange={setFlagsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Update Clinical Risk Flags — {admission.admissionReferenceId}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              All additions and removals are preserved chronologically in admission audit history.
            </DialogDescription>
          </DialogHeader>

          {flagError && (
            <div
              role="alert"
              className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{flagError}</span>
            </div>
          )}

          <form onSubmit={handleSaveFlags} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {riskDefinitions
                .filter((d) => CORE_RISK_KEYS.includes(d.key))
                .map((def) => {
                  const checked = selectedFlags.includes(def.key);
                  return (
                    <label
                      key={def.key}
                      className={`flex items-center space-x-2 p-2.5 rounded border cursor-pointer min-h-[44px] ${
                        checked ? 'border-amber-500 bg-amber-50' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedFlags((prev) => {
                            const next = prev.includes(def.key)
                              ? prev.filter((k) => k !== def.key)
                              : [...prev, def.key];
                            if (next.length > 0) setNoFlagsConfirmed(false);
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded text-teal-600"
                      />
                      <span className="font-medium">{def.label}</span>
                    </label>
                  );
                })}
            </div>

            <label className="flex items-center space-x-2 p-2.5 rounded border border-slate-200 bg-slate-50 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={noFlagsConfirmed}
                disabled={selectedFlags.length > 0}
                onChange={(e) => {
                  setNoFlagsConfirmed(e.target.checked);
                  if (e.target.checked) setSelectedFlags([]);
                }}
                className="h-4 w-4 rounded text-teal-600"
              />
              <span>Confirmed: No listed clinical risk flags apply</span>
            </label>

            <div>
              <Label htmlFor="risk-update-reason" className="text-xs font-semibold text-slate-700">
                Clinical Audit Note (Optional)
              </Label>
              <Input
                id="risk-update-reason"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Updated after antenatal clinic card review"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFlagsOpen(false)}
                disabled={savingFlags}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingFlags}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                {savingFlags ? 'Saving...' : 'Save Risk Flags'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
