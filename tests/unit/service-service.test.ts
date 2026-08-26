import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  adminGetServiceList,
  adminGetServiceCategories,
  adminGetServiceTemplates,
  adminCreateServiceTemplate,
  adminUpdateServiceTemplate,
  adminToggleServiceTemplateStatus,
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

const baseItemPayload = {
  name: '基础款式',
  inputType: 'single_select' as const,
  options: ['基础款式'],
  defaultPrice: 12800,
  defaultDuration: 120,
  discountable: true,
  commissionable: true,
  enabled: true,
};

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

  describe('adminGetServiceTemplates', () => {
    it('should POST to /invoke/adminGetServiceTemplates with activeOnly param', async () => {
      const templates = [
        {
          _id: 'tpl1',
          categoryId: 'c1',
          categoryName: '美甲',
          defaultDuration: 120,
          baseItems: [],
          addonItems: [],
          active: true,
          sort: 10,
        },
      ];
      mockPost.mockResolvedValue({ data: { success: true, data: templates } });

      const result = await adminGetServiceTemplates({ activeOnly: true });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetServiceTemplates', {
        activeOnly: true,
      });
      expect(result.success).toBe(true);
      expect(result.data?.[0].categoryName).toBe('美甲');
    });

    it('should default to empty params', async () => {
      mockPost.mockResolvedValue({ data: { success: true, data: [] } });

      const result = await adminGetServiceTemplates();

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetServiceTemplates', {});
      expect(result.data).toEqual([]);
    });
  });

  describe('adminCreateServiceTemplate', () => {
    it('should POST to /invoke/adminCreateServiceTemplate with template data', async () => {
      const templateData = {
        categoryId: 'c1',
        defaultDuration: 120,
        baseItems: [baseItemPayload],
        addonItems: [],
      };
      mockPost.mockResolvedValue({
        data: { success: true, data: { templateId: 'tpl1', message: '服务模板创建成功' } },
      });

      const result = await adminCreateServiceTemplate(templateData);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateServiceTemplate', templateData);
      expect(result.success).toBe(true);
      expect(result.data?.templateId).toBe('tpl1');
    });
  });

  describe('adminUpdateServiceTemplate', () => {
    it('should POST to /invoke/adminUpdateServiceTemplate with templateId and data', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { templateId: 'tpl1', message: '服务模板更新成功' } },
      });

      const result = await adminUpdateServiceTemplate('tpl1', { defaultDuration: 90 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateServiceTemplate', {
        templateId: 'tpl1',
        defaultDuration: 90,
      });
      expect(result.success).toBe(true);
    });

    it('should support partial updates of baseItems', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { templateId: 'tpl1', message: '服务模板更新成功' } },
      });

      const result = await adminUpdateServiceTemplate('tpl1', { baseItems: [baseItemPayload] });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateServiceTemplate', {
        templateId: 'tpl1',
        baseItems: [baseItemPayload],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adminToggleServiceTemplateStatus', () => {
    it('should POST to /invoke/adminToggleServiceTemplateStatus to disable a template', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { templateId: 'tpl1', active: false, message: '模板已停用' } },
      });

      const result = await adminToggleServiceTemplateStatus('tpl1', false);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminToggleServiceTemplateStatus', {
        templateId: 'tpl1',
        active: false,
      });
      expect(result.success).toBe(true);
      expect(result.data?.active).toBe(false);
    });

    it('should POST to /invoke/adminToggleServiceTemplateStatus to enable a template', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { templateId: 'tpl1', active: true, message: '模板已启用' } },
      });

      const result = await adminToggleServiceTemplateStatus('tpl1', true);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminToggleServiceTemplateStatus', {
        templateId: 'tpl1',
        active: true,
      });
      expect(result.success).toBe(true);
      expect(result.data?.active).toBe(true);
    });
  });
});
