import http from './http';
import {
  CF_GET_SERVICE_LIST,
  CF_GET_SERVICE_CATEGORIES,
  CF_GET_SERVICE_TEMPLATES,
  CF_CREATE_SERVICE_TEMPLATE,
  CF_UPDATE_SERVICE_TEMPLATE,
  CF_TOGGLE_SERVICE_TEMPLATE_STATUS,
} from '@/constants/api';
import type { Service, ServiceCategory, ServiceTemplate, TemplateItem } from '@/types/service';
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

export interface TemplateItemPayload {
  itemId?: string;
  name: string;
  inputType: TemplateItem['inputType'];
  options?: string[];
  defaultPrice: number;
  defaultDuration: number;
  discountable: boolean;
  commissionable: boolean;
  enabled: boolean;
}

export async function adminGetServiceTemplates(
  params: { activeOnly?: boolean } = {},
): Promise<ApiResponse<ServiceTemplate[]>> {
  const response = await http.post<ApiResponse<ServiceTemplate[]>>(
    `/invoke/${CF_GET_SERVICE_TEMPLATES}`,
    params,
  );
  return response.data;
}

export async function adminCreateServiceTemplate(
  data: {
    categoryId: string;
    defaultDuration: number;
    baseItems: TemplateItemPayload[];
    addonItems?: TemplateItemPayload[];
    sort?: number;
  },
): Promise<ApiResponse<{ templateId: string; message: string }>> {
  const response = await http.post<ApiResponse<{ templateId: string; message: string }>>(
    `/invoke/${CF_CREATE_SERVICE_TEMPLATE}`,
    data,
  );
  return response.data;
}

export async function adminUpdateServiceTemplate(
  templateId: string,
  data: {
    defaultDuration?: number;
    baseItems?: TemplateItemPayload[];
    addonItems?: TemplateItemPayload[];
    sort?: number;
  },
): Promise<ApiResponse<{ templateId: string; message: string }>> {
  const response = await http.post<ApiResponse<{ templateId: string; message: string }>>(
    `/invoke/${CF_UPDATE_SERVICE_TEMPLATE}`,
    { templateId, ...data },
  );
  return response.data;
}

export async function adminToggleServiceTemplateStatus(
  templateId: string,
  active: boolean,
): Promise<ApiResponse<{ templateId: string; active: boolean; message: string }>> {
  const response = await http.post<ApiResponse<{ templateId: string; active: boolean; message: string }>>(
    `/invoke/${CF_TOGGLE_SERVICE_TEMPLATE_STATUS}`,
    { templateId, active },
  );
  return response.data;
}
