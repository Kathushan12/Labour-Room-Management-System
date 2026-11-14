import React, { useState } from 'react';
import {
  ClinicalEscalationDto,
  EscalationCategory,
  EscalationPriority,
  EscalationStatus,
} from '@lrms/shared';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Plus,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { Button } from '../../../components/ui/button.js';
import { Badge } from '../../../components/ui/badge.js';
import { EscalationDetailModal } from './EscalationDetailModal.js';
import { EscalationCreateDialog } from './EscalationCreateDialog.js';
import { clinicalCareApi } from '../../../services/clinical-care.api.js';

interface ClinicalEscalationPanelProps {
  admissionId: string;
  escalations: ClinicalEscalationDto[];
  onRefresh: () => void;
}

export const ClinicalEscalationPanel: React.FC<ClinicalEscalationPanelProps> = ({
  admissionId,
  escalations,
  onRefresh,
}) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState<ClinicalEscalationDto | null>(null);
  const [ackingId, setAckingId] = useState<string | null>(null);

  const handleQuickAck = async (escId: string) => {
    setAckingId(escId);
    try {
      await clinicalCareApi.acknowledgeEscalation(admissionId, escId, {
        notes: 'Quick acknowledged from bedside panel',
      });
      onRefresh();
    } catch {
      // Handled via refresh or modal
    } finally {
      setAckingId(null);
    }
  };

  const getPriorityBadge = (p: EscalationPriority) => {
    switch (p) {
      case EscalationPriority.EMERGENCY:
        return <Badge className="bg-red-600 hover:bg-red-700 text-white">EMERGENCY</Badge>;
      case EscalationPriority.URGENT:
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white">URGENT</Badge>;
      default:
        return <Badge variant="outline">ROUTINE</Badge>;
    }
  };

  const getStatusBadge = (s: EscalationStatus) => {
    switch (s) {
      case EscalationStatus.OPEN:
        return <Badge variant="destructive">OPEN</Badge>;
      case EscalationStatus.ACKNOWLEDGED:
        return <Badge className="bg-amber-600 text-white">ACKNOWLEDGED</Badge>;
      case EscalationStatus.UNDER_REVIEW:
        return <Badge className="bg-blue-600 text-white">UNDER REVIEW</Badge>;
      case EscalationStatus.ACTION_IN_PROGRESS:
        return <Badge className="bg-indigo-600 text-white">ACTION IN PROGRESS</Badge>;
      case EscalationStatus.RESOLVED:
        return <Badge className="bg-emerald-600 text-white">RESOLVED</Badge>;
      case EscalationStatus.CLOSED:
        return <Badge variant="secondary">CLOSED</Badge>;
      case EscalationStatus.CANCELLED:
        return <Badge variant="outline">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <div className="bg-card border rounded-lg p-5 shadow-sm space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Clinical Escalations ({escalations.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Structured deterioration alerts, observation linkages, and clinical response tracking.
          </p>
        </div>

        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => setCreateOpen(true)}
          data-testid="btn-open-escalation-dialog"
        >
          <Plus className="h-4 w-4 mr-1" />
          Trigger Escalation
        </Button>
      </div>

      {escalations.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-md bg-muted/20">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-medium">No Clinical Escalations Active</p>
          <p className="text-xs text-muted-foreground mt-1">
            Maternal and fetal parameters are within accepted clinical limits.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {escalations.map((esc) => {
            const isOpen = esc.status === EscalationStatus.OPEN;

            return (
              <div
                key={esc.id}
                data-testid={`escalation-row-${esc.id}`}
                className={`p-3.5 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isOpen ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : 'bg-card'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {esc.escalationReferenceId}
                    </span>
                    {getPriorityBadge(esc.priority)}
                    {getStatusBadge(esc.status)}
                    <Badge variant="outline" className="text-[11px]">
                      {esc.category.replace(/_/g, ' ')}
                    </Badge>
                    {esc.sourceObservationId && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] text-blue-800 dark:text-blue-300"
                      >
                        Obs Linked
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs font-medium text-foreground pt-0.5">{esc.clinicalReason}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span>Initiated by: {esc.initiatedByUser?.fullName}</span>
                    <span>
                      Assignee:{' '}
                      <strong>{esc.assignedRecipientUser?.fullName || 'On-call Doctor'}</strong>
                    </span>
                    <span>
                      {new Date(esc.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isOpen && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600 text-amber-700 hover:bg-amber-50 h-8 text-xs"
                      onClick={() => handleQuickAck(esc.id)}
                      disabled={ackingId === esc.id}
                      data-testid="btn-quick-ack"
                    >
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      {ackingId === esc.id ? 'Acking...' : 'Acknowledge'}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setSelectedEscalation(esc)}
                    data-testid="btn-view-escalation-detail"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Details & Timeline
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <EscalationCreateDialog
          admissionId={admissionId}
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={onRefresh}
        />
      )}

      {selectedEscalation && (
        <EscalationDetailModal
          admissionId={admissionId}
          escalation={selectedEscalation}
          isOpen={!!selectedEscalation}
          onClose={() => setSelectedEscalation(null)}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
};
