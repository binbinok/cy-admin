import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  adminGetFinanceSummary,
  adminGetRevenueTrend,
  adminGetServiceRevenue,
  adminGetConsumptionList,
  adminGetTechnicianPerformance,
  adminCreateIncomeRecord,
} from '@/services/finance';
import http from '@/services/http';

vi.mock('@/services/http', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ clearAuth: vi.fn() }) },
}));

const mockPost = vi.mocked(http.post);

describe('finance service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminGetFinanceSummary', () => {
    it('should POST with period param and return finance summary', async () => {
      const mockData = {
        data: {
          success: true,
          data: { totalRevenue: 99900, orderCount: 10 },
        },
      };
      mockPost.mockResolvedValue(mockData);

      const result = await adminGetFinanceSummary({ period: 'today' });

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetFinanceSummary',
        { period: 'today' },
      );
      expect(result.success).toBe(true);
      expect(result.data?.totalRevenue).toBe(99900);
      expect(result.data?.orderCount).toBe(10);
    });

    it('should support week and month periods', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { totalRevenue: 500000, orderCount: 50 } },
      });

      await adminGetFinanceSummary({ period: 'week' });
      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetFinanceSummary',
        { period: 'week' },
      );

      await adminGetFinanceSummary({ period: 'month' });
      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetFinanceSummary',
        { period: 'month' },
      );
    });
  });

  describe('adminGetRevenueTrend', () => {
    it('should POST with date range and return revenue trend array', async () => {
      const trendData = [
        { date: '2024-01-01', amount: 10000 },
        { date: '2024-01-02', amount: 15000 },
      ];
      mockPost.mockResolvedValue({
        data: { success: true, data: trendData },
      });

      const result = await adminGetRevenueTrend({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetRevenueTrend',
        { startDate: '2024-01-01', endDate: '2024-01-31' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].date).toBe('2024-01-01');
      expect(result.data?.[0].amount).toBe(10000);
    });
  });

  describe('adminGetServiceRevenue', () => {
    it('should POST with date range and return service revenue breakdown', async () => {
      const revenueData = [
        { category: '美甲', amount: 50000 },
        { category: '美睫', amount: 30000 },
      ];
      mockPost.mockResolvedValue({
        data: { success: true, data: revenueData },
      });

      const result = await adminGetServiceRevenue({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetServiceRevenue',
        { startDate: '2024-01-01', endDate: '2024-01-31' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].category).toBe('美甲');
      expect(result.data?.[0].amount).toBe(50000);
    });
  });

  describe('adminGetConsumptionList', () => {
    it('should POST with pagination params and return page result', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { list: [], total: 0 } },
      });

      const result = await adminGetConsumptionList({ page: 1, pageSize: 10 });

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetConsumptionList',
        { page: 1, pageSize: 10 },
      );
      expect(result.success).toBe(true);
      expect(result.data?.list).toEqual([]);
      expect(result.data?.total).toBe(0);
    });

    it('should forward all optional filter params', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { list: [], total: 0 } },
      });

      const params = {
        page: 1,
        pageSize: 20,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        technicianId: 't1',
        manualEntry: true,
      };
      await adminGetConsumptionList(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetConsumptionList',
        params,
      );
    });

    it('should return consumption records with data', async () => {
      const record = {
        _id: 'c1',
        memberId: 'm1',
        appointmentId: 'a1',
        serviceName: '美甲基础款',
        amount: 9900,
        points: 99,
        technicianId: 't1',
        technicianName: '张技师',
        createdAt: new Date(),
      };
      mockPost.mockResolvedValue({
        data: { success: true, data: { list: [record], total: 1 } },
      });

      const result = await adminGetConsumptionList({ page: 1, pageSize: 10 });

      expect(result.data?.list).toHaveLength(1);
      expect(result.data?.list[0].amount).toBe(9900);
      expect(result.data?.list[0].technicianId).toBe('t1');
      expect(result.data?.list[0].technicianName).toBe('张技师');
      expect(result.data?.total).toBe(1);
    });
  });

  describe('adminGetTechnicianPerformance', () => {
    it('should POST with date range and return technician performance array', async () => {
      const perfData = [
        { technicianId: 't1', technicianName: '张技师', orderCount: 20, totalAmount: 200000 },
        { technicianId: 't2', technicianName: '李技师', orderCount: 15, totalAmount: 150000 },
      ];
      mockPost.mockResolvedValue({
        data: { success: true, data: perfData },
      });

      const result = await adminGetTechnicianPerformance({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetTechnicianPerformance',
        { startDate: '2024-01-01', endDate: '2024-01-31' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].technicianName).toBe('张技师');
      expect(result.data?.[0].totalAmount).toBe(200000);
    });

    it('should propagate error on failure', async () => {
      mockPost.mockRejectedValue(new Error('查询失败'));

      await expect(
        adminGetTechnicianPerformance({ startDate: '2024-01-01', endDate: '2024-01-31' }),
      ).rejects.toThrow('查询失败');
    });
  });
  describe('adminCreateIncomeRecord', () => {
    it('should POST to /invoke/adminCreateIncomeRecord with fee detail payload', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { consumptionId: 'cr1', amount: 9000, discountAmount: 1000, pointsEarned: 900 } },
      });
      const payload = {
        serviceCategory: '美甲',
        serviceName: '手工录入美甲',
        serviceFee: 10000,
        serviceTime: '2026-04-17 10:00',
        technicianId: 't1',
        memberId: 'M001',
        note: '测试录入',
      };
      const result = await adminCreateIncomeRecord(payload);
      expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateIncomeRecord', payload);
      expect(result.success).toBe(true);
    });
    it('should expose fee detail and points fields from response', async () => {
      mockPost.mockResolvedValue({
        data: {
          success: true,
          data: {
            consumptionId: 'cr2',
            amount: 8600,
            originalAmount: 10000,
            discountAmount: 1400,
            pointsEarned: 860,
          },
        },
      });
      const payload = {
        serviceCategory: '美睫',
        serviceName: '手工录入美睫',
        serviceFee: 10000,
        serviceTime: '2026-04-17 11:00',
        technicianId: 't2',
      };
      const result = await adminCreateIncomeRecord(payload);
      expect(result.success).toBe(true);
      const resultData = result.data!;
      expect(resultData.amount).toBe(8600);
      expect(resultData.originalAmount).toBe(10000);
      expect(resultData.discountAmount).toBe(1400);
      expect(resultData.pointsEarned).toBe(860);
    });
  });
});
