import http from './http';
import {
  CF_GET_MEMBER_LIST,
  CF_GET_MEMBER_DETAIL,
  CF_CREATE_MEMBER,
  CF_UPDATE_MEMBER,
  CF_GET_MEMBER_CONSUMPTIONS,
  CF_GET_BIRTHDAY_MEMBERS,
  CF_GET_DORMANT_MEMBERS,
  CF_SEND_BIRTHDAY_NOTIFICATION,
} from '@/constants/api';
import type { Member, MemberCard, ConsumptionRecord } from '@/types/member';
import type { ApiResponse, PageResult } from '@/types/common';

export async function adminGetMemberList(
  params: { page: number; pageSize: number; keyword?: string; level?: string },
): Promise<ApiResponse<PageResult<Member>>> {
  const response = await http.post<ApiResponse<PageResult<Member>>>(
    `/invoke/${CF_GET_MEMBER_LIST}`,
    params,
  );
  return response.data;
}

export async function adminCreateMember(
  data: {
    nickName?: string;
    phone?: string;
    birthday?: string;
    wechatId?: string;
    cardId?: string;
  },
): Promise<ApiResponse<Member>> {
  const response = await http.post<ApiResponse<Member>>(
    `/invoke/${CF_CREATE_MEMBER}`,
    data,
  );
  return response.data;
}

export async function adminGetMemberDetail(
  memberId: string,
): Promise<ApiResponse<{ member: Member; card?: MemberCard }>> {
  const response = await http.post<ApiResponse<{ member: Member; card?: MemberCard }>>(
    `/invoke/${CF_GET_MEMBER_DETAIL}`,
    { memberId },
  );
  return response.data;
}

export async function adminUpdateMember(
  memberId: string,
  data: Partial<Member>,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_UPDATE_MEMBER}`,
    { memberId, ...data },
  );
  return response.data;
}

export async function adminGetMemberConsumptions(
  params: { memberId: string; page: number; pageSize: number },
): Promise<ApiResponse<PageResult<ConsumptionRecord>>> {
  const response = await http.post<ApiResponse<PageResult<ConsumptionRecord>>>(
    `/invoke/${CF_GET_MEMBER_CONSUMPTIONS}`,
    params,
  );
  return response.data;
}

export async function adminGetBirthdayMembers(
  params: { days: number; page: number; pageSize: number },
): Promise<ApiResponse<PageResult<Member>>> {
  const response = await http.post<ApiResponse<PageResult<Member>>>(
    `/invoke/${CF_GET_BIRTHDAY_MEMBERS}`,
    params,
  );
  return response.data;
}

export async function adminGetDormantMembers(
  params: { page: number; pageSize: number },
): Promise<ApiResponse<PageResult<Member>>> {
  const response = await http.post<ApiResponse<PageResult<Member>>>(
    `/invoke/${CF_GET_DORMANT_MEMBERS}`,
    params,
  );
  return response.data;
}

export async function adminSendBirthdayNotification(
  memberId: string,
): Promise<ApiResponse<void>> {
  const response = await http.post<ApiResponse<void>>(
    `/invoke/${CF_SEND_BIRTHDAY_NOTIFICATION}`,
    { memberId },
  );
  return response.data;
}
