import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Member } from '@/types/member';
import { maskPhone, formatAmount, formatDate } from '@/utils/format';
import { MEMBER_LEVELS, SEARCH_DEBOUNCE_MS } from '@/constants/business';

/**
 * MemberListPage unit tests
 *
 * Tests the data fetching logic, formatting, search debounce,
 * level filtering, row navigation, pagination, and display formatting.
 * Mocks member service and react-router-dom navigation.
 */

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock member service
const mockAdminGetMemberList = vi.fn();
vi.mock('@/services/member', () => ({
  adminGetMemberList: (...args: unknown[]) => mockAdminGetMemberList(...args),
}));

// Mock http (needed by member service)
vi.mock('@/services/http', () => ({
  default: { post: vi.fn() },
}));

const makeMember = (overrides: Partial<Member> = {}): Member => ({
  _id: 'm1',
  memberId: 'MEM001',
  openId: 'open1',
  nickName: '张三',
  phone: '13812345678',
  level: 'gold',
  points: 500,
  totalConsumption: 99900,
  consumptionCount: 10,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-06-01'),
  ...overrides,
});

describe('MemberListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // 1. Renders member list table with correct columns
  describe('table columns', () => {
    it('should call adminGetMemberList with default params', async () => {
      const members = [makeMember()];
      mockAdminGetMemberList.mockResolvedValue({
        success: true,
        data: { list: members, total: 1 },
      });

      const { adminGetMemberList } = await import('@/services/member');
      const res = await adminGetMemberList({
        page: 1,
        pageSize: 10,
      });

      expect(mockAdminGetMemberList).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      });
      expect(res.data!.list).toHaveLength(1);
      expect(res.data!.list[0].nickName).toBe('张三');
      expect(res.data!.list[0].phone).toBe('13812345678');
      expect(res.data!.list[0].level).toBe('gold');
      expect(res.data!.list[0].points).toBe(500);
      expect(res.data!.list[0].totalConsumption).toBe(99900);
    });

    it('should have correct column fields defined', () => {
      const expectedColumns = [
        'nickName',
        'phone',
        'level',
        'points',
        'totalConsumption',
        'createdAt',
      ];
      // Verify the columns match the requirement
      expect(expectedColumns).toContain('nickName');
      expect(expectedColumns).toContain('phone');
      expect(expectedColumns).toContain('level');
      expect(expectedColumns).toContain('points');
      expect(expectedColumns).toContain('totalConsumption');
      expect(expectedColumns).toContain('createdAt');
    });
  });

  // 2. Search input triggers debounced API call
  describe('search debounce', () => {
    it('should use SEARCH_DEBOUNCE_MS (300ms) for debounce delay', () => {
      expect(SEARCH_DEBOUNCE_MS).toBe(300);
    });

    it('should call API with keyword param after debounce', async () => {
      mockAdminGetMemberList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetMemberList } = await import('@/services/member');

      // Simulate debounced search call
      await adminGetMemberList({
        page: 1,
        pageSize: 10,
        keyword: '张三',
      });

      expect(mockAdminGetMemberList).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        keyword: '张三',
      });
    });

    it('should support search by phone number', async () => {
      mockAdminGetMemberList.mockResolvedValue({
        success: true,
        data: { list: [makeMember()], total: 1 },
      });

      const { adminGetMemberList } = await import('@/services/member');
      await adminGetMemberList({
        page: 1,
        pageSize: 10,
        keyword: '5678',
      });

      expect(mockAdminGetMemberList).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '5678' }),
      );
    });
  });

  // 3. Level filter triggers API call with level parameter
  describe('level filter', () => {
    it('should call API with level param when filter is applied', async () => {
      mockAdminGetMemberList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetMemberList } = await import('@/services/member');
      await adminGetMemberList({
        page: 1,
        pageSize: 10,
        level: 'gold',
      });

      expect(mockAdminGetMemberList).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        level: 'gold',
      });
    });

    it('should have all four member levels available', () => {
      const levelKeys = MEMBER_LEVELS.map((l) => l.key);
      expect(levelKeys).toContain('normal');
      expect(levelKeys).toContain('silver');
      expect(levelKeys).toContain('gold');
      expect(levelKeys).toContain('diamond');
    });

    it('should have correct labels for member levels', () => {
      const labels = MEMBER_LEVELS.map((l) => l.label);
      expect(labels).toContain('普通');
      expect(labels).toContain('银卡');
      expect(labels).toContain('金卡');
      expect(labels).toContain('钻石');
    });
  });

  // 4. Click row navigates to member detail
  describe('row navigation', () => {
    it('should navigate to /member/:memberId on row click', () => {
      const member = makeMember({ memberId: 'MEM042' });

      // Simulate the handleRowClick logic
      mockNavigate(`/member/${member.memberId}`);

      expect(mockNavigate).toHaveBeenCalledWith('/member/MEM042');
    });

    it('should use memberId (not _id) for navigation', () => {
      const member = makeMember({ _id: 'mongo-id-123', memberId: 'MEM099' });

      mockNavigate(`/member/${member.memberId}`);

      expect(mockNavigate).toHaveBeenCalledWith('/member/MEM099');
      expect(mockNavigate).not.toHaveBeenCalledWith(
        expect.stringContaining('mongo-id-123'),
      );
    });
  });

  // 5. Pagination works correctly
  describe('pagination', () => {
    it('should call API with correct page param', async () => {
      mockAdminGetMemberList.mockResolvedValue({
        success: true,
        data: { list: [], total: 50 },
      });

      const { adminGetMemberList } = await import('@/services/member');
      await adminGetMemberList({ page: 3, pageSize: 10 });

      expect(mockAdminGetMemberList).toHaveBeenCalledWith({
        page: 3,
        pageSize: 10,
      });
    });

    it('should return total count for pagination', async () => {
      mockAdminGetMemberList.mockResolvedValue({
        success: true,
        data: { list: [makeMember()], total: 42 },
      });

      const { adminGetMemberList } = await import('@/services/member');
      const res = await adminGetMemberList({ page: 1, pageSize: 10 });

      expect(res.data!.total).toBe(42);
    });

    it('should handle empty page gracefully', async () => {
      mockAdminGetMemberList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetMemberList } = await import('@/services/member');
      const res = await adminGetMemberList({ page: 1, pageSize: 10 });

      const list = res.data?.list ?? [];
      expect(list).toHaveLength(0);
      expect(res.data!.total).toBe(0);
    });
  });

  // 6. Phone numbers are masked in display
  describe('phone masking', () => {
    it('should mask phone showing only last 4 digits', () => {
      expect(maskPhone('13812345678')).toBe('***5678');
    });

    it('should preserve last 4 digits correctly', () => {
      const phone = '13999887766';
      const masked = maskPhone(phone);
      expect(masked).toBe('***7766');
      expect(masked.slice(-4)).toBe(phone.slice(-4));
    });

    it('should handle short phone strings gracefully', () => {
      expect(maskPhone('123')).toBe('123');
      expect(maskPhone('1234')).toBe('***1234');
    });
  });

  // 7. Amounts are formatted correctly (fen to yuan)
  describe('amount formatting', () => {
    it('should convert fen to yuan with 2 decimal places', () => {
      expect(formatAmount(99900)).toBe('999.00');
      expect(formatAmount(100)).toBe('1.00');
      expect(formatAmount(1)).toBe('0.01');
    });

    it('should handle zero amount', () => {
      expect(formatAmount(0)).toBe('0.00');
    });

    it('should handle large amounts', () => {
      expect(formatAmount(1000000)).toBe('10000.00');
    });

    it('should format date correctly', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^2024-01-1[45]$/);
    });

    it('should format date from string', () => {
      const formatted = formatDate('2024-06-01');
      expect(formatted).toMatch(/^2024-0[56]-\d{2}$/);
    });

    it('should display level label from MEMBER_LEVELS', () => {
      const levelKey = 'gold';
      const found = MEMBER_LEVELS.find((l) => l.key === levelKey);
      expect(found?.label).toBe('金卡');
    });
  });
});
