import React from 'react';
import {
  LochiaAmount,
  LochiaType,
  MaternalReviewStatus,
  PostpartumMaternalAssessmentDto,
  UterineTone,
} from '@lrms/shared';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { Activity, AlertTriangle, Clock, Heart, Plus, Thermometer, UserCheck } from 'lucide-react';

interface MaternalPostpartumTimelineProps {
  assessments: PostpartumMaternalAssessmentDto[];
  canAssess: boolean;
  onOpenAddAssessment: () => void;
}

export const MaternalPostpartumTimeline: React.FC<MaternalPostpartumTimelineProps> = ({
  assessments,
  canAssess,
  onOpenAddAssessment,
}) => {
  const getReviewBadge = (status: MaternalReviewStatus) => {
    switch (status) {
      case MaternalReviewStatus.ESCALATED:
        return (
          <Badge variant="destructive" className="text-[10px]">
            ESCALATED
          </Badge>
        );
      case MaternalReviewStatus.REVIEW_REQUESTED:
        return <Badge className="bg-amber-600 text-white text-[10px]">REVIEW REQUESTED</Badge>;
      case MaternalReviewStatus.ROUTINE:
      default:
        return (
          <Badge variant="outline" className="text-[10px] text-slate-700">
            ROUTINE
          </Badge>
        );
    }
  };

  const getToneBadge = (tone: UterineTone | null) => {
    if (!tone) return null;
    switch (tone) {
      case UterineTone.WELL_CONTRACTED:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
            Contracted
          </Badge>
        );
      case UterineTone.RELAXED_BOGGY:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
            Relaxed / Boggy
          </Badge>
        );
      case UterineTone.TONIC:
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Tonic</Badge>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Postpartum Maternal Surveillance
              </h3>
              <Badge variant="outline" className="text-xs">
                {assessments.length} Observations
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Uterine involution, vital signs, lochial discharge, perineum healing, and
              post-delivery stability.
            </p>
          </div>
        </div>

        {canAssess && (
          <Button size="sm" onClick={onOpenAddAssessment} className="gap-1.5 text-xs h-8">
            <Plus className="w-3.5 h-3.5" />
            Add Maternal Check
          </Button>
        )}
      </div>

      <div className="p-6">
        {assessments.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No postpartum maternal assessments recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-800/30 text-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {new Date(item.assessmentTimestamp).toLocaleString()}
                    </span>
                    {getReviewBadge(item.clinicalReviewStatus)}
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-slate-500" />
                    Recorded by {item.recordedByFullName || 'Clinical Staff'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Blood Pressure</span>
                    <span className="font-mono font-semibold">
                      {item.systolicBp && item.diastolicBp
                        ? `${item.systolicBp}/${item.diastolicBp} mmHg`
                        : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block">Pulse Rate</span>
                    <span className="font-mono font-semibold">
                      {item.pulseRate ? `${item.pulseRate} bpm` : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block">Uterine Tone</span>
                    <div className="mt-0.5">
                      {getToneBadge(item.uterineTone) || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block">Lochia</span>
                    <span className="font-semibold">
                      {item.lochiaAmount || item.lochiaType
                        ? `${item.lochiaAmount || ''} ${item.lochiaType || ''}`
                        : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block">
                      Pain Score (0-10)
                    </span>
                    <span className="font-mono font-semibold">
                      {item.painScore !== null ? `${item.painScore} / 10` : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block">Bladder Voided</span>
                    <span className="font-semibold">{item.bladderStatus || '—'}</span>
                  </div>
                </div>

                {(item.perinealWoundStatus || item.clinicalNotes) && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-muted-foreground flex flex-wrap gap-4">
                    {item.perinealWoundStatus && (
                      <div>
                        <strong className="text-slate-700 dark:text-slate-300">Perineum:</strong>{' '}
                        {item.perinealWoundStatus}
                      </div>
                    )}
                    {item.clinicalNotes && (
                      <div>
                        <strong className="text-slate-700 dark:text-slate-300">Notes:</strong>{' '}
                        {item.clinicalNotes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
