import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  OnDutyStaffSummaryDto,
  StaffOnDutyStatus,
  UnassignedAdmissionSummaryDto,
  UserRole,
} from '@lrms/shared';
import { shiftsApi } from '../../../services/shifts.api.js';
import { staffAssignmentsApi } from '../../../services/staff-assignments.api.js';
import { fetchWards } from '../../../services/wards.api.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { OnDutyStatusBadge } from '../../../components/status/Badges.js';
import { Button } from '../../../components/ui/button.js';
import { AlertCircle, Calendar, HeartPulse, Stethoscope, Users, ArrowRight } from 'lucide-react';
import { humanizeEnum } from '../../../lib/labels.js';

export const WardDutyStatusBanner: React.FC = () => {
  const { user } = useAuth();
  const [onDutyRoster, setOnDutyRoster] = useState<OnDutyStaffSummaryDto[]>([]);
  const [unassignedAdmissions, setUnassignedAdmissions] = useState<UnassignedAdmissionSummaryDto[]>(
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const wardsRes = await fetchWards();
        const ward18 =
          wardsRes.success && wardsRes.data?.items?.length
            ? wardsRes.data.items.find((w) => w.code === 'WARD-18') || wardsRes.data.items[0]
            : null;

        const [rosterRes, unassignedRes] = await Promise.all([
          ward18 ? shiftsApi.getOnDutyRoster(ward18.id).catch(() => []) : Promise.resolve([]),
          staffAssignmentsApi.listUnassignedAdmissions().catch(() => []),
        ]);

        if (isMounted) {
          setOnDutyRoster(Array.isArray(rosterRes) ? rosterRes : []);
          setUnassignedAdmissions(Array.isArray(unassignedRes) ? unassignedRes : []);
        }
      } catch (err) {
        console.error('Failed to load dashboard duty status:', err);
      }
    }

    loadStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentUserDuty = onDutyRoster.find((s) => s.userId === user?.id);
  const myStatus = currentUserDuty ? StaffOnDutyStatus.ON_DUTY : StaffOnDutyStatus.OFF_DUTY;
  const activeDoctors = onDutyRoster.filter((s) => s.role === UserRole.DOCTOR);
  const activeNurses = onDutyRoster.filter((s) => s.role === UserRole.NURSE_STAFF);

  return (
    <div className="space-y-3">
      {/* Clinician Duty Status Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            {user?.role === UserRole.DOCTOR ? (
              <Stethoscope className="w-5 h-5" />
            ) : user?.role === UserRole.NURSE_STAFF ? (
              <HeartPulse className="w-5 h-5" />
            ) : (
              <Users className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ward 18 Duty Roster
              </span>
              {user?.role !== UserRole.ADMIN && <OnDutyStatusBadge status={myStatus} />}
            </div>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {user?.role === UserRole.ADMIN ? (
                <span>
                  {onDutyRoster.length} Clinicians On Duty ({activeDoctors.length} Doctors,{' '}
                  {activeNurses.length} Nurses)
                </span>
              ) : currentUserDuty ? (
                <span>
                  Active on {humanizeEnum(currentUserDuty.shiftType)} shift (
                  {currentUserDuty.shiftName})
                </span>
              ) : (
                <span className="text-slate-600 font-normal">
                  You are currently off duty. Active team on duty: {activeDoctors.length} doctors,{' '}
                  {activeNurses.length} nurses.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link to="/shifts">
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
            >
              <Calendar className="w-3.5 h-3.5 mr-1 text-teal-700" />
              Duty Roster & Shifts
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Unassigned Admissions Warning (If any) */}
      {(unassignedAdmissions?.length ?? 0) > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/80 text-xs text-amber-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Clinical Responsibility Attention Needed:</span>{' '}
              {unassignedAdmissions?.length ?? 0} active inpatient
              {(unassignedAdmissions?.length ?? 0) > 1 ? 's lack' : ' lacks'} an attending doctor or
              primary nurse.
            </div>
          </div>
          <Link to="/admissions">
            <Button
              size="sm"
              variant="outline"
              className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100 h-7 px-2.5"
            >
              Review Admissions
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
