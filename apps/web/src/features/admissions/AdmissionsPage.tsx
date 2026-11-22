import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AdmissionCategory,
  AdmissionStatus,
  AdmissionSummaryDto,
  Permission,
  RiskFlagDefinitionDto,
  RiskFlagKey,
  UserRole,
} from '@lrms/shared';
import {
  fetchAdmissions,
  fetchRiskFlagDefinitions,
  ListAdmissionsParams,
} from '../../services/admissions.api.js';
import { lookupPatientByNic } from '../../services/patients.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PermissionGuard } from '../../components/auth/PermissionGuard.js';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { FilterBar } from '../../components/shared/FilterBar.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import { AdmissionCategoryBadge } from '../../components/status/Badges.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Badge } from '../../components/ui/badge.js';
import { RapidTriageDialog } from './components/RapidTriageDialog.js';
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  HeartPulse,
  Loader2,
  Lock,
  Search,
  Stethoscope,
  UserPlus,
} from 'lucide-react';
import { formatColomboDateTime } from '../../lib/datetime.js';
import { humanizeEnum } from '../../lib/labels.js';

const CORE_RISK_KEYS: RiskFlagKey[] = [
  RiskFlagKey.HYPERTENSION,
  RiskFlagKey.GESTATIONAL_DIABETES,
  RiskFlagKey.PRIOR_CESAREAN,
  RiskFlagKey.OBSERVATION_20PLUS,
];

