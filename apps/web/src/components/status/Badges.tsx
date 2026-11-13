import React from 'react';
import { Badge } from '../ui/badge.js';
import {
  UserRole,
  AdmissionCategory,
  BedFunctioningStatus,
  BedOccupancyStatus,
  BedDisplayStatus,
  AlertReceiptState,
  AlertSeverity,
  ShiftStatus,
  ShiftType,
  StaffOnDutyStatus,
} from '@lrms/shared';
import {
  ShieldAlert,
  UserCheck,
  Stethoscope,
  HeartPulse,
  BedDouble,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const RoleBadge: React.FC<{ role: UserRole | string; className?: string }> = ({
  role,
  className,
}) => {
  switch (role) {
    case UserRole.ADMIN:
      return (
        <Badge
          variant="outline"
          className={`bg-slate-100 text-slate-800 border-slate-300 font-semibold ${className || ''}`}
        >
          <ShieldAlert className="w-3 h-3 mr-1 text-slate-700" />
          Administrator
        </Badge>
      );
    case UserRole.DOCTOR:
      return (
        <Badge
          variant="outline"
          className={`bg-teal-50 text-teal-800 border-teal-200 font-semibold ${className || ''}`}
        >
          <Stethoscope className="w-3 h-3 mr-1 text-teal-700" />
          Doctor (Obstetrician)
        </Badge>
      );
    case UserRole.NURSE_STAFF:
    default:
      return (
        <Badge
          variant="outline"
          className={`bg-blue-50 text-blue-800 border-blue-200 font-semibold ${className || ''}`}
        >
          <HeartPulse className="w-3 h-3 mr-1 text-blue-700" />
          Nurse / Midwife
        </Badge>
      );
  }
};

export const AdmissionCategoryBadge: React.FC<{
  category: AdmissionCategory | string;
  className?: string;
}> = ({ category, className }) => {
  switch (category) {
    case AdmissionCategory.NORMAL_DELIVERY:
      return (
        <Badge variant="success" className={className}>
          Normal Delivery
        </Badge>
      );
    case AdmissionCategory.SCHEDULED_CESAREAN:
      return (
        <Badge variant="secondary" className={className}>
          Scheduled Cesarean
        </Badge>
      );
    case AdmissionCategory.OBSERVATION_20_PLUS_WEEKS:
      return (
        <Badge variant="warning" className={className}>
          Observation (&ge;20 Wks)
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          {category}
        </Badge>
      );
  }
};

export interface BedStatusBadgeProps {
  functioningStatus?: BedFunctioningStatus | string;
  functioning?: BedFunctioningStatus | string;
  occupancyStatus?: BedOccupancyStatus | string;
  occupancy?: BedOccupancyStatus | string;
  displayStatus?: BedDisplayStatus | string;
  className?: string;
}

export const BedStatusBadge: React.FC<BedStatusBadgeProps> = ({
  functioningStatus,
  functioning,
  occupancyStatus,
  occupancy,
  displayStatus,
  className,
}) => {
  const fStatus = functioningStatus || functioning;
  const oStatus = occupancyStatus || occupancy;

  if (
    displayStatus === BedDisplayStatus.OUT_OF_SERVICE ||
    fStatus === BedFunctioningStatus.OUT_OF_SERVICE
  ) {
    return (
      <Badge variant="destructive" className={className}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        Out of Service
      </Badge>
    );
  }

  if (displayStatus === BedDisplayStatus.OCCUPIED || oStatus === BedOccupancyStatus.OCCUPIED) {
    return (
      <Badge variant="default" className={`bg-slate-800 text-white ${className || ''}`}>
        <BedDouble className="w-3 h-3 mr-1 text-slate-300" />
        Occupied
      </Badge>
    );
  }

  if (displayStatus === BedDisplayStatus.CLEANING || oStatus === BedOccupancyStatus.CLEANING) {
    return (
      <Badge variant="warning" className={className}>
        <Sparkles className="w-3 h-3 mr-1" />
        Cleaning / Turnover
      </Badge>
    );
  }

  return (
    <Badge variant="success" className={className}>
      <CheckCircle className="w-3 h-3 mr-1" />
      Available
    </Badge>
  );
};

export const AlertReceiptBadge: React.FC<{
  state: AlertReceiptState | string;
  className?: string;
}> = ({ state, className }) => {
  switch (state) {
    case AlertReceiptState.DISPATCHED:
      return (
        <Badge variant="muted" className={className}>
          <Clock className="w-3 h-3 mr-1 text-slate-500" />
          Dispatched
        </Badge>
      );
    case AlertReceiptState.DELIVERED:
      return (
        <Badge variant="warning" className={className}>
          <Clock className="w-3 h-3 mr-1 text-amber-600" />
          Delivered (Pending Ack)
        </Badge>
      );
    case AlertReceiptState.ACKNOWLEDGED:
      return (
        <Badge variant="success" className={className}>
          <UserCheck className="w-3 h-3 mr-1 text-emerald-600" />
          Acknowledged
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          {state}
        </Badge>
      );
  }
};

export const AlertSeverityBadge: React.FC<{
  severity: AlertSeverity | string;
  className?: string;
}> = ({ severity, className }) => {
  switch (severity) {
    case AlertSeverity.EMERGENCY:
      return (
        <Badge variant="emergency" className={className}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          EMERGENCY
        </Badge>
      );
    case AlertSeverity.URGENT:
      return (
        <Badge variant="warning" className={className}>
          Urgent
        </Badge>
      );
    case AlertSeverity.ROUTINE:
    default:
      return (
        <Badge variant="muted" className={className}>
          Routine
        </Badge>
      );
  }
};

export const ShiftStatusBadge: React.FC<{
  status: ShiftStatus | string;
  className?: string;
}> = ({ status, className }) => {
  switch (status) {
    case ShiftStatus.IN_PROGRESS:
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold ${className || ''}`}
        >
          <span className="w-1.5 h-1.5 mr-1 rounded-full bg-emerald-500 animate-pulse" />
          Active / In-Progress
        </Badge>
      );
    case ShiftStatus.SCHEDULED:
      return (
        <Badge
          variant="outline"
          className={`bg-blue-50 text-blue-800 border-blue-200 font-medium ${className || ''}`}
        >
          <Clock className="w-3 h-3 mr-1 text-blue-600" />
          Scheduled
        </Badge>
      );
    case ShiftStatus.COMPLETED:
      return (
        <Badge
          variant="outline"
          className={`bg-slate-100 text-slate-700 border-slate-300 font-medium ${className || ''}`}
        >
          <CheckCircle className="w-3 h-3 mr-1 text-slate-500" />
          Completed
        </Badge>
      );
    case ShiftStatus.CANCELLED:
    default:
      return (
        <Badge
          variant="outline"
          className={`bg-red-50 text-red-700 border-red-200 font-medium ${className || ''}`}
        >
          Cancelled
        </Badge>
      );
  }
};

export const ShiftTypeBadge: React.FC<{
  type: ShiftType | string;
  className?: string;
}> = ({ type, className }) => {
  switch (type) {
    case ShiftType.MORNING:
      return (
        <Badge
          variant="outline"
          className={`bg-amber-50 text-amber-900 border-amber-300 font-medium ${className || ''}`}
        >
          Morning Shift
        </Badge>
      );
    case ShiftType.EVENING:
      return (
        <Badge
          variant="outline"
          className={`bg-indigo-50 text-indigo-900 border-indigo-300 font-medium ${className || ''}`}
        >
          Evening Shift
        </Badge>
      );
    case ShiftType.NIGHT:
      return (
        <Badge
          variant="outline"
          className={`bg-purple-50 text-purple-900 border-purple-300 font-medium ${className || ''}`}
        >
          Night Shift
        </Badge>
      );
    case ShiftType.CUSTOM:
    default:
      return (
        <Badge
          variant="outline"
          className={`bg-slate-50 text-slate-800 border-slate-300 font-medium ${className || ''}`}
        >
          Custom Shift
        </Badge>
      );
  }
};

export const OnDutyStatusBadge: React.FC<{
  status: StaffOnDutyStatus | string;
  className?: string;
}> = ({ status, className }) => {
  switch (status) {
    case StaffOnDutyStatus.ON_DUTY:
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-100 text-emerald-900 border-emerald-300 font-bold ${className || ''}`}
        >
          <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ON DUTY
        </Badge>
      );
    case StaffOnDutyStatus.SCHEDULED:
      return (
        <Badge
          variant="outline"
          className={`bg-sky-50 text-sky-800 border-sky-300 font-medium ${className || ''}`}
        >
          <Clock className="w-3 h-3 mr-1 text-sky-600" />
          Scheduled
        </Badge>
      );
    case StaffOnDutyStatus.OFF_DUTY:
    case StaffOnDutyStatus.SHIFT_COMPLETED:
    case StaffOnDutyStatus.SHIFT_CANCELLED:
    default:
      return (
        <Badge
          variant="outline"
          className={`bg-slate-100 text-slate-600 border-slate-300 font-medium ${className || ''}`}
        >
          Off Duty
        </Badge>
      );
  }
};
