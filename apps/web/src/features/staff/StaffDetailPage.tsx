import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Permission, UpdateUserProfileRequest, UserDetailDto, UserRole } from '@lrms/shared';
import {
  fetchUserDetail,
  updateStaffProfile,
  updateStaffRole,
  updateStaffStatus,
  reissueStaffCredential,
} from '../../services/users.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PermissionGuard } from '../../components/auth/PermissionGuard.js';
import { PageHeader, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import { RoleBadge } from '../../components/status/Badges.js';
import { Button } from '../../components/ui/button.js';
import { Badge } from '../../components/ui/badge.js';
import {
  EditStaffProfileDialog,
  ChangeRoleDialog,
  ToggleStatusDialog,
  TemporaryCredentialDialog,
  EphemeralCredentialPayload,
} from './components/StaffDialogs.js';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  UserCog,
  Pencil,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { formatColomboDateTime } from '../../lib/datetime.js';

export const StaffDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [detail, setDetail] = useState<UserDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [issuedCredential, setIssuedCredential] = useState<EphemeralCredentialPayload | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchUserDetail(id);
      if (!res.success || !res.data) {
        setErrorMsg(res.error?.message || 'Unable to load staff profile.');
      } else {
        setDetail(res.data);
      }
    } catch {
      setErrorMsg('Network error loading staff profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const isSelf = Boolean(currentUser && detail && currentUser.id === detail.id);

  const handleProfileSave = async (userId: string, payload: UpdateUserProfileRequest) => {
    const res = await updateStaffProfile(userId, payload);
    if (!res.success) {
      throw new Error(res.error?.message || 'Profile update failed');
    }
    await loadDetail();
  };

  const handleRoleConfirm = async (userId: string, role: UserRole, reason?: string) => {
    const res = await updateStaffRole(userId, { role, reason });
    if (!res.success) {
      throw new Error(res.error?.message || 'Role update failed');
    }
    await loadDetail();
  };

  const handleStatusConfirm = async (userId: string, isActive: boolean, reason?: string) => {
    const res = await updateStaffStatus(userId, { isActive, reason });
    if (!res.success) {
      throw new Error(res.error?.message || 'Status update failed');
    }
    await loadDetail();
  };

  const handleReissueCredential = async () => {
    if (!detail) return;
    setActionError(null);
    const res = await reissueStaffCredential(detail.id);
    if (!res.success || !res.data) {
      setActionError(res.error?.message || 'Unable to reissue temporary password');
      return;
    }
    setIssuedCredential({
      username: res.data.user.username,
      fullName: res.data.user.fullName,
      temporaryPassword: res.data.temporaryPassword,
      temporaryPasswordExpiresAt: res.data.temporaryPasswordExpiresAt,
      isReissue: true,
    });
    await loadDetail();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-xs text-slate-500">
        <Loader2 className="w-5 h-5 mr-2 animate-spin text-teal-600" />
        Loading staff profile...
      </div>
    );
  }

  if (errorMsg || !detail) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg || 'Staff member not found'}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/staff')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Staff Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={detail.fullName}
        description={`Staff Profile · @${detail.username}`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Staff Accounts', href: '/staff' },
          { label: detail.username, active: true },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/staff')}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Directory
            </Button>

            <PermissionGuard permission={Permission.USERS_UPDATE}>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit Profile
              </Button>
            </PermissionGuard>

            <PermissionGuard permission={Permission.USERS_MANAGE_ROLES}>
              <Button
                variant="outline"
                size="sm"
                disabled={isSelf}
                onClick={() => setRoleOpen(true)}
                title={isSelf ? 'Cannot modify your own role' : 'Change system role'}
              >
                <UserCog className="w-3.5 h-3.5 mr-1.5" />
                Change Role
              </Button>
            </PermissionGuard>

            <PermissionGuard permission={Permission.USERS_RESET_CREDENTIAL}>
              <Button
                variant="outline"
                size="sm"
                disabled={isSelf || !detail.isActive}
                onClick={handleReissueCredential}
                title={
                  isSelf
                    ? 'Use Change Password for your own account'
                    : 'Reissue expiring temporary password'
                }
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Reissue Temp Password
              </Button>
            </PermissionGuard>

            <PermissionGuard
              permission={detail.isActive ? Permission.USERS_DEACTIVATE : Permission.USERS_ACTIVATE}
            >
              <Button
                variant={detail.isActive ? 'destructive' : 'default'}
                size="sm"
                disabled={isSelf}
                onClick={() => setStatusOpen(true)}
                className={!detail.isActive ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : ''}
              >
                {detail.isActive ? 'Deactivate Account' : 'Reactivate Account'}
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Account & Access Status"
          description="Authentication identity, role assignment, and credential lifecycle state"
        >
          <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
            <dt className="text-slate-500">Username</dt>
            <dd className="font-mono font-semibold text-slate-900">{detail.username}</dd>

            <dt className="text-slate-500">Assigned Role</dt>
            <dd>
              <RoleBadge role={detail.role} />
            </dd>

            <dt className="text-slate-500">Account Status</dt>
            <dd>
              {detail.isActive ? (
                <span className="inline-flex items-center text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                  ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  <XCircle className="w-3 h-3 mr-1 text-slate-500" />
                  INACTIVE
                </span>
              )}
            </dd>

            <dt className="text-slate-500">Credential State</dt>
            <dd>
              {detail.mustChangePassword ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Password Change Required
                </Badge>
              ) : (
                <span className="text-emerald-700 font-medium">Permanent Password Set</span>
              )}
            </dd>

            <dt className="text-slate-500">Last Password Change</dt>
            <dd className="text-slate-700">
              {detail.passwordChangedAt
                ? formatColomboDateTime(detail.passwordChangedAt)
                : 'Pending first login'}
            </dd>

            <dt className="text-slate-500">Account Created</dt>
            <dd className="text-slate-700">{formatColomboDateTime(detail.createdAt)}</dd>

            <dt className="text-slate-500">Last Updated</dt>
            <dd className="text-slate-700">{formatColomboDateTime(detail.updatedAt)}</dd>
          </dl>
        </SectionCard>

        <SectionCard
          title="Staff Profile Metadata"
          description="Institutional and optional medical/nursing registration references"
        >
          <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
            <dt className="text-slate-500">Full Name</dt>
            <dd className="font-semibold text-slate-900">{detail.fullName}</dd>

            <dt className="text-slate-500">Hospital Staff ID</dt>
            <dd className="font-mono text-slate-800">
              {detail.staffProfile?.staffId || (
                <span className="text-slate-400 italic">Not recorded</span>
              )}
            </dd>

            <dt className="text-slate-500">Official Email</dt>
            <dd className="text-slate-800">
              {detail.email || <span className="text-slate-400 italic">Not recorded</span>}
            </dd>

            <dt className="text-slate-500">Registration Body</dt>
            <dd className="text-slate-800">
              {detail.staffProfile?.professionalRegistrationBody || (
                <span className="text-slate-400 italic">Optional / None</span>
              )}
            </dd>

            <dt className="text-slate-500">Council Reg Number</dt>
            <dd className="font-mono text-slate-800">
              {detail.staffProfile?.professionalRegistrationNumber || (
                <span className="text-slate-400 italic">Optional / None</span>
              )}
            </dd>

            <dt className="text-slate-500">Contact Number</dt>
            <dd className="font-mono text-slate-800">
              {detail.staffProfile?.contactNumber || (
                <span className="text-slate-400 italic">Not recorded</span>
              )}
            </dd>
          </dl>
        </SectionCard>
      </div>

      {/* Ward Assignment History (De-Identified Reference IDs Only) */}
      <SectionCard
        title="Ward Patient Assignment History"
        description="De-identified historical patient-staff assignments recorded in ward workflows"
      >
        {detail.assignmentHistory.length === 0 ? (
          <EmptyState
            title="No patient assignments recorded"
            description="Admission assignments appear here once bedside triage and patient assignment workflows are recorded."
            icon={<ClipboardList className="w-8 h-8 text-slate-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="pb-2">Admission Reference</th>
                  <th className="pb-2">Duty Role</th>
                  <th className="pb-2">Assigned At</th>
                  <th className="pb-2">Unassigned At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.assignmentHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 font-mono font-semibold text-slate-800">
                      {item.admissionReferenceId || item.admissionId}
                    </td>
                    <td className="py-2.5">{item.assignmentRole}</td>
                    <td className="py-2.5 text-slate-600">
                      {formatColomboDateTime(item.assignedAt)}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {item.unassignedAt ? formatColomboDateTime(item.unassignedAt) : 'Active'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Account Security Audit History */}
      <SectionCard
        title="Account Audit Trail"
        description="Immutable security and lifecycle events recorded for this account"
      >
        {detail.auditHistory.length === 0 ? (
          <EmptyState
            title="No audit records found"
            description="Security actions touching this user account are logged here."
            icon={<ShieldCheck className="w-8 h-8 text-slate-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.auditHistory.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 text-slate-600 whitespace-nowrap">
                      {formatColomboDateTime(log.createdAt)}
                    </td>
                    <td className="py-2.5">
                      <Badge variant="outline" className="font-mono text-[10px] bg-slate-50">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-2.5 font-mono text-slate-700">
                      {log.actorUsername || 'SYSTEM'}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-500 max-w-md truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Reusable Dialogs */}
      <EditStaffProfileDialog
        user={editOpen ? detail : null}
        onClose={() => setEditOpen(false)}
        onSubmit={handleProfileSave}
      />

      <ChangeRoleDialog
        user={roleOpen ? detail : null}
        onClose={() => setRoleOpen(false)}
        onConfirm={handleRoleConfirm}
      />

      <ToggleStatusDialog
        user={statusOpen ? detail : null}
        onClose={() => setStatusOpen(false)}
        onConfirm={handleStatusConfirm}
      />

      <TemporaryCredentialDialog
        credential={issuedCredential}
        onClose={() => setIssuedCredential(null)}
      />
    </div>
  );
};
