import React, { useState } from 'react';
import { CaesareanDecision, SurgicalReviewDto, SurgicalReviewStatus, UserRole } from '@lrms/shared';
import { CheckCircle2, FileSpreadsheet, Plus, ShieldCheck, Stethoscope } from 'lucide-react';
import { Button } from '../../../components/ui/button.js';
import { Badge } from '../../../components/ui/badge.js';
import { SurgicalDecisionDialog } from './SurgicalDecisionDialog.js';
import { SurgicalReadinessDialog } from './SurgicalReadinessDialog.js';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';
import { formatColomboTime } from '../../../lib/datetime.js';
import { humanizeEnum } from '../../../lib/labels.js';

interface SurgicalReviewCardProps {
  admissionId: string;
  reviews: SurgicalReviewDto[];
  userRole?: UserRole;
  onRefresh: () => void;
}

export const SurgicalReviewCard: React.FC<SurgicalReviewCardProps> = ({
  admissionId,
  reviews,
  userRole,
  onRefresh,
}) => {
  const [selectedReviewForDecision, setSelectedReviewForDecision] = useState<string | null>(null);
  const [selectedReviewForCoordination, setSelectedReviewForCoordination] =
    useState<SurgicalReviewDto | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [indication, setIndication] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);

  const handleRequestReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (indication.trim().length < 10) return;
    setRequesting(true);
    try {
      await clinicalCareApi.requestSurgicalReview(admissionId, {
        clinicalIndication: indication.trim(),
      });
      setIndication('');
      setShowRequestForm(false);
      onRefresh();
    } catch {
      // Handled
    } finally {
      setRequesting(false);
    }
  };

  const getDecisionBadge = (d: CaesareanDecision) => {
    switch (d) {
      case CaesareanDecision.APPROVED_FOR_THEATRE:
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white font-semibold">
            CAESAREAN APPROVED
          </Badge>
        );
      case CaesareanDecision.NOT_INDICATED:
        return <Badge className="bg-emerald-600 text-white">VAGINAL TRIAL CONTINUED</Badge>;
      case CaesareanDecision.DEFERRED:
        return <Badge className="bg-amber-600 text-white">DECISION DEFERRED</Badge>;
      default:
        return <Badge variant="outline">CONSIDERED</Badge>;
    }
  };

  return (
    <div className="bg-card border rounded-lg p-5 shadow-sm space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-indigo-600" />
            Obstetric Surgical Reviews & Emergency Theatre ({reviews.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Urgent consultant evaluation, human-authorized caesarean decision, and theatre readiness
            checklist.
          </p>
        </div>

        {!showRequestForm && (
          <Button
            size="sm"
            variant="outline"
            className="border-indigo-600 text-indigo-700 hover:bg-indigo-50"
            onClick={() => setShowRequestForm(true)}
            data-testid="btn-request-surgical-review"
          >
            <Plus className="h-4 w-4 mr-1" />
            Request Surgical Review
          </Button>
        )}
      </div>

      {showRequestForm && (
        <form
          onSubmit={handleRequestReview}
          className="p-4 bg-muted/30 border rounded-md space-y-3"
        >
          <span className="font-semibold text-xs block text-foreground">
            Request Urgent Obstetric Surgical Consultation
          </span>
          <textarea
            aria-label="Clinical indication for surgical review"
            rows={2}
            value={indication}
            onChange={(e) => setIndication(e.target.value)}
            placeholder="Clinical indication for review (e.g. Failure to progress in 2nd stage, CTG pathological with severe bradycardia)..."
            required
            className="w-full text-xs p-2.5 border rounded-md"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRequestForm(false)}
              disabled={requesting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={requesting || indication.trim().length < 10}
            >
              Submit Consultation Request
            </Button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="p-6 text-center border border-dashed rounded-md bg-muted/20">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-medium">No Surgical Reviews Requested</p>
          <p className="text-xs text-muted-foreground mt-1">
            Labour progressing normally without immediate operative indication.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((sr) => {
            const isDecisionPending = sr.caesareanDecision === CaesareanDecision.CONSIDERED;
            const isApproved = sr.caesareanDecision === CaesareanDecision.APPROVED_FOR_THEATRE;
            const isHandedOver = sr.status === SurgicalReviewStatus.READY_FOR_HANDOVER;

            return (
              <div
                key={sr.id}
                data-testid={`surgical-review-card-${sr.id}`}
                className={`p-4 border rounded-lg bg-card space-y-3 ${
                  isApproved ? 'border-amber-400 dark:border-amber-600 bg-amber-50/10' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {sr.reviewReferenceId}
                    </span>
                    {getDecisionBadge(sr.caesareanDecision)}
                    <Badge variant="outline" className="text-xs">
                      {humanizeEnum(sr.status)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Requested: {formatColomboTime(sr.createdAt)}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <span className="font-semibold text-muted-foreground block">
                    Clinical Indication:
                  </span>
                  <p className="text-foreground">{sr.clinicalIndication}</p>
                  {sr.decisionRationale && (
                    <div className="mt-2 p-2.5 bg-muted/40 rounded border text-foreground">
                      <span className="font-semibold block text-[11px] text-muted-foreground">
                        Consultant Decision Rationale:
                      </span>
                      <p>{sr.decisionRationale}</p>
                    </div>
                  )}
                </div>

                {/* Multidisciplinary Status Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/20 p-2.5 rounded border">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Anaesthetic Review:
                    </span>
                    <strong className="text-foreground">
                      {humanizeEnum(sr.anaesthesiaReviewStatus)}
                    </strong>
                    {sr.anaesthesiaNotes && (
                      <p className="text-muted-foreground text-[10px] mt-0.5">
                        {sr.anaesthesiaNotes}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Operating Theatre Readiness:
                    </span>
                    <strong className="text-foreground">
                      {humanizeEnum(sr.theatreReadinessStatus)}
                    </strong>
                    {sr.theatreReadyAt && (
                      <span className="text-emerald-700 dark:text-emerald-400 text-[10px] block">
                        Theatre Ready: {formatColomboTime(sr.theatreReadyAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions & Handover Sign-off */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-muted-foreground">
                    {sr.consultantUser ? (
                      <span>
                        Consultant: <strong>{sr.consultantUser.fullName}</strong>
                      </span>
                    ) : (
                      <span>
                        Consultant: <em>Awaiting assessment</em>
                      </span>
                    )}
                    {sr.handedOverAt && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold ml-3">
                        ✓ Handed over to Theatre at {formatColomboTime(sr.handedOverAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {isDecisionPending && userRole === UserRole.DOCTOR && (
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground h-8 text-xs"
                        onClick={() => setSelectedReviewForDecision(sr.id)}
                        data-testid="btn-record-decision"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        Record Decision
                      </Button>
                    )}

                    {!isHandedOver && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setSelectedReviewForCoordination(sr)}
                        data-testid="btn-update-coordination"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                        Readiness Checklist
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedReviewForDecision && (
        <SurgicalDecisionDialog
          admissionId={admissionId}
          reviewId={selectedReviewForDecision}
          isOpen={!!selectedReviewForDecision}
          onClose={() => setSelectedReviewForDecision(null)}
          onDecided={onRefresh}
        />
      )}

      {selectedReviewForCoordination && (
        <SurgicalReadinessDialog
          admissionId={admissionId}
          review={selectedReviewForCoordination}
          isOpen={!!selectedReviewForCoordination}
          onClose={() => setSelectedReviewForCoordination(null)}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
};
