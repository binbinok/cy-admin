import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  adminGetTechnicianList,
  adminCreateTechnician,
  adminUpdateTechnician,
  adminUpdateTechnicianStatus,
  adminDeleteTechnician,
  adminSetTechnicianSchedule,
  adminSetTechnicianServiceSlots,
} from '@/services/technician';
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

describe('technician service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminGetTechnicianList', () => {
    it('should POST to /invoke/adminGetTechnicianList with pagination params', async () => {
      const mockData = {
        data: {
          success: true,
          data: { list: [], total: 0 },
        },
      };
      mockPost.mockResolvedValue(mockData);

      const result = await adminGetTechnicianList({ page: 1, pageSize: 10 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetTechnicianList', {
        page: 1,
        pageSize: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data?.list).toEqual([]);
      expect(result.data?.total).toBe(0);
    });
  });

  describe('adminCreateTechnician', () => {
    it('should POST to /invoke/adminCreateTechnician with technician data', async () => {
      const techData = { name: '张三', specialties: ['美甲', '美睫'] };
      mockPost.mockResolvedValue({
        data: {
          success: true,
          data: { _id: 't1', name: '张三', specialties: ['美甲', '美睫'] },
        },
      });

      const result = await adminCreateTechnician(techData);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateTechnician', techData);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('张三');
    });

    it('should support optional avatarUrl', async () => {
      const techData = { name: '李四', specialties: ['美甲'], avatarUrl: 'https://example.com/avatar.jpg' };
      mockPost.mockResolvedValue({
        data: { success: true, data: { _id: 't2', ...techData } },
      });

      const result = await adminCreateTechnician(techData);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateTechnician', techData);
      expect(result.success).toBe(true);
    });
  });

  describe('adminUpdateTechnician', () => {
    it('should POST to /invoke/adminUpdateTechnician with technicianId and data', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminUpdateTechnician('t1', { name: '张三改' });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateTechnician', {
        technicianId: 't1',
        data: { name: '张三改' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adminUpdateTechnicianStatus', () => {
    it('should POST to /invoke/adminUpdateTechnicianStatus with technicianId and status', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { pendingAppointments: 3 } },
      });

      const result = await adminUpdateTechnicianStatus('t1', 'rest');

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateTechnicianStatus', {
        technicianId: 't1',
        status: 'rest',
      });
      expect(result.success).toBe(true);
      expect(result.data?.pendingAppointments).toBe(3);
    });

    it('should handle status change without pending appointments', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: {} },
      });

      const result = await adminUpdateTechnicianStatus('t1', 'idle');

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateTechnicianStatus', {
        technicianId: 't1',
        status: 'idle',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adminDeleteTechnician', () => {
    it('should POST to /invoke/adminDeleteTechnician with technicianId', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminDeleteTechnician('t1');

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminDeleteTechnician', {
        technicianId: 't1',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adminSetTechnicianSchedule', () => {
    it('should POST to /invoke/adminSetTechnicianSchedule with schedule data', async () => {
      const schedule = {
        '1': [{ startTime: '09:00', endTime: '18:00' }],
        '3': [{ startTime: '10:00', endTime: '19:00' }],
      };
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminSetTechnicianSchedule('t1', schedule);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminSetTechnicianSchedule', {
        technicianId: 't1',
        schedule,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adminSetTechnicianServiceSlots', () => {
    it('should POST to /invoke/adminSetTechnicianServiceSlots with slots data', async () => {
      const slots = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', serviceIds: ['s1', 's2'] },
        { dayOfWeek: 1, startTime: '14:00', endTime: '18:00', serviceIds: ['s3'] },
      ];
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminSetTechnicianServiceSlots('t1', slots);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminSetTechnicianServiceSlots', {
        technicianId: 't1',
        slots,
      });
      expect(result.success).toBe(true);
    });
  });
});
