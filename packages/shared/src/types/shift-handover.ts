import { HandoverStatus, UserRole } from '../enums/index.js';

export interface ShiftHandoverDto {
  id: string;
  shiftId: string;
  outgoingUserId: string;
  incomingUserId: string;
  handoverNotes: string;
  status: HandoverStatus;
  acknowledgedAt: string | null;
  acknowledgementNotes: string | null;
  createdAt: string;
  updatedAt: string;
  outgoingUser?: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
  incomingUser?: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  };
}

export interface CreateShiftHandoverRequest {
  shiftId: string;
  incomingUserId: string;
  handoverNotes: string;
}

export interface AcknowledgeShiftHandoverRequest {
  acknowledgementNotes?: string;
}
