import http from './http';
import {
  CF_ADMIN_LOGIN,
  CF_ADMIN_LOGOUT,
  CF_ADMIN_CHANGE_PASSWORD,
  CF_GET_ADMIN_LIST,
  CF_CREATE_ADMIN,
  CF_UPDATE_ADMIN_STATUS,
  CF_GET_LOGIN_LOGS,
} from '@/constants/api';
import type { AdminAccount, LoginResponse, LoginLog } from '@/types/auth';
import type { ApiResponse, PageResult } from '@/types/common';

export async function adminLogin(
  username: string,
  password: string,
): Promise<ApiResponse<LoginResponse>> {
  const response = await http.post<ApiResponse<LoginResponse>>(
    `/invoke/${CF_ADMIN_LOGIN}`,
    { username, password },
  );
  return response.data;
}

export async function adminLogout(): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_ADMIN_LOGOUT}`,
  );
  return response.data;
}

export async function adminChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_ADMIN_CHANGE_PASSWORD}`,
    { currentPassword, newPassword },
  );
  return response.data;
}

export async function getAdminList(
  params: { page: number; pageSize: number },
): Promise<ApiResponse<PageResult<AdminAccount>>> {
  const response = await http.post<ApiResponse<PageResult<AdminAccount>>>(
    `/invoke/${CF_GET_ADMIN_LIST}`,
    params,
  );
  return response.data;
}

export async function createAdmin(
  data: { username: string; password: string; role: string },
): Promise<ApiResponse<{ adminInfo: AdminAccount }>> {
  const response = await http.post<ApiResponse<{ adminInfo: AdminAccount }>>(
    `/invoke/${CF_CREATE_ADMIN}`,
    data,
  );
  return response.data;
}

export async function updateAdminStatus(
  adminId: string,
  status: 'active' | 'disabled',
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_UPDATE_ADMIN_STATUS}`,
    { adminId, status },
  );
  return response.data;
}

export async function getLoginLogs(
  params: { page: number; pageSize: number },
): Promise<ApiResponse<PageResult<LoginLog>>> {
  const response = await http.post<ApiResponse<PageResult<LoginLog>>>(
    `/invoke/${CF_GET_LOGIN_LOGS}`,
    params,
  );
  return response.data;
}
