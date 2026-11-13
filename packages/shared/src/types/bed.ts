import {
  BedFunctioningStatus,
  BedOccupancyStatus,
  BedCleaningStatus,
  BedDisplayStatus,
  AdmissionCategory,
  CarePlanState,
} from '../enums/index.js';

export interface BedActiveAllocationDto {
  id: string;
  admissionId: string;
  admissionReferenceId: string;
  patientId: string | null;
  patientDisplayName: string;
  admissionCategory: AdmissionCategory;
  currentCarePlan: CarePlanState;
  admittedAt: string;
  allocatedAt: string;
  assignedByUserId: string;
  assignedByUserName: string;
  riskFlags: string[];
}

export interface BedCleaningRecordDto {
  id: string;
  bedId: string;
  startedByUserId: string;
  startedByUserName: string;
  startedAt: string;
  completedByUserId: string | null;
  completedByUserName: string | null;
  completedAt: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BedDto {
  id: string;
  wardId: string;
  wardCode?: string;
  wardName?: string;
  bedNumber: string;
  functioningStatus: BedFunctioningStatus;
  occupancyStatus: BedOccupancyStatus;
  cleaningStatus: BedCleaningStatus;
  displayStatus: BedDisplayStatus;
  currentAllocation: BedActiveAllocationDto | null;
  lastCleaning: BedCleaningRecordDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface BedAllocationHistoryDto {
  id: string;
  bedId: string;
  bedNumber: string;
  admissionId: string;
  admissionReferenceId: string;
  assignedByUserId: string;
  assignedByUserName: string;
  assignedAt: string;
  releasedByUserId: string | null;
  releasedByUserName: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
  createdAt: string;
}

export interface BedBoardSummaryDto {
  wardId: string;
  wardName: string;
  wardCode: string;
  totalPhysicalBeds: number;
  registeredBedsCount: number;
  functioningBedsCount: number;
  availableBedsCount: number;
  occupiedBedsCount: number;
  cleaningBedsCount: number;
  outOfServiceBedsCount: number;
  beds: BedDto[];
}

export interface CreateBedRequest {
  bedNumber: string;
}

export interface UpdateBedMaintenanceRequest {
  functioningStatus: BedFunctioningStatus;
  reason?: string;
}

export interface AllocateBedRequest {
  admissionId: string;
  notes?: string;
}

export interface TransferBedRequest {
  targetBedId: string;
  reason?: string;
}

export interface ReleaseBedRequest {
  reason?: string;
}

export interface StartBedCleaningRequest {
  notes?: string;
}

export interface CompleteBedCleaningRequest {
  notes?: string;
}
