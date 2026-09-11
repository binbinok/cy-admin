import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminCreateSessionCardType,
  adminGetMemberSessionCards,
  adminGetPrepaidSummary,
  adminGetSessionCardTypes,
  adminIssueSessionCard,
  adminRefundSessionCard,
  adminToggleSessionCardType,
  adminUpdateSessionCardType,
} from '@/services/sessionCard';
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

describe('sessionCard service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adminCreateSessionCardType should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { cardTypeId: 'ct1' } } });
    const params = {
      name: '美甲 10 次卡',
      price: 68000,
      totalSessions: 10,
      categoryId: 'cat1',
      baseItemScope: 'all' as const,
      validityType: 'permanent' as const,
      refundPolicy: 'prorated' as const,
    };
    const result = await adminCreateSessionCardType(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateSessionCardType', params);
    expect(result.success).toBe(true);
  });

  it('adminUpdateSessionCardType should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { cardTypeId: 'ct1' } } });
    const params = {
      cardTypeId: 'ct1',
      name: '美甲 10 次卡',
      price: 68000,
      totalSessions: 10,
      categoryId: 'cat1',
      baseItemScope: 'selected' as const,
      baseItemIds: ['item1'],
      coveredAddonIds: ['addon1'],
      validityType: 'days' as const,
      validityDays: 365,
      refundPolicy: 'none' as const,
    };
    const result = await adminUpdateSessionCardType(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateSessionCardType', params);
    expect(result.success).toBe(true);
  });

  it('adminGetSessionCardTypes should unwrap list payload', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { list: [{ _id: 'ct1' }] } } });
    const result = await adminGetSessionCardTypes({ activeOnly: true });
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetSessionCardTypes', { activeOnly: true });
    expect(result.data).toEqual([{ _id: 'ct1' }]);
  });

  it('adminGetSessionCardTypes should return empty array when list missing', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: {} } });
    const result = await adminGetSessionCardTypes();
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetSessionCardTypes', {});
    expect(result.data).toEqual([]);
  });

  it('adminToggleSessionCardType should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { cardTypeId: 'ct1', active: false } } });
    const params = { cardTypeId: 'ct1', active: false };
    const result = await adminToggleSessionCardType(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminToggleSessionCardType', params);
    expect(result.success).toBe(true);
  });

  it('adminIssueSessionCard should call expected endpoint', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { card: { _id: 'card1' } } } });
    const params = { memberId: 'M001', cardTypeId: 'ct1', paymentMethod: 'wechat', commissionTechnicianId: 't1' };
    const result = await adminIssueSessionCard(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminIssueSessionCard', params);
    expect(result.data?.card._id).toBe('card1');
  });

  it('adminGetMemberSessionCards should fill defaults for cards and redemptions', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: {} } });
    const result = await adminGetMemberSessionCards({ memberId: 'M001' });
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetMemberSessionCards', { memberId: 'M001' });
    expect(result.data).toEqual({ cards: [], redemptions: [] });
  });

  it('adminRefundSessionCard should call expected endpoint', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { card: { _id: 'card1' }, refundAmount: 34000 } },
    });
    const params = { sessionCardId: 'card1', reason: '顾客退卡' };
    const result = await adminRefundSessionCard(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminRefundSessionCard', params);
    expect(result.data?.refundAmount).toBe(34000);
  });

  it('adminGetPrepaidSummary should call expected endpoint', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          storedCardBalance: 100,
          sessionCardValue: 200,
          prepaidOutstanding: 300,
          periodNewPrepaid: 400,
          periodRechargeAmount: 250,
          periodSessionCardSales: 150,
        },
      },
    });
    const result = await adminGetPrepaidSummary({ period: 'month' });
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetPrepaidSummary', { period: 'month' });
    expect(result.data?.prepaidOutstanding).toBe(300);
  });
});