export const AdmissionsPage: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<AdmissionSummaryDto[]>([]);
  const [riskDefinitions, setRiskDefinitions] = useState<RiskFlagDefinitionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AdmissionCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AdmissionStatus | 'ALL'>('ALL');
  const [riskFlagFilter, setRiskFlagFilter] = useState<RiskFlagKey | 'ALL'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<NonNullable<ListAdmissionsParams['sortBy']>>('admittedAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTriageOpen, setIsTriageOpen] = useState(false);

  // Authorized blind-index NIC lookup
  const [nicSearch, setNicSearch] = useState('');
  const [nicLookupBusy, setNicLookupBusy] = useState(false);
  const [nicLookupFeedback, setNicLookupFeedback] = useState<string | null>(null);

  const loadRegister = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchAdmissions({
        page,
        limit: 10,
        search,
        category: categoryFilter,
        status: statusFilter,
        riskFlagKey: riskFlagFilter,
        fromDate,
        toDate,
        sortBy,
        sortOrder,
      });

      if (!res.success || !res.data) {
        setErrorMsg(res.error?.message || 'Failed to retrieve admission register.');
      } else {
        setItems(res.data.items);
        setTotal(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch {
      setErrorMsg('Unable to reach admission register service.');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    categoryFilter,
    statusFilter,
    riskFlagFilter,
    fromDate,
    toDate,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadRegister();
  }, [loadRegister]);

  useEffect(() => {
    fetchRiskFlagDefinitions()
      .then((res) => {
        if (res.success && res.data) {
          setRiskDefinitions(res.data.items);
        }
      })
      .catch(() => {
        // Non-fatal fallback; triage modal displays clear notice if catalog unavailable
      });
  }, []);

  const handleNicLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setNicLookupFeedback(null);
    const trimmed = nicSearch.trim();
    if (!trimmed) {
      setNicLookupFeedback('Enter a valid NIC number to run a blind-index lookup.');
      return;
    }

    setNicLookupBusy(true);
    try {
      const res = await lookupPatientByNic(trimmed);
      if (!res.success || !res.data) {
        setNicLookupFeedback(res.error?.message || 'Unable to execute blind-index lookup.');
        return;
      }

      if (res.data.matches.length === 0) {
        setNicLookupFeedback('No authorized patient record matched this NIC.');
        return;
      }

      navigate(`/patients/${res.data.matches[0].id}`);
    } catch {
      setNicLookupFeedback('Network error executing blind-index lookup.');
    } finally {
      setNicLookupBusy(false);
    }
  };

  const pageNormal = items.filter(
    (a) => a.admissionCategory === AdmissionCategory.NORMAL_DELIVERY,
  ).length;
  const pageCesarean = items.filter(
    (a) => a.admissionCategory === AdmissionCategory.PLANNED_CESAREAN,
  ).length;
  const pageObservation = items.filter(
    (a) => a.admissionCategory === AdmissionCategory.OBSERVATION_20PLUS,
  ).length;

  const isAdminDeidentifiedMode = role === UserRole.ADMIN;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Patient Admissions & Rapid Triage"
        description={
          isAdminDeidentifiedMode
            ? 'De-identified labour room admission summary register. Identifiable patient records remain restricted to authorized clinicians.'
            : 'Admission register, reference ID assignment, clinical risk flag screening, and optional identity details.'
        }
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admissions', active: true },
        ]}
        action={
          <PermissionGuard permission={Permission.ADMISSIONS_CREATE}>
            <Button
              onClick={() => setIsTriageOpen(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white font-medium shadow-sm min-h-[44px]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Rapid Triage Admission
            </Button>
          </PermissionGuard>
        }
      />

      {/* Register Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Matching Admissions"
          value={total}
          subtitle="Total matching authorized scope"
          icon={<HeartPulse className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          title="Normal Delivery (Page)"
          value={pageNormal}
          subtitle="Active labour intake"
          icon={<Activity className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Cesarean Section (Page)"
          value={pageCesarean}
          subtitle="Scheduled operative intake"
          icon={<Stethoscope className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="20+ Wks Observation (Page)"
          value={pageObservation}
          subtitle="Antepartum surveillance"
          icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Authorized Blind-Index NIC Exact Lookup (clinicians only) */}
      <PermissionGuard permission={Permission.PATIENTS_VIEW_PII}>
        <SectionCard
          title="Exact-Match Patient Lookup"
          description="Find an authorised patient record by exact NIC."
        >
          <form
            onSubmit={handleNicLookup}
            className="flex flex-col sm:flex-row gap-2 sm:items-center"
            noValidate
          >
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                aria-label="Exact NIC lookup"
                value={nicSearch}
                onChange={(e) => setNicSearch(e.target.value)}
                placeholder="Enter exact NIC (e.g. 199450102450 or 945012450V)"
                className="pl-9 h-10 text-xs"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={nicLookupBusy}
              className="h-10 text-xs"
            >
              {nicLookupBusy ? 'Searching...' : 'Find Authorized Patient'}
            </Button>
          </form>
          {nicLookupFeedback && (
            <p className="mt-2 text-xs text-slate-600" role="status">
              {nicLookupFeedback}
            </p>
          )}
        </SectionCard>
      </PermissionGuard>

      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-700"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadRegister} className="h-7 text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Search, Filters & Register Table */}
      <SectionCard
        title="Admissions Register"
        description="De-identified listing by Admission Reference ID"
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <FilterBar
              searchValue={search}
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              searchPlaceholder="Search by Admission Reference ID (e.g. ADM-202611-0001)..."
              filterOptions={[
                { label: 'All Categories', value: 'ALL' },
                { label: 'Normal Delivery', value: AdmissionCategory.NORMAL_DELIVERY },
                { label: 'Cesarean Section', value: AdmissionCategory.PLANNED_CESAREAN },
                {
                  label: '20+ Weeks Observation',
                  value: AdmissionCategory.OBSERVATION_20PLUS,
                },
              ]}
              selectedFilter={categoryFilter}
              onFilterChange={(val) => {
                setCategoryFilter(val as AdmissionCategory | 'ALL');
                setPage(1);
              }}
              onReset={() => {
                setSearch('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
                setRiskFlagFilter('ALL');
                setFromDate('');
                setToDate('');
                setSortBy('admittedAt');
                setSortOrder('DESC');
                setPage(1);
              }}
            />

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                aria-label="Filter by admission status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as AdmissionStatus | 'ALL');
                  setPage(1);
                }}
                className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800"
              >
                <option value="ALL">All Statuses</option>
                <option value={AdmissionStatus.ADMITTED}>ADMITTED</option>
                <option value={AdmissionStatus.TRANSFERRED}>TRANSFERRED</option>
                <option value={AdmissionStatus.DISCHARGED}>DISCHARGED</option>
              </select>

              <select
                aria-label="Filter by clinical risk flag"
                value={riskFlagFilter}
                onChange={(e) => {
                  setRiskFlagFilter(e.target.value as RiskFlagKey | 'ALL');
                  setPage(1);
                }}
                className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800"
              >
                <option value="ALL">All Risk Flags</option>
                {riskDefinitions
                  .filter((d) => CORE_RISK_KEYS.includes(d.key))
                  .map((def) => (
                    <option key={def.key} value={def.key}>
                      {def.label}
                    </option>
                  ))}
              </select>

              <Input
                type="date"
                aria-label="Admitted from date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-36 text-xs"
              />
              <Input
                type="date"
                aria-label="Admitted to date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-36 text-xs"
              />

              <select
                aria-label="Sort admissions by"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as NonNullable<ListAdmissionsParams['sortBy']>);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800"
              >
                <option value="admittedAt">Sort: Admitted Time</option>
                <option value="admissionReferenceId">Sort: Reference ID</option>
                <option value="admissionCategory">Sort: Category</option>
                <option value="status">Sort: Status</option>
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
                className="h-9 text-xs"
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                {sortOrder}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-xs text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin text-teal-600" />
              Loading admissions register...
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No admissions found"
              description="No authorized admissions match your current search or filter parameters."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-3">Reference ID</th>
                      <th className="pb-3 pr-3">Admitted Date &amp; Time</th>
                      <th className="pb-3 pr-3">Patient Record</th>
                      <th className="pb-3 pr-3">Category</th>
                      <th className="pb-3 pr-3">Clinical Risk Flags</th>
                      <th className="pb-3 pr-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((adm) => (
                      <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 pr-3 font-mono font-bold text-teal-800 whitespace-nowrap">
                          {isAdminDeidentifiedMode ? (
                            adm.admissionReferenceId
                          ) : (
                            <Link to={`/admissions/${adm.id}`} className="hover:underline">
                              {adm.admissionReferenceId}
                            </Link>
                          )}
                        </td>
                        <td className="py-3.5 pr-3 text-slate-700 whitespace-nowrap">
                          {formatColomboDateTime(adm.admittedAt)}
                        </td>
                        <td className="py-3.5 pr-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[11px] text-slate-700">
                              {adm.patientId ? `PT-${adm.patientId.slice(0, 8)}` : '—'}
                            </span>
                            {adm.hasPii ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-teal-50 text-teal-800 border-teal-200"
                              >
                                <Lock className="w-2.5 h-2.5 mr-1" />
                                Identity recorded
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                No identity details
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 pr-3">
                          <AdmissionCategoryBadge category={adm.admissionCategory} />
                        </td>
                        <td className="py-3.5 pr-3">
                          {adm.riskFlags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {adm.riskFlags.map((flag) => (
                                <span
                                  key={flag.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium"
                                >
                                  {flag.label}
                                </span>
                              ))}
                            </div>
                          ) : adm.noListedRiskFlagsConfirmed ? (
                            <span className="text-[11px] text-slate-500">
                              Confirmed: No Listed Flags
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Pending screening</span>
                          )}
                        </td>
                        <td className="py-3.5 pr-3">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {humanizeEnum(adm.status)}
                          </Badge>
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap">
                          {!isAdminDeidentifiedMode ? (
                            <div className="inline-flex items-center gap-1.5">
                              <Link to={`/admissions/${adm.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Admission
                                </Button>
                              </Link>
                              <PermissionGuard permission={Permission.PATIENTS_VIEW}>
                                {adm.patientId && (
                                  <Link to={`/patients/${adm.patientId}`}>
                                    <Button variant="outline" size="sm" className="h-8 text-xs">
                                      Patient File
                                    </Button>
                                  </Link>
                                )}
                              </PermissionGuard>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              De-identified summary
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total
                  admissions)
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

      <RapidTriageDialog
        open={isTriageOpen}
        onOpenChange={setIsTriageOpen}
        riskFlagDefinitions={riskDefinitions}
        onSuccess={() => {
          loadRegister();
        }}
      />
    </div>
  );
};
