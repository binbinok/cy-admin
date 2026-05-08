import http from './http';
import {
  CF_GET_FINANCE_SUMMARY,
  CF_GET_REVENUE_TREND,
  CF_GET_SERVICE_REVENUE,
  CF_GET_CONSUMPTION_LIST,
  CF_GET_TECHNICIAN_PERFORMANCE,
  CF_CREATE_INCOME_RECORD,
} from '@/constants/api';
import type {
  FinanceSummary,
  RevenueTrend,
  TechnicianPerformance,
  CreateIncomeRecordPayload,
  CreateIncomeRecordResult,
} from '@/types/finance';
import type { ConsumptionRecord } from '@/types/member';
import type { ApiResponse, PageResult } from '@/types/common';

export async function adminGetFinanceSummary(
  params: { period: 'today' | 'week' | 'month' },
): Promise<ApiResponse<FinanceSummary>> {
  const response = await http.post<ApiResponse<FinanceSummary>>(
    `/invoke/${CF_GET_FINANCE_SUMMARY}`,
    params,
  );
  return response.data;
}

export async function adminGetRevenueTrend(
  params: { startDate: string; endDate: string },
): Promise<ApiResponse<RevenueTrend[]>> {
  const response = await http.post<ApiResponse<RevenueTrend[]>>(
    `/invoke/${CF_GET_REVENUE_TREND}`,
    params,
  );
  return response.data;
}

export async function adminGetServiceRevenue(
  params: { startDate: string; endDate: string },
): Promise<ApiResponse<Array<{ category: string; amount: number }>>> {
  const response = await http.post<ApiResponse<Array<{ category: string; amount: number }>>>(
    `/invoke/${CF_GET_SERVICE_REVENUE}`,
    params,
  );
  return response.data;
}

export async function adminGetConsumptionList(
  params: {
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
    technicianId?: string;
    manualEntry?: boolean;
  },
): Promise<ApiResponse<PageResult<ConsumptionRecord>>> {
  const response = await http.post<ApiResponse<PageResult<ConsumptionRecord>>>(
    `/invoke/${CF_GET_CONSUMPTION_LIST}`,
    params,
  );
  return response.data;
}

export async function adminGetTechnicianPerformance(
  params: { startDate: string; endDate: string },
): Promise<ApiResponse<TechnicianPerformance[]>> {
  const response = await http.post<ApiResponse<TechnicianPerformance[]>>(
    `/invoke/${CF_GET_TECHNICIAN_PERFORMANCE}`,
    params,
  );
  return response.data;
}
export async function adminCreateIncomeRecord(
  payload: CreateIncomeRecordPayload,
): Promise<ApiResponse<CreateIncomeRecordResult>> {
  const response = await http.post<ApiResponse<CreateIncomeRecordResult>>(
    `/invoke/${CF_CREATE_INCOME_RECORD}`,
    { ...payload },
  );
  return response.data;
}
