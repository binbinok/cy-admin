import http from './http';
import {
  CF_GET_SERVICE_LIST,
  CF_GET_SERVICE_CATEGORIES,
  CF_CREATE_SERVICE,
  CF_UPDATE_SERVICE,
  CF_TOGGLE_SERVICE_STATUS,
} from '@/constants/api';
import type { Service, ServiceCategory } from '@/types/service';
import type { ApiResponse, PageResult } from '@/types/common';

export async function adminGetServiceList(
  params: {
    page: number;
    pageSize: number;
    category?: string;
    keyword?: string;
  },
): Promise<ApiResponse<PageResult<Service>>> {
  const response = await http.post<ApiResponse<PageResult<Service>>>(
    `/invoke/${CF_GET_SERVICE_LIST}`,
    params,
  );
  return response.data;
}
export async function adminGetServiceCategories(): Promise<ApiResponse<ServiceCategory[]>> {
  const response = await http.post<ApiResponse<ServiceCategory[]>>(
    `/invoke/${CF_GET_SERVICE_CATEGORIES}`,
    {},
  );
  return response.data;
}

export async function adminCreateService(
  data: {
    name: string;
    category: string;
    price: number;
    duration: number;
    description?: string;
  },
): Promise<ApiResponse<Service>> {
  const response = await http.post<ApiResponse<Service>>(
    `/invoke/${CF_CREATE_SERVICE}`,
    data,
  );
  return response.data;
}

export async function adminUpdateService(
  serviceId: string,
  data: Partial<Service>,
): Promise<ApiResponse<Service>> {
  const response = await http.post<ApiResponse<Service>>(
    `/invoke/${CF_UPDATE_SERVICE}`,
    { serviceId, ...data },
  );
  return response.data;
}

export async function adminToggleServiceStatus(
  serviceId: string,
  active: boolean,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_TOGGLE_SERVICE_STATUS}`,
    { serviceId, active },
  );
  return response.data;
}
