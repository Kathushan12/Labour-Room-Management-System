import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreateUserRequest,
  Permission,
  StaffWardAssignmentDto,
  UpdateUserProfileRequest,
  UserListItemDto,
  UserRole,
} from '@lrms/shared';
import {
  fetchUsers,
  createStaffUser,
  updateStaffProfile,
  updateStaffRole,
  updateStaffStatus,
  reissueStaffCredential,
  ListUsersParams,
} from '../../services/users.api.js';
import { wardStaffApi } from '../../services/ward-staff.api.js';
import { fetchWards } from '../../services/wards.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PermissionGuard } from '../../components/auth/PermissionGuard.js';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { FilterBar } from '../../components/shared/FilterBar.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import { RoleBadge } from '../../components/status/Badges.js';
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
  ProvisionStaffDialog,
  EditStaffProfileDialog,
  ChangeRoleDialog,
  ToggleStatusDialog,
  TemporaryCredentialDialog,
  EphemeralCredentialPayload,
} from './components/StaffDialogs.js';
import {
  Users,
  UserPlus,
  UserMinus,
  Building2,
  Stethoscope,
  HeartPulse,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Pencil,
  UserCog,
  KeyRound,
  Eye,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatColomboDate } from '../../lib/datetime.js';
import { roleLabel } from '../../lib/labels.js';

