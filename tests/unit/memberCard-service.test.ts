import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminBindMemberCard,
  adminCreateDiscountLevel,
  adminDeleteDiscountLevel,
  adminGetCardRechargeRecords,
  adminGetMemberCardAssociation,
  adminGetDiscountLevels,
  adminRechargeCard,
  adminUnbindMemberCard,
  adminUpdateDiscountLevel,
} from '@/services/memberCard';
import http from '@/services/http';

vi.mock('@/services/http', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ clearAuth: vi.fn() }),
  },
}));

const mockPost = vi.mocked(http.post);

describe('memberCard service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adminGetDiscountLevels should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: [] } });
    const result = await adminGetDiscountLevels();
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetDiscountLevels', {});
    expect(result.success).toBe(true);
  });

  it('adminCreateDiscountLevel should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { _id: 'd1' } } });
    const params = { name: '金卡', discountRate: 85, minRechargeAmount: 50000 };
    const result = await adminCreateDiscountLevel(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateDiscountLevel', params);
    expect(result.success).toBe(true);
  });

  it('adminUpdateDiscountLevel should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true } });
    const params = {
      discountLevelId: 'd1',
      name: '钻石卡',
      discountRate: 80,
      minRechargeAmount: 100000,
    };
    const result = await adminUpdateDiscountLevel(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateDiscountLevel', params);
    expect(result.success).toBe(true);
  });

  it('adminDeleteDiscountLevel should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true } });
    const params = { discountLevelId: 'd1' };
    const result = await adminDeleteDiscountLevel(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminDeleteDiscountLevel', params);
    expect(result.success).toBe(true);
  });

  it('adminRechargeCard should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { balance: 10000 } } });
    const params = { cardId: 'c1', amount: 10000 };
    const result = await adminRechargeCard(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminRechargeCard', params);
    expect(result.success).toBe(true);
    expect(result.data?.balance).toBe(10000);
  });

  it('adminGetCardRechargeRecords should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { list: [], total: 0 } } });
    const params = { cardId: 'c1', page: 1, pageSize: 10 };
    const result = await adminGetCardRechargeRecords(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetCardRechargeRecords', params);
    expect(result.success).toBe(true);
    expect(result.data?.total).toBe(0);
  });

  it('adminBindMemberCard should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { _id: 'c1', memberId: 'M001' } } });
    const params = { memberId: 'M001', cardId: 'c1' };
    const result = await adminBindMemberCard(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminBindMemberCard', params);
    expect(result.success).toBe(true);
    expect(result.data?.memberId).toBe('M001');
  });

  it('adminUnbindMemberCard should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { _id: 'c1', memberId: '' } } });
    const params = { memberId: 'M001', cardId: 'c1' };
    const result = await adminUnbindMemberCard(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminUnbindMemberCard', params);
    expect(result.success).toBe(true);
    expect(result.data?.memberId).toBe('');
  });
  it('adminUnbindMemberCard should support unbind by memberId only', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { _id: 'c2', memberId: '' } } });
    const params = { memberId: 'M002' };
    const result = await adminUnbindMemberCard(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminUnbindMemberCard', params);
    expect(result.success).toBe(true);
    expect(result.data?._id).toBe('c2');
  });

  it('adminGetMemberCardAssociation should call expected endpoint', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { hasAssociation: true, card: { _id: 'c1', memberId: 'M001' } } },
    });
    const params = { memberId: 'M001' };
    const result = await adminGetMemberCardAssociation(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetMemberCardAssociation', params);
    expect(result.success).toBe(true);
    expect(result.data?.hasAssociation).toBe(true);
  });
  it('adminGetMemberCardAssociation should support unassociated member', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { hasAssociation: false, card: null } },
    });
    const params = { memberId: 'M003' };
    const result = await adminGetMemberCardAssociation(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetMemberCardAssociation', params);
    expect(result.success).toBe(true);
    expect(result.data?.hasAssociation).toBe(false);
    expect(result.data?.card).toBeNull();
  });
});
