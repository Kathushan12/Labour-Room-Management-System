export interface WardDto {
  id: string;
  name: string;
  code: string;
  totalPhysicalBeds: number;
  isActive: boolean;
  alertTimeoutSeconds: number;
  registeredBedsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWardRequest {
  name: string;
  code: string;
  totalPhysicalBeds: number;
}

export interface UpdateWardRequest {
  name?: string;
  totalPhysicalBeds?: number;
  isActive?: boolean;
  alertTimeoutSeconds?: number;
}

export interface WardSummaryDto {
  id: string;
  name: string;
  code: string;
  totalPhysicalBeds: number;
  isActive: boolean;
  registeredBedsCount: number;
  functioningBedsCount: number;
  availableBedsCount: number;
  occupiedBedsCount: number;
  cleaningBedsCount: number;
  outOfServiceBedsCount: number;
}
