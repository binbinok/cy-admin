import http from './http';
import {
  CF_GET_DISCOUNT_LEVELS,
  CF_CREATE_DISCOUNT_LEVEL,
  CF_UPDATE_DISCOUNT_LEVEL,
  CF_DELETE_DISCOUNT_LEVEL,
  CF_ASSIGN_DISCOUNT_LEVEL,
  CF_RECHARGE_CARD,
  CF_GET_CARD_RECHARGE_RECORDS,
  CF_GET_CARD_CONSUMPTION_RECORDS,
  CF_DEDUCT_CARD_BALANCE,
  CF_GET_MEMBER_CARD_ASSOCIATION,
  CF_CREATE_MEMBER_CARD,
  CF_CANCEL_MEMBER_CARD,
  CF_UPDATE_CARD_LEVEL,
} from '@/constants/api';
import type { ApiResponse, PageResult } from '@/types/common';
import type { CardConsumptionRecord, CardRechargeRecord, MemberCard } from '@/types/member';

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

export interface LevelUpgraded {
  fromLevelId: string;
  fromLevelName: string;
  toLevelId: string;
  toLevelName: string;
}

export async function adminRechargeCard(
  params: { memberId: string; amount: number; commissionTechnicianId: string },
): Promise<ApiResponse<{ card: MemberCard; rechargeRecord: CardRechargeRecord; levelUpgraded?: LevelUpgraded }>> {
  const response = await http.post<ApiResponse<{ card: MemberCard; rechargeRecord: CardRechargeRecord; levelUpgraded?: LevelUpgraded }>>(
    `/invoke/${CF_RECHARGE_CARD}`,
    params,
  );
  return response.data;
}

export async function adminUpdateCardLevel(
  params: { memberId: string; targetLevelId: string; reason: string },
): Promise<ApiResponse<{ card: MemberCard }>> {
  const response = await http.post<ApiResponse<{ card: MemberCard }>>(
    `/invoke/${CF_UPDATE_CARD_LEVEL}`,
    params,
  );
  return response.data;
}

export async function adminGetCardRechargeRecords(
  params: { memberId: string; page: number; pageSize: number },
): Promise<ApiResponse<PageResult<CardRechargeRecord>>> {
  const response = await http.post<ApiResponse<PageResult<CardRechargeRecord>>>(
    `/invoke/${CF_GET_CARD_RECHARGE_RECORDS}`,
    params,
  );
  return response.data;
}

export async function adminGetCardConsumptionRecords(
  params: { cardId: string },
): Promise<ApiResponse<{ records: CardConsumptionRecord[] }>> {
  const response = await http.post<ApiResponse<{ records: CardConsumptionRecord[] }>>(
    `/invoke/${CF_GET_CARD_CONSUMPTION_RECORDS}`,
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
export async function adminCancelMemberCard(
  params: { memberId: string; reason: string; phoneLast4: string; password: string; balanceAction?: 'refunded_offline' | 'cleared' },
): Promise<ApiResponse<MemberCard>> {
  const response = await http.post<ApiResponse<MemberCard>>(
    `/invoke/${CF_CANCEL_MEMBER_CARD}`,
    { ...params },
  );
  return response.data;
}
export async function adminCreateMemberCard(
  params: { memberId: string; discountLevelId: string; amount: number; commissionTechnicianId: string },
): Promise<ApiResponse<MemberCard>> {
  const response = await http.post<ApiResponse<MemberCard>>(
    `/invoke/${CF_CREATE_MEMBER_CARD}`,
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
