import http from './http';
import {
  CF_GET_TECHNICIAN_LIST,
  CF_CREATE_TECHNICIAN,
  CF_UPDATE_TECHNICIAN,
  CF_UPDATE_TECHNICIAN_STATUS,
  CF_DELETE_TECHNICIAN,
  CF_SET_TECHNICIAN_SCHEDULE,
  CF_SET_TECHNICIAN_SERVICE_SLOTS,
} from '@/constants/api';
import type { Technician } from '@/types/technician';
import type { ApiResponse, PageResult } from '@/types/common';

export async function adminGetTechnicianDetail(
  technicianId: string,
): Promise<ApiResponse<Technician>> {
  const response = await http.post<ApiResponse<Technician>>(
    `/invoke/${CF_GET_TECHNICIAN_LIST}`,
    { technicianId, action: 'detail' },
  );
  return response.data;
}

export async function adminGetTechnicianList(
  params: { page: number; pageSize: number },
): Promise<ApiResponse<PageResult<Technician>>> {
  const response = await http.post<ApiResponse<PageResult<Technician>>>(
    `/invoke/${CF_GET_TECHNICIAN_LIST}`,
    params,
  );
  return response.data;
}

export async function adminCreateTechnician(
  data: { name: string; specialties: string[]; avatarUrl?: string },
): Promise<ApiResponse<Technician>> {
  const response = await http.post<ApiResponse<Technician>>(
    `/invoke/${CF_CREATE_TECHNICIAN}`,
    data,
  );
  return response.data;
}

export async function adminUpdateTechnician(
  technicianId: string,
  data: Partial<Technician>,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_UPDATE_TECHNICIAN}`,
    { technicianId, data },
  );
  return response.data;
}

export async function adminUpdateTechnicianStatus(
  technicianId: string,
  status: string,
): Promise<ApiResponse<{ pendingAppointments?: number }>> {
  const response = await http.post<ApiResponse<{ pendingAppointments?: number }>>(
    `/invoke/${CF_UPDATE_TECHNICIAN_STATUS}`,
    { technicianId, status },
  );
  return response.data;
}

export async function adminDeleteTechnician(
  technicianId: string,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_DELETE_TECHNICIAN}`,
    { technicianId },
  );
  return response.data;
}

export async function adminSetTechnicianSchedule(
  technicianId: string,
  schedule: Record<string, { startTime: string; endTime: string }[]>,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_SET_TECHNICIAN_SCHEDULE}`,
    { technicianId, schedule },
  );
  return response.data;
}

export async function adminSetTechnicianServiceSlots(
  technicianId: string,
  slots: { dayOfWeek: number; startTime: string; endTime: string; serviceIds: string[] }[],
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_SET_TECHNICIAN_SERVICE_SLOTS}`,
    { technicianId, slots },
  );
  return response.data;
}
