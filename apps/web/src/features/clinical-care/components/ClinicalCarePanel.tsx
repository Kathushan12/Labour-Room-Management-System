import React, { useState, useEffect, useCallback } from 'react';
import {
  ClinicalCarePlanDto,
  ClinicalEscalationDto,
  EmergencyOverrideDto,
  EmergencyResponseDto,
  EmergencyResponseStatus,
  SurgicalReviewDto,
  UserRole,
} from '@lrms/shared';
import {
  AlertCircle,
  FilePlus2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Siren,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/button.js';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';
import { EmergencyResponseBanner } from './EmergencyResponseBanner.js';
import { EmergencyResponseDialog } from './EmergencyResponseDialog.js';
import { EmergencyOverrideDialog } from './EmergencyOverrideDialog.js';
import { ClinicalCarePlanCard } from './ClinicalCarePlanCard.js';
import { CarePlanCreateDialog } from './CarePlanCreateDialog.js';
import { ClinicalEscalationPanel } from './ClinicalEscalationPanel.js';
import { SurgicalReviewCard } from './SurgicalReviewCard.js';

interface ClinicalCarePanelProps {
  admissionId: string;
  userRole?: UserRole;
}

export const ClinicalCarePanel: React.FC<ClinicalCarePanelProps> = ({ admissionId, userRole }) => {
  const [plans, setPlans] = useState<ClinicalCarePlanDto[]>([]);
  const [escalations, setEscalations] = useState<ClinicalEscalationDto[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyResponseDto[]>([]);
  const [surgicalReviews, setSurgicalReviews] = useState<SurgicalReviewDto[]>([]);
  const [overrides, setOverrides] = useState<EmergencyOverrideDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  // Dialog states
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setIsAccessDenied(false);

    try {
      const [pRes, eRes, emRes, sRes, oRes] = await Promise.allSettled([
        clinicalCareApi.getCarePlans(admissionId),
        clinicalCareApi.getEscalations(admissionId),
        clinicalCareApi.getEmergencyResponses(admissionId),
        clinicalCareApi.getSurgicalReviews(admissionId),
        clinicalCareApi.getOverridesForAdmission(admissionId),
      ]);

      if (pRes.status === 'fulfilled') {
        setPlans(pRes.value);
      } else if (
        (pRes.reason as any)?.response?.status === 403 ||
        (pRes.reason as any)?.status === 403
      ) {
        setIsAccessDenied(true);
      }

      if (eRes.status === 'fulfilled') setEscalations(eRes.value);
      if (emRes.status === 'fulfilled') setEmergencies(emRes.value);
      if (sRes.status === 'fulfilled') setSurgicalReviews(sRes.value);
      if (oRes.status === 'fulfilled') setOverrides(oRes.value);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load clinical care data');
    } finally {
      setLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Emergency banner actions
  const handleAcknowledgeEmergency = async (id: string) => {
    try {
      await clinicalCareApi.acknowledgeEmergencyResponse(admissionId, id);
      loadData();
    } catch (err) {
      console.error('Failed to acknowledge emergency response:', err);
    }
  };

  const handleMobilizeEmergency = async (id: string) => {
    try {
      await clinicalCareApi.transitionEmergencyResponse(admissionId, id, {
        targetStatus: EmergencyResponseStatus.IN_PROGRESS,
      });
      loadData();
    } catch (err) {
      console.error('Failed to mobilize emergency response:', err);
    }
  };

  const handleResolveEmergency = async (id: string) => {
    try {
      await clinicalCareApi.transitionEmergencyResponse(admissionId, id, {
        targetStatus: EmergencyResponseStatus.RESOLVED,
        resolutionNotes: 'Clinical crisis resolved at bedside',
      });
      loadData();
    } catch (err) {
      console.error('Failed to resolve emergency response:', err);
    }
  };

  const activePlan =
    plans.find((p) => p.currentState === 'ACTIVE' || p.currentState === 'REVIEW_REQUIRED') ||
    plans[0];

  const activeOverride = overrides.find((o) => o.isActive);

  if (isAccessDenied) {
    return (
      <div className="p-8 border-2 border-dashed border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl text-center space-y-4">
        <div className="p-3 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 w-fit mx-auto rounded-full">
          <Lock className="h-8 w-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
            Patient Assignment Required
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300">
            You are not currently assigned to this patient's admission episode. Under Sri Lankan
            healthcare governance (MOH Circular 01-36/2024), access to identifiable clinical records
            requires an active clinical assignment or break-glass authorization.
          </p>
        </div>

        {userRole !== UserRole.ADMIN && (
          <Button
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm"
            onClick={() => setBreakGlassOpen(true)}
            data-testid="btn-break-glass-trigger"
          >
            <ShieldAlert className="h-4 w-4 mr-1.5" />
            Declare Break-Glass Emergency Access
          </Button>
        )}

        {breakGlassOpen && (
          <EmergencyOverrideDialog
            admissionId={admissionId}
            isOpen={breakGlassOpen}
            onClose={() => setBreakGlassOpen(false)}
            onOverrideGranted={loadData}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="clinical-care-panel">
      {/* Active Emergency Banners */}
      <EmergencyResponseBanner
        responses={emergencies}
        onAcknowledge={handleAcknowledgeEmergency}
        onMobilize={handleMobilizeEmergency}
        onResolve={handleResolveEmergency}
      />

      {/* Break-glass active notice */}
      {activeOverride && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Break-Glass Emergency Access Active:</strong> {activeOverride.reason} (Expires
              in{' '}
              {Math.max(
                0,
                Math.round(
                  (new Date(activeOverride.expiresAt!).getTime() - Date.now()) / (60 * 1000),
                ),
              )}{' '}
              mins)
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-400 text-amber-900 hover:bg-amber-100"
            onClick={async () => {
              await clinicalCareApi.revokeEmergencyOverride(admissionId, activeOverride.id);
              loadData();
            }}
          >
            Revoke Access
          </Button>
        </div>
      )}

      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-lg p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Clinical Care Plan, Escalation & Emergency Response
          </h2>
          <p className="text-xs text-muted-foreground">
            Multi-disciplinary obstetric management, structured vital sign escalations, and theatre
            coordination.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading} className="h-8">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-medium h-8"
            onClick={() => setEmergencyOpen(true)}
            data-testid="btn-initiate-emergency"
          >
            <Siren className="h-3.5 w-3.5 mr-1" />
            Initiate Emergency
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Care Plan Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Active Clinical Care Plan
          </h3>
          {!activePlan && (
            <Button
              size="sm"
              onClick={() => setCreatePlanOpen(true)}
              data-testid="btn-create-first-care-plan"
            >
              <FilePlus2 className="h-4 w-4 mr-1" />
              Draft Care Plan
            </Button>
          )}
        </div>

        {activePlan ? (
          <ClinicalCarePlanCard
            admissionId={admissionId}
            plan={activePlan}
            userRole={userRole}
            onRefresh={loadData}
          />
        ) : (
          <div className="p-8 border border-dashed rounded-lg text-center bg-muted/10 space-y-3">
            <FilePlus2 className="h-8 w-8 text-muted-foreground mx-auto opacity-70" />
            <div>
              <p className="text-sm font-semibold">No Clinical Care Plan Formulated</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every admitted patient in Ward 18 requires a structured care plan defining
                monitoring goals and clinical interventions.
              </p>
            </div>
            <Button size="sm" onClick={() => setCreatePlanOpen(true)}>
              Formulate Care Plan
            </Button>
          </div>
        )}
      </div>

      {/* 2. Escalations Section */}
      <ClinicalEscalationPanel
        admissionId={admissionId}
        escalations={escalations}
        onRefresh={loadData}
      />

      {/* 3. Surgical Review Section */}
      <SurgicalReviewCard
        admissionId={admissionId}
        reviews={surgicalReviews}
        userRole={userRole}
        onRefresh={loadData}
      />

      {/* Dialogs */}
      {createPlanOpen && (
        <CarePlanCreateDialog
          admissionId={admissionId}
          isOpen={createPlanOpen}
          onClose={() => setCreatePlanOpen(false)}
          onCreated={loadData}
        />
      )}

      {emergencyOpen && (
        <EmergencyResponseDialog
          admissionId={admissionId}
          isOpen={emergencyOpen}
          onClose={() => setEmergencyOpen(false)}
          onInitiated={loadData}
        />
      )}
    </div>
  );
};
