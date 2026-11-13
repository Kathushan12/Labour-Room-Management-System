import { api } from './api.js';
import {
  StaffWardAssignmentDto,
  AssignStaffToWardRequest,
  EndStaffWardAssignmentRequest,
} from '@lrms/shared';

export const wardStaffApi = {
  listWardStaff: async (wardId: string, activeOnly = false): Promise<StaffWardAssignmentDto[]> => {
    const res = await api.get<{ success: boolean; data: StaffWardAssignmentDto[] }>(
      `/wards/${wardId}/staff`,
      { params: { activeOnly } },
    );
    return res.data.data;
  },

  assignStaffToWard: async (
    wardId: string,
    payload: AssignStaffToWardRequest,
  ): Promise<StaffWardAssignmentDto> => {
    const res = await api.post<{ success: boolean; data: StaffWardAssignmentDto }>(
      `/wards/${wardId}/staff`,
      payload,
    );
    return res.data.data;
  },

  endStaffWardAssignment: async (
    wardId: string,
    assignmentId: string,
    payload: EndStaffWardAssignmentRequest = {},
  ): Promise<StaffWardAssignmentDto> => {
    const res = await api.delete<{ success: boolean; data: StaffWardAssignmentDto }>(
      `/wards/${wardId}/staff/${assignmentId}`,
      { data: payload },
    );
    return res.data.data;
  },
};
