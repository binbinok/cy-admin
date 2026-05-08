import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminGetOperationLogs } from '@/services/operationLog';
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

describe('operationLog service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adminGetOperationLogs should call expected endpoint with filters', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { list: [], total: 0 },
      },
    });
    const params = {
      page: 1,
      pageSize: 10,
      adminId: 'admin1',
      action: 'login',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    };
    const result = await adminGetOperationLogs(params);
    expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetOperationLogs', params);
    expect(result.success).toBe(true);
    expect(result.data?.list).toEqual([]);
  });
});
