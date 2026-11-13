import { api } from './api.js';
import {
  PatientStaffAssignmentDto,
  AdmissionStaffResponsibilityDto,
  UnassignedAdmissionSummaryDto,
  AssignPatientStaffRequest,
  TransferPatientStaffRequest,
  EndPatientStaffAssignmentRequest,
} from '@lrms/shared';

export const staffAssignmentsApi = {
  getAdmissionStaffResponsibility: async (
    admissionId: string,
  ): Promise<AdmissionStaffResponsibilityDto> => {
    const res = await api.get<{ success: boolean; data: AdmissionStaffResponsibilityDto }>(
      `/admissions/${admissionId}/staff`,
    );
    return res.data.data;
  },

  assignPatientStaff: async (
    admissionId: string,
    payload: AssignPatientStaffRequest,
  ): Promise<PatientStaffAssignmentDto> => {
    const res = await api.post<{ success: boolean; data: PatientStaffAssignmentDto }>(
      `/admissions/${admissionId}/staff`,
      payload,
    );
    return res.data.data;
  },

  transferPatientStaff: async (
    admissionId: string,
    payload: TransferPatientStaffRequest,
  ): Promise<PatientStaffAssignmentDto> => {
    const res = await api.post<{ success: boolean; data: PatientStaffAssignmentDto }>(
      `/admissions/${admissionId}/staff/transfer`,
      payload,
    );
    return res.data.data;
  },

  endPatientStaffAssignment: async (
    admissionId: string,
    assignmentId: string,
    payload: EndPatientStaffAssignmentRequest,
  ): Promise<PatientStaffAssignmentDto> => {
    const res = await api.delete<{ success: boolean; data: PatientStaffAssignmentDto }>(
      `/admissions/${admissionId}/staff/${assignmentId}`,
      { data: payload },
    );
    return res.data.data;
  },

  listUnassignedAdmissions: async (wardId?: string): Promise<UnassignedAdmissionSummaryDto[]> => {
    const res = await api.get<{ success: boolean; data: UnassignedAdmissionSummaryDto[] }>(
      '/admissions/unassigned',
      { params: { wardId } },
    );
    return res.data.data;
  },
};
