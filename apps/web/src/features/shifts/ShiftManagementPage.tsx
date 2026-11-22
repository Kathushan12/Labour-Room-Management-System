import React, { useState, useEffect, useCallback } from 'react';
import {
  CreateShiftHandoverRequest,
  CreateShiftRequest,
  OnDutyStaffSummaryDto,
  Permission,
  ShiftDto,
  ShiftHandoverDto,
  ShiftStaffAssignmentDto,
  ShiftStatus,
  ShiftType,
  StaffWardAssignmentDto,
  UserRole,
} from '@lrms/shared';
import { shiftsApi } from '../../services/shifts.api.js';
import { wardStaffApi } from '../../services/ward-staff.api.js';
import { fetchWards } from '../../services/wards.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PageHeader, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import {
  ShiftStatusBadge,
  ShiftTypeBadge,
  RoleBadge,
  OnDutyStatusBadge,
} from '../../components/status/Badges.js';
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
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Stethoscope,
  HeartPulse,
  UserX,
  ArrowRightLeft,
} from 'lucide-react';
import { formatColomboDateTime, formatColomboTime } from '../../lib/datetime.js';
import { humanizeEnum, roleLabel } from '../../lib/labels.js';

export const ShiftManagementPage: React.FC = () => {
  const { user, permissions } = useAuth();
  const canManageShifts =
    permissions.includes(Permission.SHIFTS_MANAGE) || user?.role === UserRole.ADMIN;
  const canAssignStaff =
    permissions.includes(Permission.SHIFT_ASSIGNMENTS_MANAGE) || user?.role === UserRole.ADMIN;
  const canCreateHandover =
    permissions.includes(Permission.HANDOVERS_CREATE) ||
    user?.role === UserRole.DOCTOR ||
    user?.role === UserRole.NURSE_STAFF;

  const [wardId, setWardId] = useState<string>('');
  const [wardName, setWardName] = useState<string>('Ward 18 — Labour Room');
  const [onDutyRoster, setOnDutyRoster] = useState<OnDutyStaffSummaryDto[]>([]);
  const [shifts, setShifts] = useState<
    (ShiftDto & { staffAssignments?: ShiftStaffAssignmentDto[] })[]
  >([]);
  const [wardStaff, setWardStaff] = useState<StaffWardAssignmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog states
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftDto | null>(null);
  const [shiftHandovers, setShiftHandovers] = useState<ShiftHandoverDto[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);

  // Schedule shift form
  const [newShiftType, setNewShiftType] = useState<ShiftType>(ShiftType.MORNING);
  const [newShiftName, setNewShiftName] = useState('');
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newEndsAt, setNewEndsAt] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  // Assign staff form
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Handover form
  const [incomingStaffId, setIncomingStaffId] = useState('');
  const [generalSummary, setGeneralSummary] = useState('');
  const [highRiskSummary, setHighRiskSummary] = useState('');
  const [pendingTasks, setPendingTasks] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [activePatientsCount, setActivePatientsCount] = useState<number>(0);
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  // Initialize Ward ID (defaults to Ward 18)
  useEffect(() => {
    async function loadWard() {
      try {
        const wardsRes = await fetchWards();
        if (wardsRes.success && wardsRes.data?.items?.length) {
          const ward18 =
            wardsRes.data.items.find((w) => w.code === 'WARD-18') || wardsRes.data.items[0];
          setWardId(ward18.id);
          setWardName(`${ward18.name} (${ward18.code})`);
        }
      } catch (err) {
        console.error('Failed to load wards:', err);
      }
    }
    loadWard();
  }, []);

  // Load shifts, on-duty roster, and ward staff
  const loadData = useCallback(async () => {
    if (!wardId) return;
    setLoading(true);
    setError(null);
    try {
      const [onDutyRes, shiftsRes, staffRes] = await Promise.all([
        shiftsApi.getOnDutyRoster(wardId),
        shiftsApi.listShifts(wardId, {
          status: statusFilter !== 'ALL' ? (statusFilter as ShiftStatus) : undefined,
        }),
        wardStaffApi.listWardStaff(wardId, true),
      ]);

      setOnDutyRoster(onDutyRes);
      setShifts(shiftsRes);
      setWardStaff(staffRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load shift management data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [wardId, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Schedule Shift Submit
  const handleScheduleShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardId || !newStartsAt || !newEndsAt) {
      setError('Please provide start and end times for the shift.');
      return;
    }

    if (new Date(newEndsAt) <= new Date(newStartsAt)) {
      setError('Shift end time must be after start time.');
      return;
    }

    setScheduleSubmitting(true);
    setError(null);
    try {
      const defaultName = `${newShiftType.charAt(0) + newShiftType.slice(1).toLowerCase()} Shift (${new Date().toISOString().split('T')[0]})`;
      const payload: CreateShiftRequest = {
        wardId,
        shiftType: newShiftType,
        name: newShiftName.trim() || defaultName,
        startsAt: new Date(newStartsAt).toISOString(),
        endsAt: new Date(newEndsAt).toISOString(),
        notes: newNotes.trim() || undefined,
      };

      await shiftsApi.createShift(wardId, payload);
      setSuccessMsg('Shift scheduled successfully.');
      setScheduleOpen(false);
      // Reset form
      setNewShiftName('');
      setNewStartsAt('');
      setNewEndsAt('');
      setNewNotes('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule shift';
      setError(msg);
    } finally {
      setScheduleSubmitting(false);
    }
  };

  // Update Shift Status (e.g. IN_PROGRESS, COMPLETED, CANCELLED)
  const handleUpdateShiftStatus = async (shift: ShiftDto, newStatus: ShiftStatus) => {
    if (!wardId) return;
    setError(null);
    try {
      await shiftsApi.updateShift(wardId, shift.id, { status: newStatus });
      setSuccessMsg(`Shift marked as ${humanizeEnum(newStatus).toLowerCase()}.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to update shift status`;
      setError(msg);
    }
  };

  // Open Assign Staff Dialog
  const handleOpenAssign = (shift: ShiftDto) => {
    setSelectedShift(shift);
    setAssignStaffId('');
    setError(null);
    setAssignOpen(true);
  };

  // Assign Staff Submit
  const handleAssignStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardId || !selectedShift || !assignStaffId) return;
    setAssignSubmitting(true);
    setError(null);
    try {
      await shiftsApi.assignStaffToShift(wardId, selectedShift.id, {
        userId: assignStaffId,
      });
      setSuccessMsg('Staff member assigned to shift.');
      setAssignOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign staff to shift';
      setError(msg);
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Cancel Staff Shift Assignment
  const handleCancelStaffAssignment = async (shiftId: string, assignmentId: string) => {
    if (!wardId) return;
    if (!window.confirm('Remove this staff member from the shift?')) return;
    setError(null);
    try {
      await shiftsApi.cancelStaffAssignment(wardId, shiftId, assignmentId, {
        cancellationReason: 'Administrative reassignment',
      });
      setSuccessMsg('Staff removed from shift.');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove staff assignment';
      setError(msg);
    }
  };

  // Open Handover Dialog
  const handleOpenHandover = async (shift: ShiftDto) => {
    setSelectedShift(shift);
    setIncomingStaffId('');
    setGeneralSummary('');
    setHighRiskSummary('');
    setPendingTasks('');
    setFollowUpInstructions('');
    setActivePatientsCount(0);
    setError(null);
    setHandoverOpen(true);

    if (wardId) {
      setDialogLoading(true);
      try {
        const handovers = await shiftsApi.listHandovers(wardId, shift.id);
        setShiftHandovers(handovers);
      } catch (err) {
        console.error('Failed to load shift handovers:', err);
      } finally {
        setDialogLoading(false);
      }
    }
  };

  // Create Handover Submit
  const handleCreateHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardId || !selectedShift || !user?.id || !incomingStaffId || !generalSummary) {
      setError('Please provide incoming staff and a general clinical handover summary.');
      return;
    }
    setHandoverSubmitting(true);
    setError(null);
    try {
      const notes = [
        generalSummary.trim(),
        highRiskSummary ? `\n\nHigh-Risk Concerns:\n${highRiskSummary.trim()}` : '',
        pendingTasks ? `\n\nPending Tasks:\n${pendingTasks.trim()}` : '',
        followUpInstructions ? `\n\nFollow-up Instructions:\n${followUpInstructions.trim()}` : '',
        activePatientsCount ? `\n\nActive Inpatients: ${activePatientsCount}` : '',
      ]
        .filter(Boolean)
        .join('');

      const payload: CreateShiftHandoverRequest = {
        shiftId: selectedShift.id,
        incomingUserId: incomingStaffId,
        handoverNotes: notes,
      };

      await shiftsApi.createHandover(wardId, selectedShift.id, payload);
      setSuccessMsg('Clinical shift handover recorded.');
      const updatedHandovers = await shiftsApi.listHandovers(wardId, selectedShift.id);
      setShiftHandovers(updatedHandovers);
      // Reset form fields
      setGeneralSummary('');
      setHighRiskSummary('');
      setPendingTasks('');
      setFollowUpInstructions('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create handover';
      setError(msg);
    } finally {
      setHandoverSubmitting(false);
    }
  };

  // Acknowledge Handover
  const handleAcknowledgeHandover = async (handoverId: string) => {
    if (!wardId || !selectedShift) return;
    setError(null);
    try {
      await shiftsApi.acknowledgeHandover(wardId, selectedShift.id, handoverId, {
        acknowledgementNotes: 'Handover received and acknowledged on shift.',
      });
      setSuccessMsg('Shift handover acknowledged.');
      const updatedHandovers = await shiftsApi.listHandovers(wardId, selectedShift.id);
      setShiftHandovers(updatedHandovers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to acknowledge handover';
      setError(msg);
    }
  };

  const doctorsOnDuty = onDutyRoster.filter((s) => s.role === UserRole.DOCTOR);
  const nursesOnDuty = onDutyRoster.filter((s) => s.role === UserRole.NURSE_STAFF);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Duty Roster & Shift Scheduling"
        description={`${wardName} — Real-time on-duty clinical team, shift schedules, and structured handovers.`}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canManageShifts && (
              <Button
                size="sm"
                onClick={() => setScheduleOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Schedule Shift
              </Button>
            )}
          </div>
        }
      />

      {/* Global Alerts */}
      {error && (
        <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-xs text-red-600 h-6 px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccessMsg(null)}
            className="text-xs text-emerald-600 h-6 px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Real-Time Live On-Duty Roster Banner */}
      <SectionCard
        title="Live Ward On-Duty Roster"
        description="Currently active clinical staff dynamically derived from verified shifts and ward assignments."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
              {onDutyRoster.length}
            </div>
            <div>
              <p className="text-xs text-teal-800 font-medium">Total On Duty</p>
              <p className="text-lg font-bold text-teal-950">{onDutyRoster.length} Clinicians</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-800 font-medium">Attending Doctors</p>
              <p className="text-lg font-bold text-emerald-950">{doctorsOnDuty.length} On Duty</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-blue-800 font-medium">Primary / Ward Nurses</p>
              <p className="text-lg font-bold text-blue-950">{nursesOnDuty.length} On Duty</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium">Active Shift Window</p>
              <p className="text-xs font-semibold text-slate-800">
                {onDutyRoster[0]?.shiftType
                  ? `${humanizeEnum(onDutyRoster[0].shiftType)} shift`
                  : 'No active shift'}
              </p>
            </div>
          </div>
        </div>

        {/* Staff Badges / Listing */}
        {onDutyRoster.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-amber-200 bg-amber-50 rounded-lg">
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-amber-900">No Clinicians Currently On Duty</p>
            <p className="text-xs text-amber-700 mt-1">
              Active shifts in progress with assigned staff will automatically display here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {onDutyRoster.map((staff) => (
              <div
                key={staff.userId}
                className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-teal-300 transition-colors shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <RoleBadge role={staff.role} />
                    <OnDutyStatusBadge status={staff.dutyStatus} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{staff.fullName}</h4>
                  <p className="text-xs text-slate-500 font-mono">@{staff.username}</p>
                </div>
                {staff.shiftType && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                    <ShiftTypeBadge type={staff.shiftType} />
                    <span className="text-[11px] font-mono text-slate-500">
                      {formatColomboTime(staff.shiftStartsAt)}{' '}
                      -{' '}
                      {formatColomboTime(staff.shiftEndsAt)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Shift Schedule List & Roster Management */}
      <SectionCard
        title="Shift Schedule & Rosters"
        description="Upcoming, active, and completed shifts. Assign clinicians and record structured handovers."
        action={
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg text-xs">
            {['ALL', 'IN_PROGRESS', 'SCHEDULED', 'COMPLETED', 'CANCELLED'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === filter
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter === 'ALL' ? 'All Shifts' : humanizeEnum(filter)}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
            Loading shift rosters and schedules...
          </div>
        ) : shifts.length === 0 ? (
          <EmptyState
            title="No Shifts Found"
            description={
              statusFilter === 'ALL'
                ? 'No shifts have been created for this ward yet.'
                : `No shifts currently match filter '${statusFilter}'.`
            }
            actionLabel={canManageShifts ? 'Schedule First Shift' : undefined}
            onAction={canManageShifts ? () => setScheduleOpen(true) : undefined}
          />
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm space-y-4"
              >
                {/* Shift Card Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <ShiftTypeBadge type={shift.shiftType} />
                    <ShiftStatusBadge status={shift.status} />
                    <h3 className="text-sm font-bold text-slate-900">{shift.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {formatColomboDateTime(shift.startsAt)}{' '}
                      —{' '}
                      {formatColomboDateTime(shift.endsAt)}
                    </span>
                  </div>
                </div>

                {shift.notes && (
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    "{shift.notes}"
                  </p>
                )}

                {/* Assigned Staff Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Assigned Shift Staff ({shift.staffAssignments?.length || 0})
                    </h4>
                    {canAssignStaff &&
                      shift.status !== ShiftStatus.COMPLETED &&
                      shift.status !== ShiftStatus.CANCELLED && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAssign(shift)}
                          className="text-xs text-teal-700 hover:text-teal-800 h-6 px-2"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Assign Clinician
                        </Button>
                      )}
                  </div>

                  {shift.staffAssignments && shift.staffAssignments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {shift.staffAssignments.map((sa: ShiftStaffAssignmentDto) => (
                        <div
                          key={sa.id}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2 overflow-hidden">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                              {sa.user?.fullName?.[0] || 'S'}
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-slate-900 truncate">
                                {sa.user?.fullName}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {roleLabel(sa.user?.role)} • {humanizeEnum(sa.status)}
                              </p>
                            </div>
                          </div>

                          {canAssignStaff &&
                            shift.status !== ShiftStatus.COMPLETED &&
                            shift.status !== ShiftStatus.CANCELLED && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelStaffAssignment(shift.id, sa.id)}
                                className="text-slate-400 hover:text-red-600 h-6 w-6 p-0 flex-shrink-0"
                                title="Remove from shift"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </Button>
                            )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No staff assigned to this shift yet.
                    </p>
                  )}
                </div>

                {/* Shift Actions Bar */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {/* Lifecycle Transitions for Admins / Managers */}
                    {canManageShifts && shift.status === ShiftStatus.SCHEDULED && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateShiftStatus(shift, ShiftStatus.IN_PROGRESS)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Start Shift
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateShiftStatus(shift, ShiftStatus.CANCELLED)}
                          className="text-red-700 border-red-200 hover:bg-red-50 text-xs h-7 px-2.5"
                        >
                          Cancel Shift
                        </Button>
                      </>
                    )}

                    {canManageShifts && shift.status === ShiftStatus.IN_PROGRESS && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateShiftStatus(shift, ShiftStatus.COMPLETED)}
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-7 px-2.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Complete Shift
                      </Button>
                    )}
                  </div>

                  {/* Handover Button */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenHandover(shift)}
                      className="text-xs text-slate-700 border-slate-300 hover:bg-slate-50 h-7 px-2.5"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1 text-teal-700" />
                      Clinical Handover Notes
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ======================================================== */}
      {/* Schedule Shift Dialog */}
      {/* ======================================================== */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Schedule New Clinical Shift
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Create a duty shift window for Ward 18. Timestamps conform to Asia/Colombo (+05:30).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleShift} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Shift Type *</Label>
              <select
                value={newShiftType}
                onChange={(e) => {
                  const type = e.target.value as ShiftType;
                  setNewShiftType(type);
                  // Auto-suggest name
                  const dateStr = new Date().toISOString().split('T')[0];
                  setNewShiftName(
                    `${type.charAt(0) + type.slice(1).toLowerCase()} Shift (${dateStr})`,
                  );
                }}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value={ShiftType.MORNING}>Morning Shift (07:00 - 13:00 / 15:00)</option>
                <option value={ShiftType.EVENING}>Evening Shift (13:00 - 19:00 / 21:00)</option>
                <option value={ShiftType.NIGHT}>Night Shift (19:00 - 07:00)</option>
                <option value={ShiftType.CUSTOM}>Custom Shift Window</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Shift Name</Label>
              <Input
                value={newShiftName}
                onChange={(e) => setNewShiftName(e.target.value)}
                placeholder="e.g. Morning Shift (2026-11-14)"
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Starts At *</Label>
                <Input
                  type="datetime-local"
                  required
                  value={newStartsAt}
                  onChange={(e) => setNewStartsAt(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Ends At *</Label>
                <Input
                  type="datetime-local"
                  required
                  value={newEndsAt}
                  onChange={(e) => setNewEndsAt(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Shift Notes</Label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                placeholder="Staffing notes, handover directives, special observations..."
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScheduleOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={scheduleSubmitting}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                {scheduleSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Shift'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* Assign Staff To Shift Dialog */}
      {/* ======================================================== */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Assign Clinician to Shift
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Assign an active Ward 18 doctor or nurse. Overlapping shifts are strictly prevented by
              transactional validation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignStaffSubmit} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Select Clinician *</Label>
              <select
                required
                value={assignStaffId}
                onChange={(e) => setAssignStaffId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">-- Choose active Ward 18 staff --</option>
                {wardStaff.map((ws) => (
                  <option key={ws.userId} value={ws.userId}>
                    {ws.user?.fullName} ({roleLabel(ws.user?.role)})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={assignSubmitting || !assignStaffId}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                {assignSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Confirm Assignment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* Shift Handover Dialog */}
      {/* ======================================================== */}
      <Dialog open={handoverOpen} onOpenChange={setHandoverOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Clinical Shift Handover — {selectedShift?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Structured clinical handover between outgoing and incoming clinicians with explicit
              acknowledgement.
            </DialogDescription>
          </DialogHeader>

          {/* Past Shift Handovers */}
          <div className="space-y-3 mb-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recorded Handovers for this Shift ({shiftHandovers.length})
            </h4>

            {dialogLoading ? (
              <div className="p-4 text-center text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-teal-600" />
                Loading handover records...
              </div>
            ) : shiftHandovers.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                No handovers logged for this shift yet. Outgoing staff may submit below.
              </p>
            ) : (
              <div className="space-y-3">
                {shiftHandovers.map((ho) => (
                  <div
                    key={ho.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-800">
                          From: {ho.outgoingUser?.fullName}
                        </span>
                        <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-800">
                          To: {ho.incomingUser?.fullName}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          ho.status === 'ACKNOWLEDGED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }
                      >
                        {humanizeEnum(ho.status)}
                      </Badge>
                    </div>

                    <div>
                      <p className="font-medium text-slate-700">Handover Notes:</p>
                      <p className="text-slate-900 mt-0.5 whitespace-pre-wrap">
                        {ho.handoverNotes}
                      </p>
                    </div>

                    {ho.acknowledgementNotes && (
                      <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                        <p className="font-semibold text-emerald-900">Acknowledgement:</p>
                        <p className="text-emerald-950 mt-0.5">{ho.acknowledgementNotes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                      <span>Logged: {formatColomboDateTime(ho.createdAt)}</span>
                      {ho.acknowledgedAt && (
                        <span>Acknowledged: {formatColomboDateTime(ho.acknowledgedAt)}</span>
                      )}
                    </div>

                    {/* Acknowledge Button for incoming staff */}
                    {ho.status === 'PENDING' &&
                      (user?.id === ho.incomingUserId || user?.role === UserRole.ADMIN) && (
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledgeHandover(ho.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Acknowledge Handover
                          </Button>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Handover Form */}
          {canCreateHandover && (
            <form
              onSubmit={handleCreateHandoverSubmit}
              className="space-y-3 pt-3 border-t border-slate-200"
            >
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Record New Clinical Handover
              </h4>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Incoming Clinician *</Label>
                <select
                  required
                  value={incomingStaffId}
                  onChange={(e) => setIncomingStaffId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">-- Choose incoming staff member --</option>
                  {wardStaff
                    .filter((ws) => ws.userId !== user?.id)
                    .map((ws) => (
                      <option key={ws.userId} value={ws.userId}>
                        {ws.user?.fullName} ({roleLabel(ws.user?.role)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  General Clinical Summary *
                </Label>
                <textarea
                  required
                  rows={2}
                  value={generalSummary}
                  onChange={(e) => setGeneralSummary(e.target.value)}
                  placeholder="Overview of labor room status, bed occupancies, maternal admissions..."
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  High-Risk Patients Summary
                </Label>
                <textarea
                  rows={2}
                  value={highRiskSummary}
                  onChange={(e) => setHighRiskSummary(e.target.value)}
                  placeholder="Specific pre-eclampsia, fetal distress, or emergency surgical concerns..."
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Pending Tasks / Labs
                  </Label>
                  <Input
                    value={pendingTasks}
                    onChange={(e) => setPendingTasks(e.target.value)}
                    placeholder="e.g. Cross-match blood sent, repeat CTG at 22:00"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Active Inpatients Count
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={activePatientsCount}
                    onChange={(e) => setActivePatientsCount(parseInt(e.target.value) || 0)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Follow-up Instructions
                </Label>
                <Input
                  value={followUpInstructions}
                  onChange={(e) => setFollowUpInstructions(e.target.value)}
                  placeholder="e.g. Inform VOG if cervical dilation < 1cm in 4 hours"
                  className="mt-1 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHandoverOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={handoverSubmitting || !incomingStaffId || !generalSummary}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
                >
                  {handoverSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Record Handover'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
