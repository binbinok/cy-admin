import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminGetCommissionConfig,
  adminGetCommissionReport,
  adminUpdateCommissionRate,
} from '@/services/commission';
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

describe('commission service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adminGetCommissionReport should call expected endpoint', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });
    const params = { startDate: '2026-01-01', endDate: '2026-01-31' };
    const result = await adminGetCommissionReport(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetCommissionReport', params);
    expect(result.success).toBe(true);
  });

  it('adminGetCommissionConfig should call expected endpoint', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });
    const result = await adminGetCommissionConfig();
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetCommissionConfig', {});
    expect(result.success).toBe(true);
  });

  it('adminUpdateCommissionRate should call expected endpoint', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
      },
    });
    const params = { manualRate: 20, cardOpenRate: 10, cardRenewRate: 5 };
    const result = await adminUpdateCommissionRate(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateCommissionRate', params);
    expect(result.success).toBe(true);
  });
});
