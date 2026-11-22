import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { FilterBar } from '../../components/shared/FilterBar.js';
import {
  AdmissionStatus,
  AdmissionSummaryDto,
  BedCleaningStatus,
  BedDisplayStatus,
  BedDto,
  BedFunctioningStatus,
  BedOccupancyStatus,
  Permission,
  WardDto,
} from '@lrms/shared';
import { BedStatusBadge, AdmissionCategoryBadge } from '../../components/status/Badges.js';
import { useAlertStateRefresh } from '../../hooks/useRealtimeNotifications.js';
import { BedAlertStatus } from '../alerts/components/BedAlertStatus.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.js';
import {
  BedDouble,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Wrench,
  User,
  ArrowRightLeft,
  LogOut,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { PermissionGuard } from '../../components/auth/PermissionGuard.js';
import { fetchWards, fetchWardBedBoard } from '../../services/wards.api.js';
import {
  allocateBed,
  completeBedCleaning,
  createBed,
  releaseBed,
  startBedCleaning,
  transferBed,
  updateBedMaintenance,
} from '../../services/beds.api.js';
import { fetchAdmissions } from '../../services/admissions.api.js';
import { Link } from 'react-router-dom';

export const BedBoardPage: React.FC = () => {
  const [wards, setWards] = useState<WardDto[]>([]);
  const [activeWardId, setActiveWardId] = useState<string>('');
  const [beds, setBeds] = useState<BedDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Dialog States
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [selectedBedForAllocation, setSelectedBedForAllocation] = useState<BedDto | null>(null);
  const [admissionsList, setAdmissionsList] = useState<AdmissionSummaryDto[]>([]);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>('');
  const [allocationNotes, setAllocationNotes] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState<boolean>(false);

  // Transfer Dialog State
  const [transferOpen, setTransferOpen] = useState(false);
  const [sourceBedForTransfer, setSourceBedForTransfer] = useState<BedDto | null>(null);
  const [targetBedIdForTransfer, setTargetBedIdForTransfer] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');

  // Release Dialog State
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [bedForRelease, setBedForRelease] = useState<BedDto | null>(null);
  const [releaseReason, setReleaseReason] = useState<string>('');

  // Maintenance Dialog State
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [bedForMaintenance, setBedForMaintenance] = useState<BedDto | null>(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState<BedFunctioningStatus>(
    BedFunctioningStatus.OUT_OF_SERVICE,
  );
  const [maintenanceReason, setMaintenanceReason] = useState<string>('');

  // Add Bed Dialog State (Admin)
  const [addBedOpen, setAddBedOpen] = useState(false);
  const [newBedNumber, setNewBedNumber] = useState<string>('');

  // Load Wards
  const loadWards = useCallback(async () => {
    try {
      const res = await fetchWards();
      if (res.success && res.data && res.data.items.length > 0) {
        setWards(res.data.items);
        const ward18 = res.data.items.find((w) => w.code === 'WARD-18');
        const defaultWard = ward18 || res.data.items[0];
        setActiveWardId(defaultWard.id);
      } else if (!res.success) {
        setActionError(res.error?.message || 'Could not load wards.');
      }
    } catch {
      setActionError('Could not reach the server to load wards.');
    }
  }, []);

  // Load Bed Board for Active Ward
  const loadBedBoard = useCallback(async (wardId: string, quiet = false) => {
    if (!wardId) return;
    if (!quiet) setLoading(true);
    setActionError(null);
    try {
      const res = await fetchWardBedBoard(wardId);
      if (res.success && res.data) {
        setBeds(res.data.beds);
      } else {
        setActionError(res.error?.message || 'Could not load the bed board.');
      }
    } catch {
      setActionError('Could not reach the server to load the bed board.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWards();
  }, [loadWards]);

  useEffect(() => {
    if (activeWardId) {
      loadBedBoard(activeWardId);
    }
  }, [activeWardId, loadBedBoard]);

  const refreshBedBoard = useCallback(() => {
    if (activeWardId) void loadBedBoard(activeWardId, true);
  }, [activeWardId, loadBedBoard]);
  useAlertStateRefresh(refreshBedBoard, { wardId: activeWardId });

  // Dynamic KPI counts (never hardcoded)
  const totalBeds = beds.length;
  const functioningBeds = beds.filter(
    (b) => b.functioningStatus === BedFunctioningStatus.FUNCTIONING,
  ).length;
  const outOfServiceBeds = beds.filter(
    (b) => b.functioningStatus === BedFunctioningStatus.OUT_OF_SERVICE,
  ).length;
  const occupiedBeds = beds.filter(
    (b) =>
      b.displayStatus === BedDisplayStatus.OCCUPIED ||
      b.occupancyStatus === BedOccupancyStatus.OCCUPIED,
  ).length;
  const availableBeds = beds.filter((b) => b.displayStatus === BedDisplayStatus.AVAILABLE).length;
  const cleaningBeds = beds.filter(
    (b) =>
      b.displayStatus === BedDisplayStatus.CLEANING ||
      b.occupancyStatus === BedOccupancyStatus.CLEANING,
  ).length;

  // Filtered beds
  const filteredBeds = useMemo(() => {
    return beds.filter((b) => {
      const currentRef = b.currentAllocation?.admissionReferenceId || '';
      const patientName = b.currentAllocation?.patientDisplayName || '';
      const matchesSearch =
        search.trim() === '' ||
        b.bedNumber.toLowerCase().includes(search.toLowerCase()) ||
        currentRef.toLowerCase().includes(search.toLowerCase()) ||
        patientName.toLowerCase().includes(search.toLowerCase());

      let matchesFilter = true;
      if (filter === 'AVAILABLE') {
        matchesFilter = b.displayStatus === BedDisplayStatus.AVAILABLE;
      } else if (filter === 'OCCUPIED') {
        matchesFilter = b.displayStatus === BedDisplayStatus.OCCUPIED;
      } else if (filter === 'CLEANING') {
        matchesFilter = b.displayStatus === BedDisplayStatus.CLEANING;
      } else if (filter === 'OUT_OF_SERVICE') {
        matchesFilter = b.displayStatus === BedDisplayStatus.OUT_OF_SERVICE;
      }

      return matchesSearch && matchesFilter;
    });
  }, [beds, search, filter]);

  // Open Allocate Dialog
  const handleOpenAllocate = async (bed: BedDto) => {
    setSelectedBedForAllocation(bed);
    setSelectedAdmissionId('');
    setAllocationNotes('');
    setActionError(null);
    setAllocateOpen(true);
    try {
      const res = await fetchAdmissions({ status: AdmissionStatus.ADMITTED, limit: 100 });
      if (res.success && res.data) {
        setAdmissionsList(res.data.items);
      }
    } catch {
      // Fallback
    }
  };

  // Submit Allocation
  const handleSubmitAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedForAllocation || !selectedAdmissionId) return;
    setDialogLoading(true);
    setActionError(null);
    try {
      const res = await allocateBed(
        selectedAdmissionId,
        selectedBedForAllocation.id,
        allocationNotes.trim() || undefined,
      );
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to allocate bed.');
        return;
      }
      setAllocateOpen(false);
      if (activeWardId) await loadBedBoard(activeWardId);
    } catch {
      setActionError('Network error executing bed allocation.');
    } finally {
      setDialogLoading(false);
    }
  };

  // Open Transfer Dialog
  const handleOpenTransfer = (bed: BedDto) => {
    setSourceBedForTransfer(bed);
    setTargetBedIdForTransfer('');
    setTransferReason('');
    setActionError(null);
    setTransferOpen(true);
  };

  // Submit Transfer
  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceBedForTransfer?.currentAllocation || !targetBedIdForTransfer) return;
    setDialogLoading(true);
    setActionError(null);
    try {
      const res = await transferBed(
        sourceBedForTransfer.currentAllocation.id,
        targetBedIdForTransfer,
        transferReason.trim() || undefined,
      );
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to transfer bed.');
        return;
      }
      setTransferOpen(false);
      if (activeWardId) await loadBedBoard(activeWardId);
    } catch {
      setActionError('Network error executing bed transfer.');
    } finally {
      setDialogLoading(false);
    }
  };

  // Open Release Dialog
  const handleOpenRelease = (bed: BedDto) => {
    setBedForRelease(bed);
    setReleaseReason('');
    setActionError(null);
    setReleaseOpen(true);
  };

  // Submit Release
  const handleSubmitRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedForRelease?.currentAllocation) return;
    setDialogLoading(true);
    setActionError(null);
    try {
      const res = await releaseBed(
        bedForRelease.currentAllocation.id,
        releaseReason.trim() || undefined,
      );
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to release bed.');
        return;
      }
      setReleaseOpen(false);
      if (activeWardId) await loadBedBoard(activeWardId);
    } catch {
      setActionError('Network error executing bed release.');
    } finally {
      setDialogLoading(false);
    }
  };

  // Cleaning turnover actions
  const handleStartCleaning = async (bedId: string) => {
    setActionError(null);
    try {
      const res = await startBedCleaning(bedId);
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to start cleaning.');
        return;
      }
      if (activeWardId) await loadBedBoard(activeWardId);
    } catch {
      setActionError('Network error starting bed cleaning.');
    }
  };

  const handleMarkCleaned = async (bedId: string) => {
    setActionError(null);
    try {
      const res = await completeBedCleaning(bedId, 'Sanitization completed.');
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to mark bed as cleaned.');
        return;
      }
      if (activeWardId) await loadBedBoard(activeWardId);
    } catch {
      setActionError('Network error completing bed cleaning.');
    }
  };

  // Maintenance Toggle Action
  const handleOpenMaintenance = (bed: BedDto) => {
    setBedForMaintenance(bed);
    setMaintenanceStatus(
      bed.functioningStatus === BedFunctioningStatus.FUNCTIONING
        ? BedFunctioningStatus.OUT_OF_SERVICE
        : BedFunctioningStatus.FUNCTIONING,
    );
    setMaintenanceReason('');
    setActionError(null);
    setMaintenanceOpen(true);
  };

  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedForMaintenance) return;
    setDialogLoading(true);
    setActionError(null);
    try {
      const res = await updateBedMaintenance(bedForMaintenance.id, {
        functioningStatus: maintenanceStatus,
        reason: maintenanceReason.trim() || undefined,
      });
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to update maintenance state.');
        return;
      }
      setMaintenanceOpen(false);
      if (activeWardId) await loadBedBoard(activeWardId);
    } catch {
      setActionError('Network error updating maintenance state.');
    } finally {
      setDialogLoading(false);
    }
  };

  // Add Bed Submit
  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWardId || !newBedNumber.trim()) return;
    setDialogLoading(true);
    setActionError(null);
    try {
      const res = await createBed(activeWardId, { bedNumber: newBedNumber.trim().toUpperCase() });
      if (!res.success) {
        setActionError(res.error?.message || 'Failed to create bed.');
        return;
      }
      setAddBedOpen(false);
      setNewBedNumber('');
      await loadBedBoard(activeWardId);
    } catch {
      setActionError('Network error creating bed.');
    } finally {
      setDialogLoading(false);
    }
  };

  // Available beds in ward for transfer destination
  const availableTransferBeds = useMemo(() => {
    if (!sourceBedForTransfer) return [];
    return beds.filter(
      (b) =>
        b.id !== sourceBedForTransfer.id &&
        b.functioningStatus === BedFunctioningStatus.FUNCTIONING &&
        b.displayStatus === BedDisplayStatus.AVAILABLE,
    );
  }, [beds, sourceBedForTransfer]);

  // Active ward metadata
  const currentWard = wards.find((w) => w.id === activeWardId);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Ward & Bed Management Board"
        description="Real-time physical bed availability, occupancy tracking, sanitization turnover, and maintenance statuses."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Bed Board', active: true },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {wards.length > 1 && (
              <select
                aria-label="Select Ward"
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none"
                value={activeWardId}
                onChange={(e) => setActiveWardId(e.target.value)}
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => activeWardId && loadBedBoard(activeWardId)}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <PermissionGuard permission={Permission.BEDS_CONFIGURE}>
              <Button
                size="sm"
                className="h-8 text-xs bg-teal-700 hover:bg-teal-800 text-white"
                onClick={() => {
                  setNewBedNumber('');
                  setAddBedOpen(true);
                }}
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Add Bed
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {/* Ward Status Strip */}
      {currentWard && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex flex-wrap items-center justify-between text-xs text-teal-900 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold">{currentWard.name}</span>
            <span className="font-mono bg-teal-100 px-1.5 py-0.5 rounded text-[11px] text-teal-800 font-semibold">
              {currentWard.code}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>
              Dynamic Capacity: <strong>{currentWard.totalPhysicalBeds}</strong> beds
            </span>
            <span>
              Registered Beds: <strong>{totalBeds}</strong>
            </span>
            <span
              className={
                currentWard.isActive
                  ? 'text-emerald-700 font-semibold'
                  : 'text-red-700 font-semibold'
              }
            >
              {currentWard.isActive ? '● Ward Operational' : '○ Ward Deactivated'}
            </span>
          </div>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Installed Beds"
          value={totalBeds}
          subtitle="Physical inventory"
          icon={<BedDouble className="w-4 h-4 text-slate-700" />}
        />
        <StatCard
          title="Available"
          value={availableBeds}
          subtitle="Ready for triage"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          title="Occupied"
          value={occupiedBeds}
          subtitle="Active patients"
          icon={<User className="w-4 h-4 text-teal-600" />}
        />
        <StatCard
          title="In Cleaning"
          value={cleaningBeds}
          subtitle="Turnover sanitization"
          icon={<Sparkles className="w-4 h-4 text-amber-600" />}
        />
        <StatCard
          title="Functioning"
          value={functioningBeds}
          subtitle="Operational"
          icon={<Layers className="w-4 h-4 text-teal-700" />}
        />
        <StatCard
          title="Out of Service"
          value={outOfServiceBeds}
          subtitle="Maintenance"
          icon={<Wrench className="w-4 h-4 text-red-600" />}
        />
      </div>

      <Tabs defaultValue="board" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="board" className="text-xs font-semibold">
            Visual Bed Board
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-semibold">
            Bed Allocation History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search bed, patient, or admission ref..."
            filterOptions={[
              { label: 'All Beds', value: 'ALL' },
              { label: 'Available Only', value: 'AVAILABLE' },
              { label: 'Occupied', value: 'OCCUPIED' },
              { label: 'Cleaning in Progress', value: 'CLEANING' },
              { label: 'Out of Service', value: 'OUT_OF_SERVICE' },
            ]}
            selectedFilter={filter}
            onFilterChange={setFilter}
            onReset={() => {
              setSearch('');
              setFilter('ALL');
            }}
          />

          {/* Grid of Bed Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBeds.map((bed) => {
              const isOutOfService =
                bed.displayStatus === BedDisplayStatus.OUT_OF_SERVICE ||
                bed.functioningStatus === BedFunctioningStatus.OUT_OF_SERVICE;
              const isCleaning =
                bed.displayStatus === BedDisplayStatus.CLEANING ||
                bed.occupancyStatus === BedOccupancyStatus.CLEANING;
              const isOccupied =
                bed.displayStatus === BedDisplayStatus.OCCUPIED ||
                bed.occupancyStatus === BedOccupancyStatus.OCCUPIED;
              const isAvailable = bed.displayStatus === BedDisplayStatus.AVAILABLE;

              let cardBorder = 'border-slate-200 bg-white';
              if (isOutOfService) cardBorder = 'border-red-300 bg-red-50/30';
              else if (isCleaning) cardBorder = 'border-amber-300 bg-amber-50/30';
              else if (isOccupied) cardBorder = 'border-teal-200 bg-teal-50/20';
              else if (isAvailable) cardBorder = 'border-emerald-200 bg-emerald-50/20';

              const patientName = bed.currentAllocation?.patientDisplayName || 'Patient';
              const admissionRef = bed.currentAllocation?.admissionReferenceId || '';

              return (
                <div
                  key={bed.id}
                  className={`rounded-xl border p-4 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${cardBorder}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BedDouble
                          className={`w-5 h-5 ${
                            isOutOfService
                              ? 'text-red-600'
                              : isOccupied
                                ? 'text-teal-700'
                                : isCleaning
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                          }`}
                        />
                        <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                          {bed.bedNumber}
                        </h3>
                      </div>
                      <BedStatusBadge displayStatus={bed.displayStatus} />
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      {isOccupied && (
                        <div className="rounded bg-teal-50/80 border border-teal-100 p-2.5 text-teal-900 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{patientName}</span>
                            {bed.currentAllocation?.admissionCategory && (
                              <AdmissionCategoryBadge
                                category={bed.currentAllocation.admissionCategory}
                                className="text-[10px] px-1.5 py-0"
                              />
                            )}
                          </div>
                          {admissionRef && (
                            <div className="font-mono text-[11px] text-teal-700">
                              {bed.currentAllocation?.admissionId ? (
                                <Link
                                  to={`/admissions/${bed.currentAllocation.admissionId}`}
                                  className="underline hover:text-teal-900 flex items-center space-x-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>Ref: {admissionRef}</span>
                                </Link>
                              ) : (
                                <span>Ref: {admissionRef}</span>
                              )}
                            </div>
                          )}

                          {bed.currentAllocation?.riskFlags &&
                            bed.currentAllocation.riskFlags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {bed.currentAllocation.riskFlags.map((rf, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-amber-100 text-amber-900 border border-amber-200 rounded px-1.5 py-0.2 text-[10px] font-semibold"
                                  >
                                    {rf}
                                  </span>
                                ))}
                              </div>
                            )}

                          {bed.activeAlert && <BedAlertStatus alert={bed.activeAlert} />}

                          {bed.currentAllocation?.allocatedAt && (
                            <div className="text-[10px] text-teal-700 pt-0.5">
                              Assigned{' '}
                              {new Date(bed.currentAllocation.allocatedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              by {bed.currentAllocation.assignedByUserName}
                            </div>
                          )}
                        </div>
                      )}

                      {isCleaning && (
                        <div className="rounded bg-amber-50 border border-amber-200 p-2 text-amber-900">
                          <div className="flex items-center space-x-1.5 font-semibold text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Sanitization Required</span>
                          </div>
                          <p className="text-[10px] text-amber-700 mt-0.5">
                            Discharge complete. Disinfection in progress.
                          </p>
                          {bed.cleaningStatus === BedCleaningStatus.IN_PROGRESS && (
                            <p className="text-[10px] font-medium text-amber-800 mt-1">
                              Cleaning in progress by ward staff
                            </p>
                          )}
                        </div>
                      )}

                      {isOutOfService && (
                        <div className="rounded bg-red-50 border border-red-200 p-2 text-red-900">
                          <div className="flex items-center space-x-1.5 font-semibold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            <span>Bed Mechanically Defective</span>
                          </div>
                          <p className="text-[10px] text-red-700 mt-0.5">
                            Biomedical engineering maintenance ticket opened.
                          </p>
                        </div>
                      )}

                      {isAvailable && (
                        <div className="rounded bg-emerald-50 border border-emerald-100 p-2 text-emerald-900">
                          <div className="flex items-center space-x-1.5 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Ready for Inpatient Triage</span>
                          </div>
                          {bed.lastCleaning?.completedAt && (
                            <p className="text-[10px] text-emerald-700 mt-0.5">
                              Sanitized:{' '}
                              {new Date(bed.lastCleaning.completedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Unit: {bed.wardName || 'Ward 18'}</span>
                      <span className="font-mono text-[10px]">{bed.wardCode || 'WARD-18'}</span>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {isOccupied && (
                        <>
                          <PermissionGuard permission={Permission.BEDS_TRANSFER}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] border-teal-300 text-teal-800 hover:bg-teal-100"
                              onClick={() => handleOpenTransfer(bed)}
                            >
                              <ArrowRightLeft className="w-3 h-3 mr-1" />
                              Transfer
                            </Button>
                          </PermissionGuard>

                          <PermissionGuard permission={Permission.BEDS_RELEASE}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] border-slate-300 text-slate-700 hover:bg-slate-100"
                              onClick={() => handleOpenRelease(bed)}
                            >
                              <LogOut className="w-3 h-3 mr-1 text-slate-500" />
                              Release
                            </Button>
                          </PermissionGuard>
                        </>
                      )}

                      {isCleaning && (
                        <>
                          {bed.cleaningStatus === BedCleaningStatus.CLEANING_REQUIRED && (
                            <PermissionGuard permission={Permission.BEDS_CLEANING_START}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] border-amber-300 text-amber-900 hover:bg-amber-100"
                                onClick={() => handleStartCleaning(bed.id)}
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Start Cleaning
                              </Button>
                            </PermissionGuard>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] border-amber-300 text-amber-900 hover:bg-amber-100"
                            onClick={() => handleMarkCleaned(bed.id)}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Mark Sanitized
                          </Button>
                        </>
                      )}

                      {isAvailable && (
                        <>
                          <PermissionGuard permission={Permission.BEDS_ALLOCATE}>
                            <Button
                              size="sm"
                              className="h-7 text-[10px] bg-teal-700 hover:bg-teal-800 text-white font-medium"
                              onClick={() => handleOpenAllocate(bed)}
                            >
                              <User className="w-3 h-3 mr-1" />
                              Allocate Patient
                            </Button>
                          </PermissionGuard>

                          <PermissionGuard permission={Permission.BEDS_MARK_OUT_OF_SERVICE}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] text-red-700 hover:bg-red-50"
                              onClick={() => handleOpenMaintenance(bed)}
                            >
                              <Wrench className="w-3 h-3 mr-1" />
                              Out of Service
                            </Button>
                          </PermissionGuard>
                        </>
                      )}

                      {isOutOfService && (
                        <PermissionGuard permission={Permission.BEDS_MARK_OUT_OF_SERVICE}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] border-red-300 text-red-800 hover:bg-red-100"
                            onClick={() => handleOpenMaintenance(bed)}
                          >
                            <Wrench className="w-3 h-3 mr-1" />
                            Return to Service
                          </Button>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <SectionCard
            title="Bed Allocation & Turnover Log"
            description="Audited history of patient stays, bed transfers, discharges, and sanitization turnovers."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <th className="pb-2.5">Bed Number</th>
                    <th className="pb-2.5">Admission Reference</th>
                    <th className="pb-2.5">Patient Details</th>
                    <th className="pb-2.5">Allocated Time</th>
                    <th className="pb-2.5">Released Time</th>
                    <th className="pb-2.5">Turnover State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {beds
                    .filter((b) => b.currentAllocation)
                    .map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-bold">{b.bedNumber}</td>
                        <td className="py-2.5 font-mono text-teal-700">
                          {b.currentAllocation?.admissionReferenceId}
                        </td>
                        <td className="py-2.5 font-medium">
                          {b.currentAllocation?.patientDisplayName}
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {b.currentAllocation?.allocatedAt
                            ? new Date(b.currentAllocation.allocatedAt).toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-2.5 text-slate-400">Active (Current)</td>
                        <td className="py-2.5 text-teal-800 font-semibold">Occupied</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Allocate Bed Dialog */}
      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Allocate Bed {selectedBedForAllocation?.bedNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Assign this sanitized, functioning labour room bed to an admitted inpatient.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitAllocate} className="space-y-4 text-xs">
            <div>
              <Label
                htmlFor="allocate-admission-select"
                className="text-xs font-semibold text-slate-700"
              >
                Select Admitted Patient
              </Label>
              <select
                id="allocate-admission-select"
                aria-label="Select Admitted Patient"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none"
                value={selectedAdmissionId}
                onChange={(e) => setSelectedAdmissionId(e.target.value)}
                required
              >
                <option value="">-- Choose an admission awaiting bed --</option>
                {admissionsList.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.admissionReferenceId} — {adm.admissionCategory} (
                    {new Date(adm.admittedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="allocate-notes" className="text-xs font-semibold text-slate-700">
                Clinical Allocation Notes (Optional)
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
                disabled={dialogLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={dialogLoading || !selectedAdmissionId}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                {dialogLoading ? 'Allocating...' : 'Confirm Allocation'}
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
              Transfer Bed — {sourceBedForTransfer?.bedNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Transfer active admission{' '}
              {sourceBedForTransfer?.currentAllocation?.admissionReferenceId} (
              {sourceBedForTransfer?.currentAllocation?.patientDisplayName}) to another available
              bed.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>Clinical Turnover Notice:</strong> Transferring will release{' '}
            {sourceBedForTransfer?.bedNumber} and automatically flag it as{' '}
            <em>Cleaning Required</em>.
          </div>

          <form onSubmit={handleSubmitTransfer} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="transfer-target-bed" className="text-xs font-semibold text-slate-700">
                Target Available Bed
              </Label>
              <select
                id="transfer-target-bed"
                aria-label="Target Available Bed"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none"
                value={targetBedIdForTransfer}
                onChange={(e) => setTargetBedIdForTransfer(e.target.value)}
                required
              >
                <option value="">-- Choose destination bed --</option>
                {availableTransferBeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bedNumber} (Available)
                  </option>
                ))}
              </select>
              {availableTransferBeds.length === 0 && (
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
                placeholder="e.g. Patient requires closer continuous observation"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransferOpen(false)}
                disabled={dialogLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={dialogLoading || !targetBedIdForTransfer}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                {dialogLoading ? 'Transferring...' : 'Confirm Transfer'}
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
              Release Bed — {bedForRelease?.bedNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Release bed for {bedForRelease?.currentAllocation?.admissionReferenceId} (
              {bedForRelease?.currentAllocation?.patientDisplayName}).
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <strong>Important:</strong> Releasing the bed marks it as <em>Cleaning Required</em>.
            This does <strong>NOT</strong> discharge the patient or close the admission record.
          </div>

          <form onSubmit={handleSubmitRelease} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="release-reason" className="text-xs font-semibold text-slate-700">
                Reason for Bed Release
              </Label>
              <Input
                id="release-reason"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                placeholder="e.g. Clinical step-down / observation completed"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReleaseOpen(false)}
                disabled={dialogLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={dialogLoading}
                className="bg-slate-800 hover:bg-slate-900 text-white"
              >
                {dialogLoading ? 'Releasing...' : 'Confirm Release'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Update Maintenance Status — {bedForMaintenance?.bedNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Toggle physical operational readiness and record biomedical engineering notes.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitMaintenance} className="space-y-4 text-xs">
            <div>
              <Label
                htmlFor="maintenance-status-select"
                className="text-xs font-semibold text-slate-700"
              >
                Target Operational State
              </Label>
              <select
                id="maintenance-status-select"
                aria-label="Target Operational State"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 shadow-xs focus:border-teal-500 focus:outline-none"
                value={maintenanceStatus}
                onChange={(e) => setMaintenanceStatus(e.target.value as BedFunctioningStatus)}
              >
                <option value={BedFunctioningStatus.OUT_OF_SERVICE}>
                  OUT_OF_SERVICE — Defective / Maintenance Required
                </option>
                <option value={BedFunctioningStatus.FUNCTIONING}>
                  FUNCTIONING — Operational and Ready for Turnover
                </option>
              </select>
            </div>

            <div>
              <Label htmlFor="maintenance-reason" className="text-xs font-semibold text-slate-700">
                Biomedical / Maintenance Notes
              </Label>
              <Input
                id="maintenance-reason"
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                placeholder="e.g. Hydraulic height adjustment lever repaired"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMaintenanceOpen(false)}
                disabled={dialogLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={dialogLoading}
                className="bg-red-700 hover:bg-red-800 text-white"
              >
                {dialogLoading ? 'Updating...' : 'Save Maintenance Status'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Bed Dialog */}
      <Dialog open={addBedOpen} onOpenChange={setAddBedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Register New Bed — {currentWard?.name || 'Labour Room'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Add a physical bed asset to this ward. Dynamic capacity will be respected.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 flex items-center space-x-2 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <form onSubmit={handleAddBed} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="add-bed-number" className="text-xs font-semibold text-slate-700">
                Bed Number / Identifier
              </Label>
              <Input
                id="add-bed-number"
                value={newBedNumber}
                onChange={(e) => setNewBedNumber(e.target.value)}
                placeholder="e.g. BED-08"
                className="mt-1 h-9 text-xs font-mono uppercase"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddBedOpen(false)}
                disabled={dialogLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={dialogLoading || !newBedNumber.trim()}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                {dialogLoading ? 'Creating...' : 'Register Bed'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
