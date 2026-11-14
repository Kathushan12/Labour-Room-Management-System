import React from 'react';
import { EmergencyResponseDto, EmergencyResponseStatus } from '@lrms/shared';
import { AlertTriangle, CheckCircle2, Siren, Users } from 'lucide-react';
import { Button } from '../../../components/ui/button.js';
import { Badge } from '../../../components/ui/badge.js';

interface EmergencyResponseBannerProps {
  responses: EmergencyResponseDto[];
  onAcknowledge: (responseId: string) => void;
  onMobilize: (responseId: string) => void;
  onResolve: (responseId: string) => void;
}

export const EmergencyResponseBanner: React.FC<EmergencyResponseBannerProps> = ({
  responses,
  onAcknowledge,
  onMobilize,
  onResolve,
}) => {
  const activeEmergencies = responses.filter(
    (r) =>
      r.status !== EmergencyResponseStatus.RESOLVED &&
      r.status !== EmergencyResponseStatus.CANCELLED,
  );

  if (activeEmergencies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6" data-testid="emergency-response-banners">
      {activeEmergencies.map((emergency) => {
        const isInitiated = emergency.status === EmergencyResponseStatus.INITIATED;
        const isAcknowledged = emergency.status === EmergencyResponseStatus.ACKNOWLEDGED;
        const isInProgress = emergency.status === EmergencyResponseStatus.IN_PROGRESS;

        return (
          <div
            key={emergency.id}
            data-testid={`emergency-banner-${emergency.id}`}
            className="border-2 border-red-500 bg-red-50 dark:bg-red-950/40 dark:border-red-600 rounded-lg p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse-slow"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-600 text-white rounded-full flex-shrink-0">
                <Siren className="h-6 w-6 animate-spin-slow" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive" className="font-semibold tracking-wide uppercase">
                    {emergency.category.replace(/_/g, ' ')}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-red-600 text-red-700 dark:text-red-300"
                  >
                    Ref: {emergency.responseReferenceId}
                  </Badge>
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white">
                    Status: {emergency.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="mt-1 font-medium text-red-900 dark:text-red-200">
                  {emergency.clinicalReason}
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-red-700 dark:text-red-300">
                  <span>Triggered by: {emergency.initiatedByUser?.fullName || 'Clinician'}</span>
                  {emergency.assignedTeam && (
                    <span className="flex items-center gap-1 font-semibold">
                      <Users className="h-3.5 w-3.5" /> Team: {emergency.assignedTeam}
                    </span>
                  )}
                  {emergency.actionNotes && <span>Actions: {emergency.actionNotes}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 self-end md:self-center">
              {isInitiated && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onAcknowledge(emergency.id)}
                  data-testid="btn-ack-emergency"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Acknowledge
                </Button>
              )}
              {isAcknowledged && (
                <Button
                  size="sm"
                  className="bg-amber-700 hover:bg-amber-800 text-white"
                  onClick={() => onMobilize(emergency.id)}
                  data-testid="btn-mobilize-emergency"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Mark In Progress
                </Button>
              )}
              {(isAcknowledged || isInProgress) && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onResolve(emergency.id)}
                  data-testid="btn-resolve-emergency"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Resolve Emergency
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
