import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  adminGetServiceList,
  adminGetServiceCategories,
  adminCreateService,
  adminUpdateService,
  adminToggleServiceStatus,
} from '@/services/service';
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

describe('service service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminGetServiceList', () => {
    it('should POST to /invoke/adminGetServiceList with pagination params', async () => {
      const mockData = {
        data: {
          success: true,
          data: { list: [], total: 0 },
        },
      };
      mockPost.mockResolvedValue(mockData);

      const result = await adminGetServiceList({ page: 1, pageSize: 10 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetServiceList', {
        page: 1,
        pageSize: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data?.list).toEqual([]);
      expect(result.data?.total).toBe(0);
    });

    it('should return service items in the list', async () => {
      const services = [
        { _id: 's1', name: '基础美甲', category: 'nail', price: 9900, duration: 60, active: true },
      ];
      mockPost.mockResolvedValue({
        data: { success: true, data: { list: services, total: 1 } },
      });

      const result = await adminGetServiceList({ page: 1, pageSize: 20 });

      expect(result.data?.list).toHaveLength(1);
      expect(result.data?.list[0].name).toBe('基础美甲');
      expect(result.data?.total).toBe(1);
    });
  });
  describe('adminGetServiceCategories', () => {
    it('should POST to /invoke/adminGetServiceCategories and return category list', async () => {
      const categories = [
        { _id: 'c1', code: 'nail', name: '美甲', aliases: ['美甲服务'], active: true, sort: 1 },
      ];
      mockPost.mockResolvedValue({
        data: { success: true, data: categories },
      });
      const result = await adminGetServiceCategories();
      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetServiceCategories', {});
      expect(result.success).toBe(true);
      expect(result.data?.[0].name).toBe('美甲');
    });
  });

  describe('adminCreateService', () => {
    it('should POST to /invoke/adminCreateService with service data', async () => {
      const serviceData = {
        name: '精致美甲',
        category: 'nail',
        price: 12800,
        duration: 90,
        description: '包含基础护理和彩绘',
      };
      mockPost.mockResolvedValue({
        data: {
          success: true,
          data: { _id: 's1', ...serviceData, active: true },
        },
      });

      const result = await adminCreateService(serviceData);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateService', serviceData);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('精致美甲');
    });

    it('should create service without optional description', async () => {
      const serviceData = {
        name: '睫毛嫁接',
        category: 'eyelash',
        price: 19800,
        duration: 120,
      };
      mockPost.mockResolvedValue({
        data: { success: true, data: { _id: 's2', ...serviceData, active: true } },
      });

      const result = await adminCreateService(serviceData);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateService', serviceData);
      expect(result.success).toBe(true);
    });
  });

  describe('adminUpdateService', () => {
    it('should POST to /invoke/adminUpdateService with serviceId and data', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { _id: 's1', name: '高级美甲', price: 15800 } },
      });

      const result = await adminUpdateService('s1', { name: '高级美甲', price: 15800 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateService', {
        serviceId: 's1',
        name: '高级美甲',
        price: 15800,
      });
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('高级美甲');
    });

    it('should support partial updates', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { _id: 's1', duration: 45 } },
      });

      const result = await adminUpdateService('s1', { duration: 45 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateService', {
        serviceId: 's1',
        duration: 45,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adminToggleServiceStatus', () => {
    it('should POST to /invoke/adminToggleServiceStatus to deactivate a service', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminToggleServiceStatus('s1', false);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminToggleServiceStatus', {
        serviceId: 's1',
        active: false,
      });
      expect(result.success).toBe(true);
    });

    it('should POST to /invoke/adminToggleServiceStatus to activate a service', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminToggleServiceStatus('s1', true);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminToggleServiceStatus', {
        serviceId: 's1',
        active: true,
      });
      expect(result.success).toBe(true);
    });
  });
});
