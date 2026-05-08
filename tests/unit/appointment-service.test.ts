import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  adminGetAppointmentList,
  adminConfirmArrival,
  adminCompleteService,
  adminCancelAppointment,
} from '@/services/appointment';
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

describe('appointment service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminGetAppointmentList', () => {
    it('should POST with pagination params and return page result', async () => {
      const mockData = {
        data: {
          success: true,
          data: { list: [], total: 0 },
        },
      };
      mockPost.mockResolvedValue(mockData);

      const result = await adminGetAppointmentList({ page: 1, pageSize: 10 });

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetAppointmentList',
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
        status: 'pending',
        keyword: '张三',
      };
      await adminGetAppointmentList(params);

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminGetAppointmentList',
        params,
      );
    });

    it('should return appointment list with data', async () => {
      const appointment = {
        _id: 'a1',
        appointmentId: 'APT001',
        memberId: 'm1',
        serviceId: 's1',
        technicianId: 't1',
        appointmentDate: '2024-01-15',
        appointmentTime: '10:00',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPost.mockResolvedValue({
        data: { success: true, data: { list: [appointment], total: 1 } },
      });

      const result = await adminGetAppointmentList({ page: 1, pageSize: 10 });

      expect(result.data?.list).toHaveLength(1);
      expect(result.data?.list[0].appointmentId).toBe('APT001');
      expect(result.data?.total).toBe(1);
    });
  });

  describe('adminConfirmArrival', () => {
    it('should POST to /invoke/adminConfirmArrival with appointmentId', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminConfirmArrival('a1');

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminConfirmArrival',
        { appointmentId: 'a1' },
      );
      expect(result.success).toBe(true);
    });

    it('should propagate error when appointment not found', async () => {
      mockPost.mockRejectedValue(new Error('预约不存在'));

      await expect(adminConfirmArrival('invalid')).rejects.toThrow('预约不存在');
    });
  });

  describe('adminCompleteService', () => {
    it('should POST with appointmentId and actualAmount', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminCompleteService('a1', 9900);

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminCompleteService',
        { appointmentId: 'a1', actualAmount: 9900 },
      );
      expect(result.success).toBe(true);
    });

    it('should allow actualAmount of 0 for free service', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminCompleteService('a1', 0);

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminCompleteService',
        { appointmentId: 'a1', actualAmount: 0 },
      );
      expect(result.success).toBe(true);
    });
  });

  describe('adminCancelAppointment', () => {
    it('should POST to /invoke/adminCancelAppointment with appointmentId', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminCancelAppointment('a1');

      expect(mockPost).toHaveBeenCalledWith(
        '/invoke/adminCancelAppointment',
        { appointmentId: 'a1' },
      );
      expect(result.success).toBe(true);
    });

    it('should propagate error on failure', async () => {
      mockPost.mockRejectedValue(new Error('取消失败'));

      await expect(adminCancelAppointment('a1')).rejects.toThrow('取消失败');
    });
  });
});
