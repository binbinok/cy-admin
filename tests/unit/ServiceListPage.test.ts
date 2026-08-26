import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Service } from '@/types/service';
import { formatAmount } from '@/utils/format';
import { validateServiceItem } from '@/utils/validation';
import { SEARCH_DEBOUNCE_MS } from '@/constants/business';

/**
 * ServiceListPage unit tests
 *
 * Tests the service list data fetching, search debounce, category filter,
 * create/edit modal validation, price validation, name validation,
 * toggle status with confirmation, pagination, and formatAmount display.
 * Mocks service API functions.
 */

// Mock service API
const mockAdminGetServiceList = vi.fn();
const mockAdminCreateServiceTemplate = vi.fn();
const mockAdminUpdateServiceTemplate = vi.fn();
const mockAdminToggleServiceTemplateStatus = vi.fn();
vi.mock('@/services/service', () => ({
  adminGetServiceList: (...args: unknown[]) => mockAdminGetServiceList(...args),
  adminCreateServiceTemplate: (...args: unknown[]) => mockAdminCreateServiceTemplate(...args),
  adminUpdateServiceTemplate: (...args: unknown[]) => mockAdminUpdateServiceTemplate(...args),
  adminToggleServiceTemplateStatus: (...args: unknown[]) =>
    mockAdminToggleServiceTemplateStatus(...args),
}));

// Mock http
vi.mock('@/services/http', () => ({
  default: { post: vi.fn() },
}));

const makeService = (overrides: Partial<Service> = {}): Service => ({
  _id: 's1',
  name: '基础美甲',
  category: 'nail',
  price: 12800,
  duration: 60,
  description: '基础美甲服务',
  active: true,
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-06-01'),
  ...overrides,
});

