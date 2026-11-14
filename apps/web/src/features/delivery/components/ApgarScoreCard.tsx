import React from 'react';
import { ApgarAssessmentDto, ApgarMinute } from '@lrms/shared';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import { AlertCircle, Award, CheckCircle, Clock } from 'lucide-react';

interface ApgarScoreCardProps {
  newbornId: string;
  assessments: ApgarAssessmentDto[];
  canRecord: boolean;
  onRecord: () => void;
}

export const ApgarScoreCard: React.FC<ApgarScoreCardProps> = ({
  assessments,
  canRecord,
  onRecord,
}) => {
  const getScoreColor = (total: number) => {
    if (total >= 7)
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300';
    if (total >= 4)
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300';
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300';
  };

  const getScoreLabel = (total: number) => {
    if (total >= 7) return 'Reassuring (7-10)';
    if (total >= 4) return 'Moderate Depression (4-6)';
    return 'Critical Depression (0-3)';
  };

  const standardMinutes = [ApgarMinute.ONE_MIN, ApgarMinute.FIVE_MIN, ApgarMinute.TEN_MIN];

  return (
    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Award className="w-3.5 h-3.5 text-amber-600" />
          Apgar Assessment History (5 Structured Components)
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="p-2.5 rounded bg-slate-100/60 dark:bg-slate-800/40 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>No Apgar scores recorded yet for this infant.</span>
          {canRecord && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRecord}
              className="h-6 text-[11px] text-primary"
            >
              Record 1-Minute Score
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {standardMinutes.map((minute) => {
            // Find latest non-superseded assessment for this minute
            const match = assessments
              .filter((a) => a.assessmentMinute === minute)
              .sort(
                (a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime(),
              )[0];

            if (!match) {
              return (
                <div
                  key={minute}
                  className="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center"
                >
                  <span className="font-semibold text-slate-600 dark:text-slate-400 block text-[11px]">
                    {minute.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Pending</span>
                </div>
              );
            }

            return (
              <div
                key={match.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    {match.assessmentMinute.replace(/_/g, ' ')}
                  </span>
                  <Badge
                    variant="outline"
                    className={`font-mono font-bold text-xs ${getScoreColor(match.totalScore)}`}
                  >
                    {match.totalScore} / 10
                  </Badge>
                </div>

                <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>{getScoreLabel(match.totalScore)}</span>
                  <span>
                    {new Date(match.assessedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[9px] text-center font-mono">
                  <div title="Appearance (Color)">
                    <span className="text-muted-foreground block">A</span>
                    <span className="font-bold">{match.appearance}</span>
                  </div>
                  <div title="Pulse (Heart Rate)">
                    <span className="text-muted-foreground block">P</span>
                    <span className="font-bold">{match.pulse}</span>
                  </div>
                  <div title="Grimace (Reflex)">
                    <span className="text-muted-foreground block">G</span>
                    <span className="font-bold">{match.grimace}</span>
                  </div>
                  <div title="Activity (Muscle Tone)">
                    <span className="text-muted-foreground block">A</span>
                    <span className="font-bold">{match.activity}</span>
                  </div>
                  <div title="Respiration (Effort)">
                    <span className="text-muted-foreground block">R</span>
                    <span className="font-bold">{match.respiration}</span>
                  </div>
                </div>

                {match.notes && (
                  <p className="text-[10px] text-muted-foreground italic truncate">
                    Note: {match.notes}
                  </p>
                )}

                {match.supersedesId && (
                  <p className="text-[9px] text-amber-700 dark:text-amber-300 font-semibold truncate">
                    Corrected: {match.supersedeReason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