export const StaffManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Directory query & pagination state
  const [items, setItems] = useState<UserListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<NonNullable<ListUsersParams['sortBy']>>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItemDto | null>(null);
  const [roleTargetUser, setRoleTargetUser] = useState<UserListItemDto | null>(null);
  const [statusTargetUser, setStatusTargetUser] = useState<UserListItemDto | null>(null);
  const [issuedCredential, setIssuedCredential] = useState<EphemeralCredentialPayload | null>(null);

  // Tab & Ward 18 Roster state
  const [activeTab, setActiveTab] = useState<'directory' | 'ward-roster'>('directory');
  const [wardId, setWardId] = useState<string>('');
  const [wardRoster, setWardRoster] = useState<StaffWardAssignmentDto[]>([]);
  const [wardLoading, setWardLoading] = useState(false);
  const [assignWardModalOpen, setAssignWardModalOpen] = useState(false);
  const [assignWardUserId, setAssignWardUserId] = useState('');
  const [assignWardNotes, setAssignWardNotes] = useState('');
  const [endWardTarget, setEndWardTarget] = useState<StaffWardAssignmentDto | null>(null);
  const [endWardReason, setEndWardReason] = useState('');
  const [wardSubmitting, setWardSubmitting] = useState(false);

  // Initialize Ward ID (defaults to Ward 18)
  useEffect(() => {
    async function loadWard() {
      try {
        const res = await fetchWards();
        if (res.success && res.data?.items?.length) {
          const ward18 = res.data.items.find((w) => w.code === 'WARD-18') || res.data.items[0];
          setWardId(ward18.id);
        }
      } catch (err) {
        console.error('Failed to load wards:', err);
      }
    }
    loadWard();
  }, []);

  const loadWardRoster = useCallback(async (targetWardId: string) => {
    setWardLoading(true);
    try {
      const roster = await wardStaffApi.listWardStaff(targetWardId, false);
      setWardRoster(roster);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load ward roster';
      setErrorMsg(msg);
    } finally {
      setWardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ward-roster' && wardId) {
      loadWardRoster(wardId);
    }
  }, [activeTab, wardId, loadWardRoster]);

  const handleAssignToWard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardId || !assignWardUserId) return;
    setWardSubmitting(true);
    try {
      await wardStaffApi.assignStaffToWard(wardId, {
        userId: assignWardUserId,
        wardId,
        notes: assignWardNotes.trim() || undefined,
      });
      setActionBanner('Staff clinician assigned to Ward 18.');
      setAssignWardModalOpen(false);
      setAssignWardUserId('');
      setAssignWardNotes('');
      await loadWardRoster(wardId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to assign staff to ward';
      setErrorMsg(msg);
    } finally {
      setWardSubmitting(false);
    }
  };

  const handleEndWardAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardId || !endWardTarget) return;
    setWardSubmitting(true);
    try {
      await wardStaffApi.endStaffWardAssignment(wardId, endWardTarget.id, {
        notes: endWardReason.trim() || 'Administrative roster rotation',
      });
      setActionBanner(`Ended Ward 18 assignment for ${endWardTarget.user?.fullName || 'staff'}.`);
      setEndWardTarget(null);
      setEndWardReason('');
      await loadWardRoster(wardId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to end ward assignment';
      setErrorMsg(msg);
    } finally {
      setWardSubmitting(false);
    }
  };

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchUsers({
        page,
        limit: 10,
        search,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
      });

      if (!res.success || !res.data) {
        setErrorMsg(res.error?.message || 'Failed to retrieve staff directory.');
      } else {
        setItems(res.data.items);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch {
      setErrorMsg('Unable to connect to staff management service.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const handleCreateUser = async (payload: CreateUserRequest) => {
    const res = await createStaffUser(payload);
    if (!res.success || !res.data) {
      throw new Error(res.error?.message || 'Failed to provision staff account');
    }
    setIsAddOpen(false);
    // Store temporary credential ONLY in ephemeral component state
    setIssuedCredential({
      username: res.data.user.username,
      fullName: res.data.user.fullName,
      temporaryPassword: res.data.temporaryPassword,
      temporaryPasswordExpiresAt: res.data.temporaryPasswordExpiresAt,
      isReissue: false,
    });
    await loadDirectory();
  };

  const handleUpdateProfile = async (userId: string, payload: UpdateUserProfileRequest) => {
    const res = await updateStaffProfile(userId, payload);
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to update staff profile');
    }
    setActionBanner(`Updated profile for ${res.data?.username || 'staff member'}.`);
    await loadDirectory();
  };

  const handleRoleChange = async (userId: string, role: UserRole, reason?: string) => {
    const res = await updateStaffRole(userId, { role, reason });
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to update role');
    }
    setActionBanner(
      `Role changed to ${roleLabel(role)} for ${res.data?.username}. All active sessions revoked.`,
    );
    await loadDirectory();
  };

  const handleStatusChange = async (userId: string, isActive: boolean, reason?: string) => {
    const res = await updateStaffStatus(userId, { isActive, reason });
    if (!res.success) {
      throw new Error(res.error?.message || 'Failed to update account status');
    }
    setActionBanner(
      isActive
        ? `Reactivated account ${res.data?.username}. Fresh authentication is required.`
        : `Deactivated account ${res.data?.username} and revoked all active sessions.`,
    );
    await loadDirectory();
  };

  const handleReissueCredential = async (staff: UserListItemDto) => {
    setErrorMsg(null);
    const res = await reissueStaffCredential(staff.id);
    if (!res.success || !res.data) {
      setErrorMsg(res.error?.message || 'Unable to reissue temporary credential');
      return;
    }
    setIssuedCredential({
      username: res.data.user.username,
      fullName: res.data.user.fullName,
      temporaryPassword: res.data.temporaryPassword,
      temporaryPasswordExpiresAt: res.data.temporaryPasswordExpiresAt,
      isReissue: true,
    });
    await loadDirectory();
  };

  const pageDoctors = items.filter((s) => s.role === UserRole.DOCTOR).length;
  const pageNurses = items.filter((s) => s.role === UserRole.NURSE_STAFF).length;
  const pageAdmins = items.filter((s) => s.role === UserRole.ADMIN).length;

  const activeWardStaff = wardRoster.filter((s) => s.isActive);
  const activeWardDoctors = activeWardStaff.filter((s) => s.user?.role === UserRole.DOCTOR);
  const activeWardNurses = activeWardStaff.filter((s) => s.user?.role === UserRole.NURSE_STAFF);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Staff Accounts & Clinical Authorization"
        description="Administrator-controlled staff directory, role assignments, account lifecycle controls, and one-time initial credential provisioning."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Staff Accounts', active: true },
        ]}
        action={
          <PermissionGuard permission={Permission.USERS_CREATE}>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-sm"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Provision Staff Account
            </Button>
          </PermissionGuard>
        }
      />

      {/* View Switcher: Directory vs Ward 18 Clinical Roster */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'directory'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 inline mr-1.5" />
          Staff Account Directory
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('ward-roster');
            if (wardId) loadWardRoster(wardId);
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'ward-roster'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 inline mr-1.5" />
          Ward 18 Clinical Staff Roster ({activeWardStaff.length})
        </button>
      </div>

      {actionBanner && (
        <div
          className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800"
          role="status"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionBanner}</span>
          </div>
          <button
            type="button"
            className="text-emerald-700 font-semibold hover:underline"
            onClick={() => setActionBanner(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-700"
          role="alert"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadDirectory} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {activeTab === 'directory' ? (
        <>
          {/* Directory Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Matching Accounts"
              value={total}
              subtitle="Total matching query"
              icon={<Users className="w-5 h-5 text-slate-700" />}
            />
            <StatCard
              title="Doctors (Current Page)"
              value={pageDoctors}
              subtitle="Obstetrics & Medical"
              icon={<Stethoscope className="w-5 h-5 text-teal-700" />}
            />
            <StatCard
              title="Nurses & Midwives (Page)"
              value={pageNurses}
              subtitle="Ward 18 Bedside Care"
              icon={<HeartPulse className="w-5 h-5 text-emerald-600" />}
            />
            <StatCard
              title="Administrators (Page)"
              value={pageAdmins}
              subtitle="User & Bed Control"
              icon={<ShieldCheck className="w-5 h-5 text-slate-700" />}
            />
          </div>

          <SectionCard
            title="Staff Account Directory"
            description="Search, filter, and manage hospital staff accounts without exposing authentication secrets"
          >
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="flex-1">
                  <FilterBar
                    searchValue={search}
                    onSearchChange={(val) => {
                      setSearch(val);
                      setPage(1);
                    }}
                    searchPlaceholder="Search by name, username, staff ID, or registration ID..."
                    filterOptions={[
                      { label: 'All Roles', value: 'ALL' },
                      { label: 'Doctors', value: UserRole.DOCTOR },
                      { label: 'Nurses & Midwives', value: UserRole.NURSE_STAFF },
                      { label: 'Administrators', value: UserRole.ADMIN },
                    ]}
                    selectedFilter={roleFilter}
                    onFilterChange={(val) => {
                      setRoleFilter(val as UserRole | 'ALL');
                      setPage(1);
                    }}
                    onReset={() => {
                      setSearch('');
                      setRoleFilter('ALL');
                      setStatusFilter('ALL');
                      setSortBy('createdAt');
                      setSortOrder('DESC');
                      setPage(1);
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    aria-label="Filter by account status"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="INACTIVE">Inactive Only</option>
                  </select>

                  <select
                    aria-label="Sort staff directory by"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as NonNullable<ListUsersParams['sortBy']>);
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800"
                  >
                    <option value="createdAt">Sort: Created Date</option>
                    <option value="fullName">Sort: Staff Name</option>
                    <option value="username">Sort: Username</option>
                    <option value="role">Sort: Role</option>
                    <option value="isActive">Sort: Status</option>
                  </select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
                    className="h-9 text-xs"
                    title="Toggle sort direction"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                    {sortOrder}
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 flex items-center justify-center text-xs text-slate-500">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin text-teal-600" />
                  Loading staff directory...
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  title="No staff accounts found"
                  description="No accounts match your current search query or filters."
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                          <th className="pb-3 pr-3">Staff Name & Username</th>
                          <th className="pb-3 pr-3">Staff ID</th>
                          <th className="pb-3 pr-3">System Role</th>
                          <th className="pb-3 pr-3">Registration</th>
                          <th className="pb-3 pr-3">Account Status</th>
                          <th className="pb-3 pr-3">Created</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((staff) => {
                          const isSelf = Boolean(currentUser && currentUser.id === staff.id);
                          const regDisplay = staff.staffProfile?.professionalRegistrationNumber
                            ? `${staff.staffProfile.professionalRegistrationBody ? `${staff.staffProfile.professionalRegistrationBody} · ` : ''}${staff.staffProfile.professionalRegistrationNumber}`
                            : null;

                          return (
                            <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 pr-3">
                                <div className="font-bold text-slate-900">
                                  {staff.fullName}
                                  {isSelf && (
                                    <Badge
                                      variant="outline"
                                      className="ml-1.5 text-[9px] py-0 px-1 text-teal-700 border-teal-200"
                                    >
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  @{staff.username}
                                  {staff.email ? ` · ${staff.email}` : ''}
                                </div>
                              </td>
                              <td className="py-3.5 pr-3 font-mono text-slate-700">
                                {staff.staffProfile?.staffId || (
                                  <span className="text-slate-400 italic">—</span>
                                )}
                              </td>
                              <td className="py-3.5 pr-3">
                                <RoleBadge role={staff.role} />
                              </td>
                              <td className="py-3.5 pr-3">
                                {regDisplay ? (
                                  <span className="font-mono text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {regDisplay}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Optional / None</span>
                                )}
                              </td>
                              <td className="py-3.5 pr-3">
                                <div className="flex flex-col items-start gap-1">
                                  {staff.isActive ? (
                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                      ACTIVE
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      <XCircle className="w-3 h-3 mr-1 text-slate-500" />
                                      INACTIVE
                                    </span>
                                  )}

                                  {staff.mustChangePassword && (
                                    <span className="inline-flex items-center text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      <Clock className="w-2.5 h-2.5 mr-1" />
                                      Setup Pending
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 pr-3 text-slate-600 whitespace-nowrap">
                                {formatColomboDate(staff.createdAt)}
                              </td>
                              <td className="py-3.5 text-right">
                                <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => navigate(`/staff/${staff.id}`)}
                                    title="View full staff profile and audit trail"
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    View
                                  </Button>

                                  <PermissionGuard permission={Permission.USERS_UPDATE}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => setEditingUser(staff)}
                                      title="Edit profile details"
                                    >
                                      <Pencil className="w-3.5 h-3.5 mr-1" />
                                      Edit
                                    </Button>
                                  </PermissionGuard>

                                  <PermissionGuard permission={Permission.USERS_MANAGE_ROLES}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isSelf}
                                      className="h-7 px-2 text-xs"
                                      onClick={() => setRoleTargetUser(staff)}
                                      title={isSelf ? 'Cannot change your own role' : 'Change role'}
                                    >
                                      <UserCog className="w-3.5 h-3.5 mr-1" />
                                      Role
                                    </Button>
                                  </PermissionGuard>

                                  <PermissionGuard permission={Permission.USERS_RESET_CREDENTIAL}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isSelf || !staff.isActive}
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleReissueCredential(staff)}
                                      title="Reissue temporary password"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </Button>
                                  </PermissionGuard>

                                  <PermissionGuard
                                    permission={
                                      staff.isActive
                                        ? Permission.USERS_DEACTIVATE
                                        : Permission.USERS_ACTIVATE
                                    }
                                  >
                                    <Button
                                      variant={staff.isActive ? 'outline' : 'default'}
                                      size="sm"
                                      disabled={isSelf}
                                      className={`h-7 px-2 text-xs ${
                                        staff.isActive
                                          ? 'text-red-700 border-red-200 hover:bg-red-50'
                                          : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                      }`}
                                      onClick={() => setStatusTargetUser(staff)}
                                    >
                                      {staff.isActive ? 'Deactivate' : 'Activate'}
                                    </Button>
                                  </PermissionGuard>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div>
                      Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total
                      accounts)
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-8 text-xs"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="h-8 text-xs"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </SectionCard>
        </>
      ) : (
        <>
          {/* Ward 18 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              title="Assigned to Ward 18"
              value={activeWardStaff.length}
              subtitle="Active Clinicians"
              icon={<Building2 className="w-5 h-5 text-teal-700" />}
            />
            <StatCard
              title="Attending Doctors"
              value={activeWardDoctors.length}
              subtitle="Obstetric Team"
              icon={<Stethoscope className="w-5 h-5 text-emerald-600" />}
            />
            <StatCard
              title="Primary Nurses"
              value={activeWardNurses.length}
              subtitle="Labour Room Nurses"
              icon={<HeartPulse className="w-5 h-5 text-blue-600" />}
            />
            <StatCard
              title="Historical Records"
              value={wardRoster.length}
              subtitle="Total Assignments"
              icon={<Clock className="w-5 h-5 text-slate-700" />}
            />
          </div>

          <SectionCard
            title="Ward 18 (Labour Room) Clinical Staff Roster"
            description="Clinicians officially assigned to Ward 18 eligible for shift duty and direct patient responsibility."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setAssignWardUserId('');
                  setAssignWardNotes('');
                  setAssignWardModalOpen(true);
                }}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Assign Clinician to Ward 18
              </Button>
            }
          >
            {wardLoading ? (
              <div className="p-8 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                Loading Ward 18 roster...
              </div>
            ) : wardRoster.length === 0 ? (
              <EmptyState
                title="No Staff Assigned to Ward 18"
                description="Assign doctors and nurses to activate them for shifts and patient care."
                actionLabel="Assign First Clinician"
                onAction={() => setAssignWardModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3">Clinician Name</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Staff ID</th>
                      <th className="py-2.5 px-3">Assigned At</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wardRoster.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {item.user?.fullName}
                          <div className="text-[11px] text-slate-400 font-mono">
                            @{item.user?.username}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <RoleBadge role={item.user?.role || ''} />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {item.userId.substring(0, 8)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatColomboDate(item.assignedAt)}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant="outline"
                            className={
                              item.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }
                          >
                            {item.isActive ? 'Active on Ward' : 'Ended'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {item.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEndWardTarget(item);
                                setEndWardReason('');
                              }}
                              className="text-red-700 border-red-200 hover:bg-red-50 text-xs h-7 px-2"
                            >
                              <UserMinus className="w-3 h-3 mr-1" />
                              End Assignment
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* Dialog Modals */}
      <ProvisionStaffDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={handleCreateUser}
      />

      <TemporaryCredentialDialog
        credential={issuedCredential}
        onClose={() => setIssuedCredential(null)}
      />

      <EditStaffProfileDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdateProfile}
      />

      <ChangeRoleDialog
        user={roleTargetUser}
        onClose={() => setRoleTargetUser(null)}
        onConfirm={handleRoleChange}
      />

      <ToggleStatusDialog
        user={statusTargetUser}
        onClose={() => setStatusTargetUser(null)}
        onConfirm={handleStatusChange}
      />

      {/* Assign Clinician to Ward 18 Modal */}
      <Dialog open={assignWardModalOpen} onOpenChange={setAssignWardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Assign Clinician to Ward 18
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Officially assign a Doctor or Nurse to Ward 18 (Labour Room).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignToWard} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Select Clinician *</Label>
              <select
                required
                value={assignWardUserId}
                onChange={(e) => setAssignWardUserId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">-- Choose active Doctor or Nurse --</option>
                {items
                  .filter(
                    (u) =>
                      u.isActive &&
                      (u.role === UserRole.DOCTOR || u.role === UserRole.NURSE_STAFF) &&
                      !wardRoster.some((ws) => ws.userId === u.id && ws.isActive),
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({roleLabel(u.role)}) — @{u.username}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Assignment Notes</Label>
              <Input
                value={assignWardNotes}
                onChange={(e) => setAssignWardNotes(e.target.value)}
                placeholder="e.g. Ward 18 Labour Room core clinical roster"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignWardModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={wardSubmitting || !assignWardUserId}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
              >
                {wardSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Confirm Ward Assignment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* End Ward 18 Assignment Modal */}
      <Dialog open={!!endWardTarget} onOpenChange={(open) => !open && setEndWardTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              End Ward Assignment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              End Ward 18 assignment for <strong>{endWardTarget?.user?.fullName}</strong>. This
              retains complete historical audit trail.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEndWardAssignment} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Reason for Ending *</Label>
              <Input
                required
                value={endWardReason}
                onChange={(e) => setEndWardReason(e.target.value)}
                placeholder="e.g. Rotated to Gynae Ward, Maternity Leave, Transfer"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEndWardTarget(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={wardSubmitting || !endWardReason}
                className="bg-red-700 hover:bg-red-800 text-white text-xs"
              >
                {wardSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Ending...
                  </>
                ) : (
                  'Confirm End Assignment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