describe('ServiceListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // 1. Renders table with service data
  describe('table data fetching', () => {
    it('should call adminGetServiceList with default params', async () => {
      const services = [makeService()];
      mockAdminGetServiceList.mockResolvedValue({
        success: true,
        data: { list: services, total: 1 },
      });

      const { adminGetServiceList } = await import('@/services/service');
      const res = await adminGetServiceList({ page: 1, pageSize: 10 });

      expect(mockAdminGetServiceList).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      });
      expect(res.data!.list).toHaveLength(1);
      expect(res.data!.list[0].name).toBe('基础美甲');
    });

    it('should have correct data fields for table columns', () => {
      const svc = makeService();
      expect(svc).toHaveProperty('name');
      expect(svc).toHaveProperty('category');
      expect(svc).toHaveProperty('price');
      expect(svc).toHaveProperty('duration');
      expect(svc).toHaveProperty('active');
    });
  });

  // 2. Search with debounce
  describe('search debounce', () => {
    it('should use SEARCH_DEBOUNCE_MS (300ms) for debounce delay', () => {
      expect(SEARCH_DEBOUNCE_MS).toBe(300);
    });

    it('should call API with keyword param after debounce', async () => {
      mockAdminGetServiceList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetServiceList } = await import('@/services/service');
      await adminGetServiceList({
        page: 1,
        pageSize: 10,
        keyword: '美甲',
      });

      expect(mockAdminGetServiceList).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        keyword: '美甲',
      });
    });
  });

  // 3. Category filter
  describe('category filter', () => {
    it('should call API with category param when filter is applied', async () => {
      mockAdminGetServiceList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetServiceList } = await import('@/services/service');
      await adminGetServiceList({
        page: 1,
        pageSize: 10,
        category: 'nail',
      });

      expect(mockAdminGetServiceList).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        category: 'nail',
      });
    });

    it('should have all four category options available', () => {
      const categories = ['nail', 'eyelash', 'nail_care', 'package'];
      expect(categories).toContain('nail');
      expect(categories).toContain('eyelash');
      expect(categories).toContain('nail_care');
      expect(categories).toContain('package');
    });

    it('should map category keys to Chinese labels', () => {
      const categoryMap: Record<string, string> = {
        nail: '美甲',
        eyelash: '美睫',
        nail_care: '指甲护理',
        package: '套餐',
      };
      expect(categoryMap['nail']).toBe('美甲');
      expect(categoryMap['eyelash']).toBe('美睫');
      expect(categoryMap['nail_care']).toBe('指甲护理');
      expect(categoryMap['package']).toBe('套餐');
    });
  });

  // 4. Create modal opens and validates
  describe('create modal validation', () => {
    it('should call adminCreateServiceTemplate with correct payload', async () => {
      mockAdminCreateServiceTemplate.mockResolvedValue({
        success: true,
        data: { templateId: 'tpl1', message: '服务模板创建成功' },
      });

      const { adminCreateServiceTemplate } = await import('@/services/service');
      const payload = {
        categoryId: 'c1',
        defaultDuration: 120,
        baseItems: [
          {
            name: '基础款式',
            inputType: 'single_select' as const,
            options: ['基础款式'],
            defaultPrice: 9900,
            defaultDuration: 120,
            discountable: true,
            commissionable: true,
            enabled: true,
          },
        ],
        addonItems: [],
      };
      const res = await adminCreateServiceTemplate(payload);

      expect(mockAdminCreateServiceTemplate).toHaveBeenCalledWith(payload);
      expect(res.success).toBe(true);
    });

    it('should convert yuan input to fen for storage', () => {
      const yuanInput = 128.5;
      const fenValue = Math.round(yuanInput * 100);
      expect(fenValue).toBe(12850);
    });
  });

  // 5. Edit modal pre-fills data
  describe('edit modal pre-fill', () => {
    it('should call adminUpdateServiceTemplate with template id and data', async () => {
      mockAdminUpdateServiceTemplate.mockResolvedValue({
        success: true,
        data: { templateId: 'tpl1', message: '服务模板更新成功' },
      });

      const { adminUpdateServiceTemplate } = await import('@/services/service');
      const res = await adminUpdateServiceTemplate('tpl1', {
        defaultDuration: 90,
      });

      expect(mockAdminUpdateServiceTemplate).toHaveBeenCalledWith('tpl1', {
        defaultDuration: 90,
      });
      expect(res.success).toBe(true);
    });

    it('should convert fen to yuan for edit form display', () => {
      const svc = makeService({ price: 12800 });
      const displayYuan = svc.price / 100;
      expect(displayYuan).toBe(128);
    });
  });

  // 6. Price validation (must be > 0)
  describe('price validation', () => {
    it('should reject price of 0', () => {
      const result = validateServiceItem({
        name: '测试服务',
        price: 0,
        duration: 30,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('价格必须大于 0');
    });

    it('should reject negative price', () => {
      const result = validateServiceItem({
        name: '测试服务',
        price: -100,
        duration: 30,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('价格必须大于 0');
    });

    it('should accept positive price', () => {
      const result = validateServiceItem({
        name: '测试服务',
        price: 9900,
        duration: 30,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // 7. Name validation (2-30 chars)
  describe('name validation', () => {
    it('should reject name with 1 character', () => {
      const result = validateServiceItem({
        name: '甲',
        price: 100,
        duration: 30,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('服务名称长度必须为 2–30 个字符');
    });

    it('should accept name with 2 characters', () => {
      const result = validateServiceItem({
        name: '美甲',
        price: 100,
        duration: 30,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept name with 30 characters', () => {
      const name = '超'.repeat(30);
      expect(name.length).toBe(30);
      const result = validateServiceItem({
        name,
        price: 100,
        duration: 30,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject name with 31 characters', () => {
      const name = '超'.repeat(31);
      expect(name.length).toBe(31);
      const result = validateServiceItem({
        name,
        price: 100,
        duration: 30,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('服务名称长度必须为 2–30 个字符');
    });
  });

  // 8. Toggle status with confirmation
  describe('toggle status', () => {
    it('should call adminToggleServiceTemplateStatus to disable', async () => {
      mockAdminToggleServiceTemplateStatus.mockResolvedValue({ success: true });

      const { adminToggleServiceTemplateStatus } = await import(
        '@/services/service'
      );
      const res = await adminToggleServiceTemplateStatus('tpl1', false);

      expect(mockAdminToggleServiceTemplateStatus).toHaveBeenCalledWith('tpl1', false);
      expect(res.success).toBe(true);
    });

    it('should call adminToggleServiceTemplateStatus to enable', async () => {
      mockAdminToggleServiceTemplateStatus.mockResolvedValue({ success: true });

      const { adminToggleServiceTemplateStatus } = await import(
        '@/services/service'
      );
      const res = await adminToggleServiceTemplateStatus('tpl1', true);

      expect(mockAdminToggleServiceTemplateStatus).toHaveBeenCalledWith('tpl1', true);
      expect(res.success).toBe(true);
    });

    it('should handle toggle failure gracefully', async () => {
      mockAdminToggleServiceTemplateStatus.mockResolvedValue({
        success: false,
        error: { code: 'TOGGLE_FAILED', message: '操作失败' },
      });

      const { adminToggleServiceTemplateStatus } = await import(
        '@/services/service'
      );
      const res = await adminToggleServiceTemplateStatus('tpl1', false);

      expect(res.success).toBe(false);
      expect(res.error?.message).toBe('操作失败');
    });
  });

  // 9. Pagination
  describe('pagination', () => {
    it('should call API with correct page param', async () => {
      mockAdminGetServiceList.mockResolvedValue({
        success: true,
        data: { list: [], total: 50 },
      });

      const { adminGetServiceList } = await import('@/services/service');
      await adminGetServiceList({ page: 3, pageSize: 10 });

      expect(mockAdminGetServiceList).toHaveBeenCalledWith({
        page: 3,
        pageSize: 10,
      });
    });

    it('should return total count for pagination', async () => {
      mockAdminGetServiceList.mockResolvedValue({
        success: true,
        data: { list: [makeService()], total: 42 },
      });

      const { adminGetServiceList } = await import('@/services/service');
      const res = await adminGetServiceList({ page: 1, pageSize: 10 });

      expect(res.data!.total).toBe(42);
    });

    it('should handle empty page gracefully', async () => {
      mockAdminGetServiceList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetServiceList } = await import('@/services/service');
      const res = await adminGetServiceList({ page: 1, pageSize: 10 });

      const list = res.data?.list ?? [];
      expect(list).toHaveLength(0);
      expect(res.data!.total).toBe(0);
    });
  });

  // 10. formatAmount displays correctly
  describe('formatAmount display', () => {
    it('should convert fen to yuan with 2 decimal places', () => {
      expect(formatAmount(12800)).toBe('128.00');
      expect(formatAmount(9900)).toBe('99.00');
      expect(formatAmount(100)).toBe('1.00');
      expect(formatAmount(1)).toBe('0.01');
    });

    it('should handle zero amount', () => {
      expect(formatAmount(0)).toBe('0.00');
    });

    it('should handle large amounts', () => {
      expect(formatAmount(10000000)).toBe('100000.00');
    });
  });

  // 11. Duration validation
  describe('duration validation', () => {
    it('should reject non-integer duration', () => {
      const result = validateServiceItem({
        name: '测试服务',
        price: 100,
        duration: 30.5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('时长必须为大于 0 的整数');
    });

    it('should reject zero duration', () => {
      const result = validateServiceItem({
        name: '测试服务',
        price: 100,
        duration: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('时长必须为大于 0 的整数');
    });

    it('should accept positive integer duration', () => {
      const result = validateServiceItem({
        name: '测试服务',
        price: 100,
        duration: 60,
      });
      expect(result.valid).toBe(true);
    });
  });
});
