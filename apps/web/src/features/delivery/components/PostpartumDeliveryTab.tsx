import React, { useState, useEffect, useCallback } from 'react';
import {
  AuthorizeMaternalDischargeInput,
  AuthorizeNewbornDischargeInput,
  CreateDeliveryInput,
  CreatePostpartumMaternalAssessmentInput,
  CreatePostpartumNewbornAssessmentInput,
  DeliveryDto,
  DischargedEntityType,
  NewbornDto,
  PostpartumDischargeAuthorizationDto,
  PostpartumMaternalAssessmentDto,
  RecordApgarInput,
  RegisterNewbornInput,
  UpdateDeliveryInput,
  UserRole,
} from '@lrms/shared';
import { postpartumDeliveryApi } from '../../../services/postpartum-delivery.api.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { DeliveryOutcomeCard } from './DeliveryOutcomeCard.js';
import { DeliveryRegistrationModal } from './DeliveryRegistrationModal.js';
import { DeliveryFinalizeModal } from './DeliveryFinalizeModal.js';
import { NewbornCard } from './NewbornCard.js';
import { NewbornRegistrationModal } from './NewbornRegistrationModal.js';
import { ApgarAssessmentModal } from './ApgarAssessmentModal.js';
import { MaternalPostpartumTimeline } from './MaternalPostpartumTimeline.js';
import { MaternalPostpartumModal } from './MaternalPostpartumModal.js';
import { NewbornCareModal } from './NewbornCareModal.js';
import { MaternalDischargeModal } from './MaternalDischargeModal.js';
import { NewbornDischargeModal } from './NewbornDischargeModal.js';
import { Button } from '../../../components/ui/button.js';
import { Badge } from '../../../components/ui/badge.js';
import { AlertCircle, Baby, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

interface PostpartumDeliveryTabProps {
  admissionId: string;
  userRole?: string;
}

export const PostpartumDeliveryTab: React.FC<PostpartumDeliveryTabProps> = ({
  admissionId,
  userRole,
}) => {
  const { user } = useAuth();

  const [delivery, setDelivery] = useState<DeliveryDto | null>(null);
  const [newborns, setNewborns] = useState<NewbornDto[]>([]);
  const [maternalAssessments, setMaternalAssessments] = useState<PostpartumMaternalAssessmentDto[]>(
    [],
  );
  const [dischargeAuthorizations, setDischargeAuthorizations] = useState<
    PostpartumDischargeAuthorizationDto[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal open states
  const [createDeliveryOpen, setCreateDeliveryOpen] = useState(false);
  const [editDeliveryOpen, setEditDeliveryOpen] = useState(false);
  const [finalizeDeliveryOpen, setFinalizeDeliveryOpen] = useState(false);
  const [registerNewbornOpen, setRegisterNewbornOpen] = useState(false);
  const [apgarModalOpen, setApgarModalOpen] = useState(false);
  const [selectedNewbornForApgar, setSelectedNewbornForApgar] = useState<NewbornDto | null>(null);
  const [maternalAssessmentOpen, setMaternalAssessmentOpen] = useState(false);
  const [newbornCareOpen, setNewbornCareOpen] = useState(false);
  const [selectedNewbornForCare, setSelectedNewbornForCare] = useState<NewbornDto | null>(null);
  const [maternalDischargeOpen, setMaternalDischargeOpen] = useState(false);
  const [newbornDischargeOpen, setNewbornDischargeOpen] = useState(false);
  const [selectedNewbornForDischarge, setSelectedNewbornForDischarge] = useState<NewbornDto | null>(
    null,
  );

  // Role permissions: Caldicott restriction (ADMIN has 0 clinical access)
  const isDoctor = userRole === UserRole.DOCTOR;
  const isNurse = userRole === UserRole.NURSE_STAFF;
  const canClinical = isDoctor || isNurse;

  const canManageDelivery = canClinical;
  const canFinalizeDelivery = isDoctor;
  const canRegisterNewborn = canClinical;
  const canRecordApgar = canClinical;
  const canAssessPostpartum = canClinical;
  const canAuthorizeDischarge = isDoctor;

  const loadData = useCallback(async () => {
    try {
      setErrorMsg(null);
      const [del, babies, matObs, discharges] = await Promise.all([
        postpartumDeliveryApi.getDeliveryByAdmission(admissionId).catch(() => null),
        postpartumDeliveryApi.getNewbornsByAdmission(admissionId).catch(() => []),
        postpartumDeliveryApi.getMaternalPostpartumAssessments(admissionId).catch(() => []),
        postpartumDeliveryApi.getDischargeAuthorizations(admissionId).catch(() => []),
      ]);

      setDelivery(del);
      setNewborns(babies);
      setMaternalAssessments(matObs);
      setDischargeAuthorizations(discharges);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load postpartum & delivery data.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [admissionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Handlers for Submissions
  const handleCreateDelivery = async (input: CreateDeliveryInput | UpdateDeliveryInput) => {
    await postpartumDeliveryApi.createDelivery(admissionId, input as CreateDeliveryInput);
    await loadData();
  };

  const handleUpdateDelivery = async (input: CreateDeliveryInput | UpdateDeliveryInput) => {
    if (!delivery) return;
    await postpartumDeliveryApi.updateDelivery(delivery.id, input as UpdateDeliveryInput);
    await loadData();
  };

  const handleFinalizeDelivery = async (clinicalSummary?: string) => {
    if (!delivery) return;
    await postpartumDeliveryApi.finalizeDelivery(delivery.id, { clinicalSummary });
    await loadData();
  };

  const handleRegisterNewborn = async (input: RegisterNewbornInput) => {
    if (!delivery) return;
    await postpartumDeliveryApi.registerNewborn(delivery.id, input);
    await loadData();
  };

  const handleRecordApgar = async (input: RecordApgarInput) => {
    if (!selectedNewbornForApgar) return;
    await postpartumDeliveryApi.recordApgar(selectedNewbornForApgar.id, input);
    await loadData();
  };

  const handleAddMaternalAssessment = async (input: CreatePostpartumMaternalAssessmentInput) => {
    await postpartumDeliveryApi.createMaternalPostpartumAssessment(admissionId, input);
    await loadData();
  };

  const handleAddNewbornCare = async (input: CreatePostpartumNewbornAssessmentInput) => {
    if (!selectedNewbornForCare) return;
    await postpartumDeliveryApi.createNewbornPostpartumAssessment(selectedNewbornForCare.id, input);
    await loadData();
  };

  const handleAuthorizeMaternalDischarge = async (input: AuthorizeMaternalDischargeInput) => {
    await postpartumDeliveryApi.authorizeMaternalDischarge(admissionId, input);
    await loadData();
  };

  const handleAuthorizeNewbornDischarge = async (input: AuthorizeNewbornDischargeInput) => {
    if (!selectedNewbornForDischarge) return;
    await postpartumDeliveryApi.authorizeNewbornDischarge(selectedNewbornForDischarge.id, input);
    await loadData();
  };

  // Check if mother has been discharged
  const maternalDischarge = dischargeAuthorizations.find(
    (d) => d.dischargedEntityType === DischargedEntityType.MATERNAL,
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        <span className="text-xs text-muted-foreground">
          Loading delivery records, newborn registry, and postpartum care...
        </span>
      </div>
    );
  }

  if (userRole === UserRole.ADMIN) {
    return (
      <div className="p-8 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-center space-y-2">
        <div className="h-10 w-10 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
          Caldicott Data Protection Restriction
        </h3>
        <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
          Administrative accounts are strictly prohibited from viewing identifiable maternal
          delivery outcomes, neonatal birth records, and clinical postpartum surveillance notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Baby className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Ward 18 Labour Room Delivery & Postpartum Care Subsystem
            </h3>
            <p className="text-xs text-muted-foreground">
              Clinical delivery outcomes, individual newborn registrations, 5-component Apgar
              scoring, and independent clinician discharge.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canAuthorizeDischarge && delivery && !maternalDischarge && (
            <Button
              size="sm"
              onClick={() => setMaternalDischargeOpen(true)}
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Authorize Maternal Discharge
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Maternal Discharge Notice if Discharged */}
      {maternalDischarge && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-emerald-950 dark:text-emerald-200">
                Maternal Care Discharged: {maternalDischarge.dischargeDestination}
              </span>
              <p className="text-emerald-800 dark:text-emerald-300 mt-0.5">
                Authorized by {maternalDischarge.authorizedByDoctorFullName || 'Attending Doctor'}{' '}
                on {new Date(maternalDischarge.dischargedAt).toLocaleString()} · Condition:{' '}
                {maternalDischarge.maternalCondition}
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white text-xs">MATERNAL DISCHARGED</Badge>
        </div>
      )}

      {/* Section 1: Delivery Outcome Event */}
      <DeliveryOutcomeCard
        delivery={delivery}
        canManage={canManageDelivery}
        canFinalize={canFinalizeDelivery}
        onOpenCreate={() => setCreateDeliveryOpen(true)}
        onOpenEdit={() => setEditDeliveryOpen(true)}
        onOpenFinalize={() => setFinalizeDeliveryOpen(true)}
      />

      {/* Section 2: Newborn Master Registry & Apgar */}
      {delivery && (
        <NewbornCard
          newborns={newborns}
          canRegister={canRegisterNewborn}
          canRecordApgar={canRecordApgar}
          canAssessPostpartum={canAssessPostpartum}
          canAuthorizeDischarge={canAuthorizeDischarge}
          onOpenRegisterNewborn={() => setRegisterNewbornOpen(true)}
          onOpenRecordApgar={(baby) => {
            setSelectedNewbornForApgar(baby);
            setApgarModalOpen(true);
          }}
          onOpenNewbornCare={(baby) => {
            setSelectedNewbornForCare(baby);
            setNewbornCareOpen(true);
          }}
          onOpenDischargeNewborn={(baby) => {
            setSelectedNewbornForDischarge(baby);
            setNewbornDischargeOpen(true);
          }}
        />
      )}

      {/* Section 3: Maternal Postpartum Surveillance */}
      <MaternalPostpartumTimeline
        assessments={maternalAssessments}
        canAssess={canAssessPostpartum}
        onOpenAddAssessment={() => setMaternalAssessmentOpen(true)}
      />

      {/* Modals & Dialogs */}
      <DeliveryRegistrationModal
        open={createDeliveryOpen || editDeliveryOpen}
        onOpenChange={(val) => {
          if (!val) {
            setCreateDeliveryOpen(false);
            setEditDeliveryOpen(false);
          }
        }}
        existingDelivery={editDeliveryOpen ? delivery : null}
        onSubmit={editDeliveryOpen ? handleUpdateDelivery : handleCreateDelivery}
        attendingStaffList={
          user ? [{ id: user.id, fullName: user.fullName || user.username, role: user.role }] : []
        }
      />

      {delivery && (
        <DeliveryFinalizeModal
          open={finalizeDeliveryOpen}
          onOpenChange={setFinalizeDeliveryOpen}
          deliveryReferenceId={delivery.deliveryReferenceId}
          onFinalize={handleFinalizeDelivery}
        />
      )}

      {delivery && (
        <NewbornRegistrationModal
          open={registerNewbornOpen}
          onOpenChange={setRegisterNewbornOpen}
          nextBirthOrder={newborns.length + 1}
          deliveryReferenceId={delivery.deliveryReferenceId}
          defaultDeliveredByUserId={user?.id || ''}
          onSubmit={handleRegisterNewborn}
        />
      )}

      {selectedNewbornForApgar && (
        <ApgarAssessmentModal
          open={apgarModalOpen}
          onOpenChange={setApgarModalOpen}
          newbornId={selectedNewbornForApgar.id}
          babyLabel={`Baby #${selectedNewbornForApgar.birthOrder} (${selectedNewbornForApgar.provisionalName || selectedNewbornForApgar.newbornReferenceId})`}
          existingAssessments={selectedNewbornForApgar.apgarAssessments || []}
          onSubmit={handleRecordApgar}
        />
      )}

      <MaternalPostpartumModal
        open={maternalAssessmentOpen}
        onOpenChange={setMaternalAssessmentOpen}
        onSubmit={handleAddMaternalAssessment}
      />

      {selectedNewbornForCare && (
        <NewbornCareModal
          open={newbornCareOpen}
          onOpenChange={setNewbornCareOpen}
          newbornId={selectedNewbornForCare.id}
          babyLabel={`Baby #${selectedNewbornForCare.birthOrder} (${selectedNewbornForCare.provisionalName || selectedNewbornForCare.newbornReferenceId})`}
          onSubmit={handleAddNewbornCare}
        />
      )}

      <MaternalDischargeModal
        open={maternalDischargeOpen}
        onOpenChange={setMaternalDischargeOpen}
        admissionReferenceId={delivery?.deliveryReferenceId || admissionId.slice(0, 8)}
        hasActiveBed={true}
        onSubmit={handleAuthorizeMaternalDischarge}
      />

      {selectedNewbornForDischarge && (
        <NewbornDischargeModal
          open={newbornDischargeOpen}
          onOpenChange={setNewbornDischargeOpen}
          newbornId={selectedNewbornForDischarge.id}
          babyLabel={`Baby #${selectedNewbornForDischarge.birthOrder} (${selectedNewbornForDischarge.provisionalName || ''})`}
          newbornReferenceId={selectedNewbornForDischarge.newbornReferenceId}
          onSubmit={handleAuthorizeNewbornDischarge}
        />
      )}
    </div>
  );
};
