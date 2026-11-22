import React, { useEffect, useState } from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { BedDouble, Users, UserPlus, ShieldAlert, FileBarChart2, Activity } from 'lucide-react';
import {
  AdmissionStatus,
  BedBoardSummaryDto,
  BedFunctioningStatus,
  UserListItemDto,
} from '@lrms/shared';
import { BedStatusBadge, RoleBadge } from '../../components/status/Badges.js';
import { WardDutyStatusBanner } from './components/WardDutyStatusBanner.js';
import { AlertTimeoutCard } from './components/AlertTimeoutCard.js';
import { Button } from '../../components/ui/button.js';
import { Link } from 'react-router-dom';
import { useActiveWard } from '../../hooks/useActiveWard.js';
import { fetchWardBedBoard } from '../../services/wards.api.js';
import { fetchAdmissions } from '../../services/admissions.api.js';
import { fetchUsers } from '../../services/users.api.js';

export const AdminDashboard: React.FC = () => {
  const { ward, loading: wardLoading } = useActiveWard();
  const [bedBoard, setBedBoard] = useState<BedBoardSummaryDto | null>(null);
  const [activeAdmissions, setActiveAdmissions] = useState<number | null>(null);
  const [staffTotal, setStaffTotal] = useState<number | null>(null);
  const [staffPreview, setStaffPreview] = useState<UserListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wardLoading) return;
    let mounted = true;
    setError(null);
    Promise.all([
      ward ? fetchWardBedBoard(ward.id) : Promise.resolve(null),
      fetchAdmissions({ status: AdmissionStatus.ADMITTED, limit: 1 }),
      fetchUsers({ status: 'ACTIVE', limit: 3, sortBy: 'fullName', sortOrder: 'ASC' }),
    ])
      .then(([boardRes, admissionsRes, usersRes]) => {
        if (!mounted) return;
        if (boardRes?.success && boardRes.data) setBedBoard(boardRes.data);
        if (admissionsRes.success && admissionsRes.data) {
          setActiveAdmissions(admissionsRes.data.pagination.total);
        }
        if (usersRes.success && usersRes.data) {
          setStaffTotal(usersRes.data.pagination.total);
          setStaffPreview(usersRes.data.items);
        }
        if (!boardRes?.success && !admissionsRes.success && !usersRes.success) {
          setError('Could not load dashboard data.');
        }
      })
      .catch(() => {
        if (mounted) setError('Could not reach the server. Check your connection and try again.');
      });
    return () => {
      mounted = false;
    };
  }, [ward, wardLoading]);

  const beds = bedBoard?.beds ?? [];
  const functioningBeds = bedBoard?.functioningBedsCount ?? 0;
  const outOfServiceBeds = bedBoard?.outOfServiceBedsCount ?? 0;
  const occupiedBeds = bedBoard?.occupiedBedsCount ?? 0;
  const dash = (n: number | null) => (n === null ? '…' : n);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Ward Administration Dashboard"
        description="System overview, ward physical inventory, staff accounts, operational reports, and forensic audit logs."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admin Dashboard', active: true },
        ]}
      />

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      {/* Real-time Ward Duty & Responsibility Status */}
      <WardDutyStatusBanner />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Installed Physical Beds"
          value={bedBoard ? beds.length : '…'}
          subtitle={`${functioningBeds} Functioning, ${outOfServiceBeds} Out of Service`}
          icon={<BedDouble className="w-5 h-5 text-slate-700" />}
        />
        <StatCard
          title="Current Bed Occupancy"
          value={`${occupiedBeds} / ${functioningBeds}`}
          subtitle={`${functioningBeds - occupiedBeds} Available for admission`}
          icon={<Activity className="w-5 h-5 text-teal-600" />}
          trend="Dynamic Ward"
        />
        <StatCard
          title="Active Admissions"
          value={dash(activeAdmissions)}
          subtitle={`Currently admitted in ${ward?.name ?? 'ward'}`}
          icon={<UserPlus className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Registered Staff Accounts"
          value={dash(staffTotal)}
          subtitle="Doctors, Midwives, Administrators"
          icon={<Users className="w-5 h-5 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ward Bed Status Overview */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Ward Physical Beds & Operational Status"
            description="Dynamic bed functioning and occupancy states (configurable capacity)"
            action={
              <Link to="/beds">
                <Button variant="outline" size="sm" className="text-xs">
                  Manage Bed Board
                </Button>
              </Link>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {beds.map((bed) => (
                <div
                  key={bed.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col justify-between shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{bed.bedNumber}</span>
                    <BedStatusBadge displayStatus={bed.displayStatus} />
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    {bed.currentAllocation ? (
                      <span className="font-medium text-slate-800">
                        {bed.currentAllocation.admissionReferenceId}
                      </span>
                    ) : bed.functioningStatus === BedFunctioningStatus.OUT_OF_SERVICE ? (
                      <span className="text-red-700 font-medium">Under Maintenance</span>
                    ) : (
                      <span>Ready for intake</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Administration Navigation & Quick Links */}
        <div className="space-y-6">
          {ward && <AlertTimeoutCard ward={ward} />}

          <SectionCard
            title="Administrative Control"
            description="Shortcuts to configuration modules"
          >
            <div className="space-y-2">
              <Link to="/staff" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10">
                  <Users className="w-4 h-4 mr-2 text-slate-500" />
                  Staff Account Management
                </Button>
              </Link>
              <Link to="/reports" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10">
                  <FileBarChart2 className="w-4 h-4 mr-2 text-slate-500" />
                  Ward Operational Reports
                </Button>
              </Link>
              <Link to="/audit" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10">
                  <ShieldAlert className="w-4 h-4 mr-2 text-slate-500" />
                  Forensic Security Audit Logs
                </Button>
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            title="Registered Staff Directory"
            description="Active clinical users"
            action={
              <Link to="/staff">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </Link>
            }
          >
            <div className="space-y-2.5">
              {staffPreview.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 border border-slate-100"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{staff.fullName}</p>
                    <p className="text-[10px] text-slate-500">
                      {staff.staffProfile?.professionalRegistrationNumber || staff.username}
                    </p>
                  </div>
                  <RoleBadge role={staff.role} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
