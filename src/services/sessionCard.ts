import http from './http';
import {
  CF_CREATE_SESSION_CARD_TYPE,
  CF_UPDATE_SESSION_CARD_TYPE,
  CF_GET_SESSION_CARD_TYPES,
  CF_TOGGLE_SESSION_CARD_TYPE,
  CF_ISSUE_SESSION_CARD,
  CF_GET_MEMBER_SESSION_CARDS,
  CF_REFUND_SESSION_CARD,
  CF_GET_PREPAID_SUMMARY,
} from '@/constants/api';
import type { ApiResponse } from '@/types/common';
import type {
  MemberSessionCard,
  PrepaidSummary,
  SessionCardRedemption,
  SessionCardType,
} from '@/types/sessionCard';

export interface SessionCardTypePayload {
  name: string;
  price: number; // 分
  totalSessions: number;
  categoryId: string;
  baseItemScope: 'all' | 'selected';
  baseItemIds?: string[];
  coveredAddonIds?: string[];
  validityType: 'permanent' | 'days' | 'fixed_date';
  validityDays?: number;
  fixedExpireDate?: string;
  refundPolicy: 'none' | 'prorated';
}

export async function adminCreateSessionCardType(
  params: SessionCardTypePayload,
): Promise<ApiResponse<{ cardTypeId: string }>> {
  const response = await http.post<ApiResponse<{ cardTypeId: string }>>(
    `/invoke/${CF_CREATE_SESSION_CARD_TYPE}`,
    { ...params },
  );
  return response.data;
}

export async function adminUpdateSessionCardType(
  params: SessionCardTypePayload & { cardTypeId: string },
): Promise<ApiResponse<{ cardTypeId: string }>> {
  const response = await http.post<ApiResponse<{ cardTypeId: string }>>(
    `/invoke/${CF_UPDATE_SESSION_CARD_TYPE}`,
    { ...params },
  );
  return response.data;
}

export async function adminGetSessionCardTypes(
  params: { activeOnly?: boolean } = {},
): Promise<ApiResponse<SessionCardType[]>> {
  const response = await http.post<ApiResponse<{ list?: SessionCardType[] }>>(
    `/invoke/${CF_GET_SESSION_CARD_TYPES}`,
    params,
  );
  const list = Array.isArray(response.data.data?.list) ? response.data.data.list : [];
  return { ...response.data, data: list };
}

export async function adminToggleSessionCardType(
  params: { cardTypeId: string; active: boolean },
): Promise<ApiResponse<{ cardTypeId: string; active: boolean }>> {
  const response = await http.post<ApiResponse<{ cardTypeId: string; active: boolean }>>(
    `/invoke/${CF_TOGGLE_SESSION_CARD_TYPE}`,
    params,
  );
  return response.data;
}

export async function adminIssueSessionCard(
  params: { memberId: string; cardTypeId: string; paidAmount?: number; paymentMethod: string; commissionTechnicianId: string },
): Promise<ApiResponse<{ card: MemberSessionCard }>> {
  const response = await http.post<ApiResponse<{ card: MemberSessionCard }>>(
    `/invoke/${CF_ISSUE_SESSION_CARD}`,
    params,
  );
  return response.data;
}

export async function adminGetMemberSessionCards(
  params: { memberId: string },
): Promise<ApiResponse<{ cards: MemberSessionCard[]; redemptions: SessionCardRedemption[] }>> {
  const response = await http.post<
    ApiResponse<{ cards?: MemberSessionCard[]; redemptions?: SessionCardRedemption[] }>
  >(`/invoke/${CF_GET_MEMBER_SESSION_CARDS}`, params);
  return {
    ...response.data,
    data: {
      cards: response.data.data?.cards ?? [],
      redemptions: response.data.data?.redemptions ?? [],
    },
  };
}

export async function adminRefundSessionCard(
  params: { sessionCardId: string; reason: string; refundAmount?: number },
): Promise<ApiResponse<{ card: MemberSessionCard; refundAmount: number }>> {
  const response = await http.post<ApiResponse<{ card: MemberSessionCard; refundAmount: number }>>(
    `/invoke/${CF_REFUND_SESSION_CARD}`,
    params,
  );
  return response.data;
}

export async function adminGetPrepaidSummary(
  params: { period: 'today' | 'week' | 'month' },
): Promise<ApiResponse<PrepaidSummary>> {
  const response = await http.post<ApiResponse<PrepaidSummary>>(
    `/invoke/${CF_GET_PREPAID_SUMMARY}`,
    params,
  );
  return response.data;
}
