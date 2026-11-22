import React, { useState } from 'react';
import { CarePlanLifecycleState, ClinicalCarePlanDto, UserRole } from '@lrms/shared';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  FileCheck2,
  FileText,
  History,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { Button } from '../../../components/ui/button.js';
import { Badge } from '../../../components/ui/badge.js';
import { CarePlanTransitionDialog } from './CarePlanTransitionDialog.js';
import { CarePlanAmendDialog } from './CarePlanAmendDialog.js';
import { CarePlanReviewDialog } from './CarePlanReviewDialog.js';
import { formatColomboDateTime, formatColomboTime } from '../../../lib/datetime.js';
import { humanizeEnum } from '../../../lib/labels.js';

interface ClinicalCarePlanCardProps {
  admissionId: string;
  plan: ClinicalCarePlanDto;
  userRole?: UserRole;
  onRefresh: () => void;
}

export const ClinicalCarePlanCard: React.FC<ClinicalCarePlanCardProps> = ({
  admissionId,
  plan,
  userRole,
  onRefresh,
}) => {
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  const currentVer = plan.currentVersion;
  const isDraft = plan.currentState === CarePlanLifecycleState.DRAFT;
  const isPending = plan.currentState === CarePlanLifecycleState.PENDING_APPROVAL;
  const isActive = plan.currentState === CarePlanLifecycleState.ACTIVE;
  const isReviewReq = plan.currentState === CarePlanLifecycleState.REVIEW_REQUIRED;
  const isCompleted = plan.currentState === CarePlanLifecycleState.COMPLETED;
  const isCancelled = plan.currentState === CarePlanLifecycleState.CANCELLED;

  const isReviewOverdue = plan.plannedReviewAt && new Date() > new Date(plan.plannedReviewAt);

  const getStateBadge = () => {
    switch (plan.currentState) {
      case CarePlanLifecycleState.ACTIVE:
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">ACTIVE</Badge>;
      case CarePlanLifecycleState.PENDING_APPROVAL:
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white">PENDING APPROVAL</Badge>
        );
      case CarePlanLifecycleState.REVIEW_REQUIRED:
        return <Badge className="bg-rose-600 hover:bg-rose-700 text-white">REVIEW REQUIRED</Badge>;
      case CarePlanLifecycleState.ON_HOLD:
        return <Badge className="bg-slate-600 hover:bg-slate-700 text-white">ON HOLD</Badge>;
      case CarePlanLifecycleState.COMPLETED:
        return <Badge variant="secondary">COMPLETED</Badge>;
      case CarePlanLifecycleState.CANCELLED:
        return <Badge variant="destructive">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">DRAFT</Badge>;
    }
  };

  return (
    <div
      data-testid={`care-plan-card-${plan.id}`}
      className="bg-card border rounded-lg p-5 shadow-sm space-y-4 text-left"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            <span className="font-mono text-xs font-bold text-muted-foreground">
              {plan.carePlanReferenceId}
            </span>
            {getStateBadge()}
            <Badge variant="outline" className="font-mono text-xs">
              v{plan.currentVersionNumber}
            </Badge>
          </div>
          <h3 className="text-base font-semibold">{currentVer?.title || 'Care Plan'}</h3>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2">
          {(isActive || isReviewReq) && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReviewOpen(true)}
                data-testid="btn-record-review"
              >
                <Stethoscope className="h-4 w-4 mr-1 text-primary" />
                Record Review
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAmendOpen(true)}
                data-testid="btn-amend-plan"
              >
                <Edit3 className="h-4 w-4 mr-1 text-amber-600" />
                Amend Plan
              </Button>
            </>
          )}

          {!isCompleted && !isCancelled && (
            <Button
              size="sm"
              variant={isPending ? 'default' : 'outline'}
              onClick={() => setTransitionOpen(true)}
              data-testid="btn-transition-plan"
            >
              {isPending && userRole === UserRole.DOCTOR ? (
                <>
                  <ShieldCheck className="h-4 w-4 mr-1 text-white" />
                  Approve Plan
                </>
              ) : (
                'Transition State'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Review Timer / Overdue Notice */}
      {plan.plannedReviewAt && (isActive || isReviewReq) && (
        <div
          className={`flex items-center gap-2 text-xs p-2.5 rounded-md ${
            isReviewOverdue
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          {isReviewOverdue ? (
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          ) : (
            <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
          )}
          <span>
            {isReviewOverdue
              ? `Review Overdue! Was scheduled for ${formatColomboTime(plan.plannedReviewAt)}`
              : `Next planned clinical review: ${formatColomboTime(plan.plannedReviewAt)}`}
          </span>
        </div>
      )}

      {/* Clinical Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3 bg-muted/30 rounded-md space-y-1">
          <span className="font-semibold text-muted-foreground block">Assessment Summary</span>
          <p className="text-foreground">{currentVer?.assessmentSummary}</p>
          {currentVer?.clinicalConcerns && (
            <p className="text-amber-700 dark:text-amber-400 mt-2 font-medium">
              Concerns: {currentVer.clinicalConcerns}
            </p>
          )}
        </div>

        <div className="p-3 bg-muted/30 rounded-md space-y-2">
          <div>
            <span className="font-semibold text-muted-foreground block">Clinical Objectives</span>
            <p className="text-foreground">{currentVer?.objectives}</p>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground block">
              Planned Actions & Interventions
            </span>
            <p className="text-foreground">{currentVer?.plannedActions}</p>
          </div>
        </div>
      </div>

      {/* Approval & Attribution Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-1 border-t">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            Created by: {plan.createdByUser?.fullName || 'Clinician'}
          </span>
          {plan.approvedByUser && (
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Approved by: {plan.approvedByUser.fullName} (Doctor)
            </span>
          )}
        </div>

        {/* Toggles for Versions & Reviews */}
        <div className="flex items-center gap-3">
          {plan.versions && plan.versions.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setShowVersions(!showVersions)}
            >
              <History className="h-3.5 w-3.5 mr-1" />
              {plan.versions.length} Versions
              {showVersions ? (
                <ChevronUp className="h-3 w-3 ml-1" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-1" />
              )}
            </Button>
          )}

          {plan.reviews && plan.reviews.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setShowReviews(!showReviews)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {plan.reviews.length} Reviews
              {showReviews ? (
                <ChevronUp className="h-3 w-3 ml-1" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-1" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Version History Drawer */}
      {showVersions && plan.versions && (
        <div className="mt-3 p-3 bg-muted/40 rounded-md border text-xs space-y-2">
          <span className="font-semibold block text-foreground">Immutable Version History</span>
          <div className="space-y-2">
            {plan.versions.map((ver) => (
              <div
                key={ver.id}
                className="p-2 border rounded bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-mono font-bold mr-2">v{ver.versionNumber}</span>
                  <span className="font-medium mr-2">{ver.title}</span>
                  <span className="text-muted-foreground text-[11px]">
                    ({formatColomboDateTime(ver.createdAt)})
                  </span>
                  {ver.changeReason && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                      Reason: {ver.changeReason}
                    </p>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  Author: {ver.createdByUser?.fullName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review History Drawer */}
      {showReviews && plan.reviews && (
        <div className="mt-3 p-3 bg-muted/40 rounded-md border text-xs space-y-2">
          <span className="font-semibold block text-foreground">Formal Clinical Reviews</span>
          <div className="space-y-2">
            {plan.reviews.map((rev) => (
              <div key={rev.id} className="p-2 border rounded bg-background space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <Badge variant="outline" className="text-[10px]">
                    {humanizeEnum(rev.reviewOutcome)}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatColomboDateTime(rev.createdAt)} by {rev.reviewedByUser?.fullName}
                  </span>
                </div>
                <p className="text-foreground text-[11px]">{rev.reviewNotes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      {transitionOpen && (
        <CarePlanTransitionDialog
          admissionId={admissionId}
          carePlanId={plan.id}
          currentState={plan.currentState}
          userRole={userRole}
          isOpen={transitionOpen}
          onClose={() => setTransitionOpen(false)}
          onTransitioned={onRefresh}
        />
      )}

      {amendOpen && (
        <CarePlanAmendDialog
          admissionId={admissionId}
          plan={plan}
          isOpen={amendOpen}
          onClose={() => setAmendOpen(false)}
          onAmended={onRefresh}
        />
      )}

      {reviewOpen && (
        <CarePlanReviewDialog
          admissionId={admissionId}
          carePlanId={plan.id}
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          onReviewed={onRefresh}
        />
      )}
    </div>
  );
};
