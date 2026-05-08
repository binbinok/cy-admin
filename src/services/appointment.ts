import http from './http';
import {
  CF_GET_APPOINTMENT_LIST,
  CF_CONFIRM_ARRIVAL,
  CF_COMPLETE_SERVICE,
  CF_CANCEL_APPOINTMENT,
} from '@/constants/api';
import type { Appointment } from '@/types/appointment';
import type { ApiResponse, PageResult } from '@/types/common';

export async function adminGetAppointmentList(
  params: {
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
    technicianId?: string;
    status?: string;
    keyword?: string;
  },
): Promise<ApiResponse<PageResult<Appointment>>> {
  const response = await http.post<ApiResponse<PageResult<Appointment>>>(
    `/invoke/${CF_GET_APPOINTMENT_LIST}`,
    params,
  );
  return response.data;
}

export async function adminConfirmArrival(
  appointmentId: string,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_CONFIRM_ARRIVAL}`,
    { appointmentId },
  );
  return response.data;
}

export async function adminCompleteService(
  appointmentId: string,
  actualAmount: number,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_COMPLETE_SERVICE}`,
    { appointmentId, actualAmount },
  );
  return response.data;
}

export async function adminCancelAppointment(
  appointmentId: string,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_CANCEL_APPOINTMENT}`,
    { appointmentId },
  );
  return response.data;
}
