import { api } from './api.js';
import {
  ShiftDto,
  ShiftWithStaffDto,
  ShiftStaffAssignmentDto,
  CreateShiftRequest,
  UpdateShiftRequest,
  AssignStaffToShiftRequest,
  CancelShiftStaffAssignmentRequest,
  OnDutyStaffSummaryDto,
  ShiftHandoverDto,
  CreateShiftHandoverRequest,
  AcknowledgeShiftHandoverRequest,
  ShiftStatus,
} from '@lrms/shared';

export const shiftsApi = {
  listShifts: async (
    wardId: string,
    filters?: { fromDate?: string; toDate?: string; status?: ShiftStatus },
  ): Promise<ShiftDto[]> => {
    const res = await api.get<{ success: boolean; data: ShiftDto[] }>(`/wards/${wardId}/shifts`, {
      params: filters,
    });
    return res.data.data;
  },

  getShift: async (wardId: string, shiftId: string): Promise<ShiftWithStaffDto> => {
    const res = await api.get<{ success: boolean; data: ShiftWithStaffDto }>(
      `/wards/${wardId}/shifts/${shiftId}`,
    );
    return res.data.data;
  },

  createShift: async (wardId: string, payload: CreateShiftRequest): Promise<ShiftDto> => {
    const res = await api.post<{ success: boolean; data: ShiftDto }>(
      `/wards/${wardId}/shifts`,
      payload,
    );
    return res.data.data;
  },

  updateShift: async (
    wardId: string,
    shiftId: string,
    payload: UpdateShiftRequest,
  ): Promise<ShiftDto> => {
    const res = await api.patch<{ success: boolean; data: ShiftDto }>(
      `/wards/${wardId}/shifts/${shiftId}`,
      payload,
    );
    return res.data.data;
  },

  assignStaffToShift: async (
    wardId: string,
    shiftId: string,
    payload: AssignStaffToShiftRequest,
  ): Promise<ShiftStaffAssignmentDto> => {
    const res = await api.post<{ success: boolean; data: ShiftStaffAssignmentDto }>(
      `/wards/${wardId}/shifts/${shiftId}/staff`,
      payload,
    );
    return res.data.data;
  },

  cancelStaffAssignment: async (
    wardId: string,
    shiftId: string,
    assignmentId: string,
    payload: CancelShiftStaffAssignmentRequest,
  ): Promise<ShiftStaffAssignmentDto> => {
    const res = await api.delete<{ success: boolean; data: ShiftStaffAssignmentDto }>(
      `/wards/${wardId}/shifts/${shiftId}/staff/${assignmentId}`,
      { data: payload },
    );
    return res.data.data;
  },

  getOnDutyRoster: async (wardId: string): Promise<OnDutyStaffSummaryDto[]> => {
    const res = await api.get<{ success: boolean; data: OnDutyStaffSummaryDto[] }>(
      `/wards/${wardId}/on-duty`,
    );
    return res.data.data;
  },

  listHandovers: async (wardId: string, shiftId: string): Promise<ShiftHandoverDto[]> => {
    const res = await api.get<{ success: boolean; data: ShiftHandoverDto[] }>(
      `/wards/${wardId}/shifts/${shiftId}/handovers`,
    );
    return res.data.data;
  },

  createHandover: async (
    wardId: string,
    shiftId: string,
    payload: CreateShiftHandoverRequest,
  ): Promise<ShiftHandoverDto> => {
    const res = await api.post<{ success: boolean; data: ShiftHandoverDto }>(
      `/wards/${wardId}/shifts/${shiftId}/handovers`,
      payload,
    );
    return res.data.data;
  },

  acknowledgeHandover: async (
    wardId: string,
    shiftId: string,
    handoverId: string,
    payload: AcknowledgeShiftHandoverRequest = {},
  ): Promise<ShiftHandoverDto> => {
    const res = await api.patch<{ success: boolean; data: ShiftHandoverDto }>(
      `/wards/${wardId}/shifts/${shiftId}/handovers/${handoverId}/acknowledge`,
      payload,
    );
    return res.data.data;
  },
};
