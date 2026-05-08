import http from './http';
import {
  CF_GET_DISCOUNT_LEVELS,
  CF_CREATE_DISCOUNT_LEVEL,
  CF_UPDATE_DISCOUNT_LEVEL,
  CF_DELETE_DISCOUNT_LEVEL,
  CF_ASSIGN_DISCOUNT_LEVEL,
  CF_RECHARGE_CARD,
  CF_GET_CARD_RECHARGE_RECORDS,
  CF_DEDUCT_CARD_BALANCE,
  CF_BIND_MEMBER_CARD,
  CF_UNBIND_MEMBER_CARD,
  CF_GET_MEMBER_CARD_ASSOCIATION,
} from '@/constants/api';
import type { ApiResponse, PageResult } from '@/types/common';
import type { CardRechargeRecord, MemberCard } from '@/types/member';

export interface DiscountLevel {
  _id: string;
  name: string;
  discountRate: number;
  minRechargeAmount: number;
  memberCount?: number;
}
interface DiscountLevelListData {
  list?: DiscountLevel[];
}

export async function adminGetDiscountLevels(): Promise<ApiResponse<DiscountLevel[]>> {
  const response = await http.post<ApiResponse<DiscountLevelListData>>(
    `/invoke/${CF_GET_DISCOUNT_LEVELS}`,
    {},
  );
  const normalizedList = Array.isArray(response.data.data?.list)
    ? response.data.data.list
    : [];
  return {
    ...response.data,
    data: normalizedList,
  };
}

export async function adminCreateDiscountLevel(
  params: { name: string; discountRate: number; minRechargeAmount: number },
): Promise<ApiResponse<DiscountLevel>> {
  const response = await http.post<ApiResponse<DiscountLevel>>(
    `/invoke/${CF_CREATE_DISCOUNT_LEVEL}`,
    params,
  );
  return response.data;
}

export async function adminUpdateDiscountLevel(
  params: { discountLevelId: string; name: string; discountRate: number; minRechargeAmount: number },
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_UPDATE_DISCOUNT_LEVEL}`,
    params,
  );
  return response.data;
}

export async function adminDeleteDiscountLevel(
  params: { discountLevelId: string },
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_DELETE_DISCOUNT_LEVEL}`,
    params,
  );
  return response.data;
}

export async function adminAssignDiscountLevel(
  params: { cardId: string; discountLevelId: string },
): Promise<ApiResponse<MemberCard>> {
  const response = await http.post<ApiResponse<MemberCard>>(
    `/invoke/${CF_ASSIGN_DISCOUNT_LEVEL}`,
    params,
  );
  return response.data;
}

export async function adminRechargeCard(
  params: { cardId: string; amount: number },
): Promise<ApiResponse<{ balance: number }>> {
  const response = await http.post<ApiResponse<{ balance: number }>>(
    `/invoke/${CF_RECHARGE_CARD}`,
    params,
  );
  return response.data;
}

export async function adminGetCardRechargeRecords(
  params: { cardId: string; page: number; pageSize: number },
): Promise<ApiResponse<PageResult<CardRechargeRecord>>> {
  const response = await http.post<ApiResponse<PageResult<CardRechargeRecord>>>(
    `/invoke/${CF_GET_CARD_RECHARGE_RECORDS}`,
    params,
  );
  return response.data;
}

export async function adminDeductCardBalance(
  params: { cardId: string; amount: number },
): Promise<ApiResponse<{ balance: number }>> {
  const response = await http.post<ApiResponse<{ balance: number }>>(
    `/invoke/${CF_DEDUCT_CARD_BALANCE}`,
    params,
  );
  return response.data;
}
export async function adminBindMemberCard(
  params: { memberId: string; cardId: string },
): Promise<ApiResponse<MemberCard>> {
  const response = await http.post<ApiResponse<MemberCard>>(
    `/invoke/${CF_BIND_MEMBER_CARD}`,
    { ...params },
  );
  return response.data;
}
export async function adminUnbindMemberCard(
  params: { memberId: string; cardId?: string },
): Promise<ApiResponse<MemberCard>> {
  const response = await http.post<ApiResponse<MemberCard>>(
    `/invoke/${CF_UNBIND_MEMBER_CARD}`,
    { ...params },
  );
  return response.data;
}
export async function adminGetMemberCardAssociation(
  params: { memberId: string },
): Promise<ApiResponse<{ hasAssociation: boolean; card: MemberCard | null }>> {
  const response = await http.post<ApiResponse<{ hasAssociation: boolean; card: MemberCard | null }>>(
    `/invoke/${CF_GET_MEMBER_CARD_ASSOCIATION}`,
    { ...params },
  );
  return response.data;
}
