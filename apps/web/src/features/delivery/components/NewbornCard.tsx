import React from 'react';
import { BirthOutcome, NewbornDischargeStatus, NewbornDto, NewbornSex } from '@lrms/shared';
import { Badge } from '../../../components/ui/badge.js';
import { Button } from '../../../components/ui/button.js';
import {
  Activity,
  Award,
  Baby,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  Plus,
  Scale,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { ApgarScoreCard } from './ApgarScoreCard.js';

interface NewbornCardProps {
  newborns: NewbornDto[];
  canRegister: boolean;
  canRecordApgar: boolean;
  canAssessPostpartum: boolean;
  canAuthorizeDischarge: boolean;
  onOpenRegisterNewborn: () => void;
  onOpenRecordApgar: (newborn: NewbornDto) => void;
  onOpenNewbornCare: (newborn: NewbornDto) => void;
  onOpenDischargeNewborn: (newborn: NewbornDto) => void;
}

export const NewbornCard: React.FC<NewbornCardProps> = ({
  newborns,
  canRegister,
  canRecordApgar,
  canAssessPostpartum,
  canAuthorizeDischarge,
  onOpenRegisterNewborn,
  onOpenRecordApgar,
  onOpenNewbornCare,
  onOpenDischargeNewborn,
}) => {
  const getOutcomeBadge = (outcome: BirthOutcome) => {
    switch (outcome) {
      case BirthOutcome.LIVE_BIRTH:
        return <Badge className="bg-emerald-600 text-white text-[10px]">LIVE BIRTH</Badge>;
      case BirthOutcome.STILLBIRTH_FRESH:
        return (
          <Badge variant="destructive" className="text-[10px]">
            STILLBIRTH (FRESH)
          </Badge>
        );
      case BirthOutcome.STILLBIRTH_MACERATED:
        return (
          <Badge variant="destructive" className="text-[10px]">
            STILLBIRTH (MACERATED)
          </Badge>
        );
      case BirthOutcome.NEONATAL_DEATH:
        return (
          <Badge variant="destructive" className="text-[10px]">
            NEONATAL DEATH
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {outcome}
          </Badge>
        );
    }
  };

  const getDischargeBadge = (status: NewbornDischargeStatus) => {
    switch (status) {
      case NewbornDischargeStatus.IN_CARE:
        return (
          <Badge
            variant="outline"
            className="text-teal-700 border-teal-300 bg-teal-50 dark:bg-teal-950/40 text-[10px]"
          >
            IN CARE
          </Badge>
        );
      case NewbornDischargeStatus.DISCHARGED_WITH_MOTHER:
        return (
          <Badge className="bg-emerald-600 text-white text-[10px]">DISCHARGED W/ MOTHER</Badge>
        );
      case NewbornDischargeStatus.TRANSFERRED_SCBU:
      case NewbornDischargeStatus.TRANSFERRED_NICU:
        return (
          <Badge className="bg-amber-600 text-white text-[10px]">{status.replace(/_/g, ' ')}</Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status.replace(/_/g, ' ')}
          </Badge>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center text-pink-700 dark:text-pink-300 font-bold">
            <Baby className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Newborn Master Registry
              </h3>
              <Badge variant="outline" className="text-xs">
                {newborns.length} {newborns.length === 1 ? 'Infant' : 'Infants (Multi-birth)'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Sequential birth orders, individual birth weight, Apgar scores, and independent
              discharge tracking.
            </p>
          </div>
        </div>

        {canRegister && (
          <Button size="sm" onClick={onOpenRegisterNewborn} className="gap-1.5 text-xs h-8">
            <Plus className="w-3.5 h-3.5" />
            Register Infant
          </Button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {newborns.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No newborn infant records have been registered under this delivery event yet.
          </div>
        ) : (
          newborns.map((baby) => {
            const isLive = baby.outcome === BirthOutcome.LIVE_BIRTH;
            const isInCare = baby.dischargeStatus === NewbornDischargeStatus.IN_CARE;

            return (
              <div
                key={baby.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 p-5 bg-slate-50/30 dark:bg-slate-800/20 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      #{baby.birthOrder}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {baby.provisionalName || `Baby #${baby.birthOrder}`}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          ({baby.newbornReferenceId})
                        </span>
                        {getOutcomeBadge(baby.outcome)}
                        {getDischargeBadge(baby.dischargeStatus)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Born at {new Date(baby.birthTimestamp).toLocaleString()} · Delivered by{' '}
                        {baby.deliveredByFullName || 'Clinician'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canRecordApgar && isLive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenRecordApgar(baby)}
                        className="gap-1.5 text-xs h-7"
                      >
                        <Award className="w-3 h-3 text-amber-600" />
                        Record Apgar
                      </Button>
                    )}
                    {canAssessPostpartum && isLive && isInCare && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenNewbornCare(baby)}
                        className="gap-1.5 text-xs h-7"
                      >
                        <Activity className="w-3 h-3 text-teal-600" />
                        Postpartum Care
                      </Button>
                    )}
                    {canAuthorizeDischarge && isLive && isInCare && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenDischargeNewborn(baby)}
                        className="gap-1.5 text-xs h-7 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Discharge Baby
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Sex</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                      {baby.sex}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Birth Weight</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {baby.birthWeightGrams} g ({(baby.birthWeightGrams / 1000).toFixed(2)} kg)
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Gestational Age</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {baby.gestationalAgeWeeks !== null
                        ? `${baby.gestationalAgeWeeks}w ${baby.gestationalAgeDays || 0}d`
                        : 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Discharge Status
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {baby.dischargeStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Apgar Section */}
                {isLive && (
                  <ApgarScoreCard
                    newbornId={baby.id}
                    assessments={baby.apgarAssessments || []}
                    canRecord={canRecordApgar}
                    onRecord={() => onOpenRecordApgar(baby)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
