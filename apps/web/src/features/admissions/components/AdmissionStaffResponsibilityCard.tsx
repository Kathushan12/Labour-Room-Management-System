import React, { useState, useEffect, useCallback } from 'react';
import {
  AdmissionStaffResponsibilityDto,
  StaffAssignmentRole,
  StaffWardAssignmentDto,
  UserRole,
} from '@lrms/shared';
import { staffAssignmentsApi } from '../../../services/staff-assignments.api.js';
import { wardStaffApi } from '../../../services/ward-staff.api.js';
import { SectionCard } from '../../../components/shared/HeadersAndCards.js';
import { Button } from '../../../components/ui/button.js';
import { Badge } from '../../../components/ui/badge.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog.js';
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

interface Props {
  admissionId: string;
  wardId: string;
}

export const AdmissionStaffResponsibilityCard: React.FC<Props> = ({ admissionId, wardId }) => {
  const [responsibility, setResponsibility] = useState<AdmissionStaffResponsibilityDto | null>(
    null,
  );
  const [wardStaff, setWardStaff] = useState<StaffWardAssignmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Transfer Dialog State
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferRole, setTransferRole] = useState<StaffAssignmentRole>(
    StaffAssignmentRole.ATTENDING_DOCTOR,
  );
  const [newStaffId, setNewStaffId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Assign Dialog State
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRole, setAssignRole] = useState<StaffAssignmentRole>(
    StaffAssignmentRole.ATTENDING_DOCTOR,
  );
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Show History Toggle
  const [showHistory, setShowHistory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [resp, staff] = await Promise.all([
        staffAssignmentsApi.getAdmissionStaffResponsibility(admissionId),
        wardStaffApi.listWardStaff(wardId, true),
      ]);
      setResponsibility(resp);
      setWardStaff(staff);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load staff responsibility';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [admissionId, wardId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenTransfer = (role: StaffAssignmentRole) => {
    setTransferRole(role);
    setNewStaffId('');
    setTransferReason('');
    setTransferError(null);
    setTransferOpen(true);
  };

  const handleOpenAssign = (role: StaffAssignmentRole) => {
    setAssignRole(role);
    setAssignStaffId('');
    setAssignError(null);
    setAssignOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffId) {
      setTransferError('Please select a replacement clinician');
      return;
    }

    try {
      setTransferSubmitting(true);
      setTransferError(null);
      await staffAssignmentsApi.transferPatientStaff(admissionId, {
        newStaffId,
        assignmentRole: transferRole,
        reason: transferReason.trim() || undefined,
      });
      setSuccessMsg('Clinical responsibility transferred successfully');
      setTransferOpen(false);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transfer failed';
      setTransferError(msg);
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStaffId) {
      setAssignError('Please select a clinician');
      return;
    }

    try {
      setAssignSubmitting(true);
      setAssignError(null);
      await staffAssignmentsApi.assignPatientStaff(admissionId, {
        staffId: assignStaffId,
        assignmentRole: assignRole,
      });
      setSuccessMsg('Clinician assigned successfully');
      setAssignOpen(false);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Assignment failed';
      setAssignError(msg);
    } finally {
      setAssignSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-lg border border-slate-200 bg-white flex items-center justify-center space-x-2 text-slate-500 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
        <span>Loading clinical responsibility...</span>
      </div>
    );
  }

  if (error || !responsibility) {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error || 'Unable to load staff responsibility.'}</span>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
          Retry
        </Button>
      </div>
    );
  }

  const attendingDoctor = responsibility.attendingDoctor;
  const primaryNurse = responsibility.primaryNurse;
  const supportingStaff = responsibility.supportingStaff;

  // Filter ward staff candidates based on active role
  const eligibleDoctors = wardStaff.filter(
    (ws) => ws.user?.role === UserRole.DOCTOR && ws.userId !== attendingDoctor?.staffId,
  );
  const eligibleNurses = wardStaff.filter(
    (ws) => ws.user?.role === UserRole.NURSE_STAFF && ws.userId !== primaryNurse?.staffId,
  );

  return (
    <SectionCard
      title="Clinical Staff Responsibility"
      description="Active attending doctor and primary nurse accountable for this patient episode"
      action={
        responsibility.history.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory((prev) => !prev)}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            <History className="w-3.5 h-3.5 mr-1" />
            {showHistory ? 'Hide History' : `History (${responsibility.history.length})`}
          </Button>
        ) : undefined
      }
    >
      {successMsg && (
        <div
          role="status"
          className="mb-4 p-2.5 rounded bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-800"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attending Doctor Card */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                <Stethoscope className="w-4 h-4 text-teal-700" />
                <span>Attending Doctor</span>
              </div>
              {attendingDoctor ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                  Active Responsible
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                >
                  Unassigned
                </Badge>
              )}
            </div>

            {attendingDoctor ? (
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-slate-900 text-sm">
                  {attendingDoctor.staff?.fullName || attendingDoctor.staff?.username}
                </div>
                <div className="text-slate-500 text-[11px] font-mono">
                  @{attendingDoctor.staff?.username}
                </div>
                <div className="text-slate-500 text-[11px] flex items-center pt-1">
                  <Clock className="w-3 h-3 mr-1 text-slate-400" />
                  <span>Assigned: {new Date(attendingDoctor.assignedAt).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-700 py-1">
                No attending doctor is currently responsible for this admission episode.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 mt-3 flex justify-end space-x-2">
            {attendingDoctor ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenTransfer(StaffAssignmentRole.ATTENDING_DOCTOR)}
                className="text-xs h-7 border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <ArrowRightLeft className="w-3 h-3 mr-1" />
                Transfer Doctor
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleOpenAssign(StaffAssignmentRole.ATTENDING_DOCTOR)}
                className="text-xs h-7 bg-teal-700 hover:bg-teal-800 text-white"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Assign Doctor
              </Button>
            )}
          </div>
        </div>

        {/* Primary Nurse Card */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                <UserCheck className="w-4 h-4 text-teal-700" />
                <span>Primary Nurse / Midwife</span>
              </div>
              {primaryNurse ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                  Active Responsible
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                >
                  Unassigned
                </Badge>
              )}
            </div>

            {primaryNurse ? (
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-slate-900 text-sm">
                  {primaryNurse.staff?.fullName || primaryNurse.staff?.username}
                </div>
                <div className="text-slate-500 text-[11px] font-mono">
                  @{primaryNurse.staff?.username}
                </div>
                <div className="text-slate-500 text-[11px] flex items-center pt-1">
                  <Clock className="w-3 h-3 mr-1 text-slate-400" />
                  <span>Assigned: {new Date(primaryNurse.assignedAt).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-700 py-1">
                No primary nurse is currently responsible for this admission episode.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 mt-3 flex justify-end space-x-2">
            {primaryNurse ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenTransfer(StaffAssignmentRole.PRIMARY_NURSE)}
                className="text-xs h-7 border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <ArrowRightLeft className="w-3 h-3 mr-1" />
                Transfer Nurse
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleOpenAssign(StaffAssignmentRole.PRIMARY_NURSE)}
                className="text-xs h-7 bg-teal-700 hover:bg-teal-800 text-white"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Assign Nurse
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Supporting Clinicians */}
      {supportingStaff.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-2">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Supporting Clinicians ({supportingStaff.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {supportingStaff.map((s) => (
              <Badge key={s.id} variant="secondary" className="text-xs py-1 px-2">
                {s.staff?.fullName || s.staff?.username} ({s.assignmentRole.replace('_', ' ')})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Expandable History Drawer */}
      {showHistory && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <h4 className="text-xs font-semibold text-slate-800 mb-2">Assignment History</h4>
          <div className="space-y-2">
            {responsibility.history.map((h) => (
              <div
                key={h.id}
                className="p-2.5 rounded border border-slate-200 bg-white text-xs flex justify-between items-start"
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    {h.staff?.fullName || h.staff?.username}{' '}
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({h.assignmentRole.replace('_', ' ')})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    From {new Date(h.assignedAt).toLocaleString()}
                    {h.unassignedAt
                      ? ` to ${new Date(h.unassignedAt).toLocaleString()}`
                      : ' (Active)'}
                  </div>
                  {h.endReason && (
                    <div className="text-[11px] text-slate-600 mt-1 italic">
                      Reason: {h.endReason}
                    </div>
                  )}
                </div>
                <div>
                  {h.unassignedAt ? (
                    <Badge variant="outline" className="text-[10px] text-slate-500">
                      Ended
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-800">Active</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responsibility Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Transfer {transferRole.replace('_', ' ')} Responsibility
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Select an active Ward 18 clinician to assume responsibility for this patient episode.
            </DialogDescription>
          </DialogHeader>

          {transferError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{transferError}</span>
            </div>
          )}

          <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                New Responsible Clinician <span className="text-red-500">*</span>
              </Label>
              <select
                value={newStaffId}
                onChange={(e) => setNewStaffId(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                required
              >
                <option value="">-- Select Clinician --</option>
                {(transferRole === StaffAssignmentRole.ATTENDING_DOCTOR
                  ? eligibleDoctors
                  : eligibleNurses
                ).map((ws) => (
                  <option key={ws.userId} value={ws.userId}>
                    {ws.user?.fullName || ws.user?.username} (@{ws.user?.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Reason / Shift Handover Notes
              </Label>
              <Input
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. End of shift handover to Dr. Silva"
                className="mt-1 text-xs"
                maxLength={500}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransferOpen(false)}
                disabled={transferSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={transferSubmitting || !newStaffId}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                {transferSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  'Confirm Transfer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Initial Assign Clinician Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Assign {assignRole.replace('_', ' ')}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Nominate an active Ward 18 clinician to assume primary responsibility.
            </DialogDescription>
          </DialogHeader>

          {assignError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{assignError}</span>
            </div>
          )}

          <form onSubmit={handleAssignSubmit} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Clinician <span className="text-red-500">*</span>
              </Label>
              <select
                value={assignStaffId}
                onChange={(e) => setAssignStaffId(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                required
              >
                <option value="">-- Select Clinician --</option>
                {(assignRole === StaffAssignmentRole.ATTENDING_DOCTOR
                  ? wardStaff.filter((ws) => ws.user?.role === UserRole.DOCTOR)
                  : wardStaff.filter((ws) => ws.user?.role === UserRole.NURSE_STAFF)
                ).map((ws) => (
                  <option key={ws.userId} value={ws.userId}>
                    {ws.user?.fullName || ws.user?.username} (@{ws.user?.username})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignOpen(false)}
                disabled={assignSubmitting}
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
    </SectionCard>
  );
};
