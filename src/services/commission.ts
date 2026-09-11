import http from './http';
import {
  CF_GET_COMMISSION_REPORT,
  CF_GET_COMMISSION_CONFIG,
  CF_UPDATE_COMMISSION_RATE,
} from '@/constants/api';
import type { ApiResponse } from '@/types/common';

export interface CommissionReportItem {
  technicianId: string;
  technicianName: string;
  completedCount: number;
  totalAmount: number;
  manualAmount: number;
  cardOpenAmount: number;
  cardRenewAmount: number;
  totalCommission: number;
}

export interface CommissionGlobalConfig {
  manualRate: number;
  cardOpenRate: number;
  cardRenewRate: number;
}

export async function adminGetCommissionReport(
  params: { startDate: string; endDate: string },
): Promise<ApiResponse<CommissionReportItem[]>> {
  const response = await http.post<ApiResponse<CommissionReportItem[]>>(
    `/invoke/${CF_GET_COMMISSION_REPORT}`,
    params,
  );
  return response.data;
}

export async function adminGetCommissionConfig(): Promise<ApiResponse<CommissionGlobalConfig>> {
  const response = await http.post<ApiResponse<CommissionGlobalConfig>>(
    `/invoke/${CF_GET_COMMISSION_CONFIG}`,
    {},
  );
  return response.data;
}

export async function adminUpdateCommissionRate(
  params: CommissionGlobalConfig,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_UPDATE_COMMISSION_RATE}`,
    { ...params },
  );
  return response.data;
}
