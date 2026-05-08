import http from './http';
import { CF_GET_OPERATION_LOGS } from '@/constants/api';
import type { ApiResponse, OperationLog, PageResult } from '@/types/common';

export interface OperationLogQuery {
  page: number;
  pageSize: number;
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export async function adminGetOperationLogs(
  params: OperationLogQuery,
): Promise<ApiResponse<PageResult<OperationLog>>> {
  const response = await http.post<ApiResponse<PageResult<OperationLog>>>(
    `/invoke/${CF_GET_OPERATION_LOGS}`,
    { ...params },
  );
  return response.data;
}
