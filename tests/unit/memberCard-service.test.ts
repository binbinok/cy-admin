import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminCancelMemberCard,
  adminCreateDiscountLevel,
  adminCreateMemberCard,
  adminDeleteDiscountLevel,
  adminGetCardRechargeRecords,
  adminGetMemberCardAssociation,
  adminGetDiscountLevels,
  adminRechargeCard,
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
    mockPost.mockResolvedValue({
      data: { success: true, data: { card: { _id: 'c1', memberId: 'M001' }, rechargeRecord: { _id: 'r1' } } },
    });
    const params = { memberId: 'M001', amount: 10000 };
    const result = await adminRechargeCard(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminRechargeCard', params);
    expect(result.success).toBe(true);
    expect(result.data?.card?.memberId).toBe('M001');
  });

  it('adminCreateMemberCard should call expected endpoint', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { _id: 'c9', memberId: 'M001', discountLevelId: 'l1' } },
    });
    const params = { memberId: 'M001', discountLevelId: 'l1', amount: 10000 };
    const result = await adminCreateMemberCard(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateMemberCard', params);
    expect(result.success).toBe(true);
    expect(result.data?.discountLevelId).toBe('l1');
  });

  it('adminGetCardRechargeRecords should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { list: [], total: 0 } } });
    const params = { cardId: 'c1', page: 1, pageSize: 10 };
    const result = await adminGetCardRechargeRecords(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetCardRechargeRecords', params);
    expect(result.success).toBe(true);
    expect(result.data?.total).toBe(0);
  });

  it('adminCancelMemberCard should call expected endpoint', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { _id: 'c1', memberId: 'M001', status: 'cancelled' } },
    });
    const params = {
      memberId: 'M001',
      reason: '会员要求退卡',
      phoneLast4: '1234',
      password: 'admin-password',
      balanceAction: 'refunded_offline' as const,
    };
    const result = await adminCancelMemberCard(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminCancelMemberCard', params);
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('cancelled');
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
