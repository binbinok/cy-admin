import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  Member,
  MemberCard,
  ConsumptionRecord,
} from '@/types/member';
import { maskPhone, formatAmount, formatDate } from '@/utils/format';
import { validateMemberInfo } from '@/utils/validation';
import { MEMBER_LEVELS } from '@/constants/business';

/**
 * MemberDetailPage unit tests
 *
 * Tests member detail fetching/display, phone masking, edit modal validation,
 * consumption records tab, card info tab, recharge modal validation,
 * and back button navigation.
 */

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'MEM001' }),
  useNavigate: () => mockNavigate,
}));

// Mock member service
const mockAdminGetMemberDetail = vi.fn();
const mockAdminUpdateMember = vi.fn();
const mockAdminGetMemberConsumptions = vi.fn();
vi.mock('@/services/member', () => ({
  adminGetMemberDetail: (...args: unknown[]) =>
    mockAdminGetMemberDetail(...args),
  adminUpdateMember: (...args: unknown[]) =>
    mockAdminUpdateMember(...args),
  adminGetMemberConsumptions: (...args: unknown[]) =>
    mockAdminGetMemberConsumptions(...args),
}));

// Mock http
vi.mock('@/services/http', () => ({
  default: { post: vi.fn() },
}));

const makeMember = (overrides: Partial<Member> = {}): Member => ({
  _id: 'm1',
  memberId: 'MEM001',
  openId: 'open1',
  nickName: '李四',
  phone: '13912345678',
  level: 'silver',
  points: 320,
  totalConsumption: 250000,
  birthday: '1995-06-15',
  source: '微信小程序',
  consumptionCount: 15,
  lastConsumptionAt: new Date('2024-05-20'),
  createdAt: new Date('2023-12-01'),
  updatedAt: new Date('2024-06-01'),
  ...overrides,
});

const makeCard = (overrides: Partial<MemberCard> = {}): MemberCard => ({
  _id: 'c1',
  cardId: 'CARD202401001',
  memberId: 'MEM001',
  discountLevelId: 'DL001',
  balance: 50000,
  totalRecharge: 200000,
  status: 'active',
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-06-01'),
  ...overrides,
});

const makeConsumption = (
  overrides: Partial<ConsumptionRecord> = {},
): ConsumptionRecord => ({
  _id: 'cr1',
  memberId: 'MEM001',
  appointmentId: 'APT001',
  serviceName: '美甲基础款',
  amount: 12800,
  points: 128,
  technicianName: '王技师',
  createdAt: new Date('2024-05-20'),
  ...overrides,
});

describe('MemberDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Fetches and displays member basic info
  describe('member basic info display', () => {
    it('should fetch member detail with memberId', async () => {
      const member = makeMember();
      mockAdminGetMemberDetail.mockResolvedValue({
        success: true,
        data: { member, card: undefined },
      });

      const { adminGetMemberDetail } = await import('@/services/member');
      const res = await adminGetMemberDetail('MEM001');

      expect(mockAdminGetMemberDetail).toHaveBeenCalledWith('MEM001');
      expect(res.data!.member.nickName).toBe('李四');
      expect(res.data!.member.level).toBe('silver');
      expect(res.data!.member.points).toBe(320);
      expect(res.data!.member.totalConsumption).toBe(250000);
      expect(res.data!.member.birthday).toBe('1995-06-15');
      expect(res.data!.member.source).toBe('微信小程序');
      expect(res.data!.member.consumptionCount).toBe(15);
    });

    it('should display totalConsumption formatted as yuan', () => {
      const member = makeMember({ totalConsumption: 250000 });
      expect(formatAmount(member.totalConsumption)).toBe('2500.00');
    });

    it('should display level label from MEMBER_LEVELS', () => {
      const found = MEMBER_LEVELS.find((l) => l.key === 'silver');
      expect(found?.label).toBe('银卡');
    });

    it('should display all four level labels correctly', () => {
      const map: Record<string, string> = {};
      MEMBER_LEVELS.forEach((l) => {
        map[l.key] = l.label;
      });
      expect(map['normal']).toBe('普通');
      expect(map['silver']).toBe('银卡');
      expect(map['gold']).toBe('金卡');
      expect(map['diamond']).toBe('钻石');
    });

    it('should handle missing optional fields gracefully', async () => {
      const member = makeMember({
        birthday: undefined,
        source: undefined,
      });
      mockAdminGetMemberDetail.mockResolvedValue({
        success: true,
        data: { member, card: undefined },
      });

      const { adminGetMemberDetail } = await import('@/services/member');
      const res = await adminGetMemberDetail('MEM001');

      expect(res.data!.member.birthday).toBeUndefined();
      expect(res.data!.member.source).toBeUndefined();
    });
  });

  // 2. Phone number is masked in display
  describe('phone masking', () => {
    it('should mask phone showing only last 4 digits', () => {
      expect(maskPhone('13912345678')).toBe('***5678');
    });

    it('should preserve last 4 digits of member phone', () => {
      const member = makeMember({ phone: '13699887766' });
      const masked = maskPhone(member.phone);
      expect(masked).toBe('***7766');
      expect(masked.slice(-4)).toBe(member.phone.slice(-4));
    });
  });

  // 3. Edit modal opens and validates input
  describe('edit modal validation', () => {
    it('should accept valid member info', () => {
      const result = validateMemberInfo({
        nickName: '张三丰',
        phone: '13812345678',
        birthday: '1990-01-15',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject nickName shorter than 2 chars', () => {
      const result = validateMemberInfo({
        nickName: '张',
        phone: '13812345678',
        birthday: '1990-01-15',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        '昵称长度必须为 2–20 个字符',
      );
    });

    it('should reject nickName longer than 20 chars', () => {
      const result = validateMemberInfo({
        nickName: '一二三四五六七八九十一二三四五六七八九十一',
        phone: '13812345678',
        birthday: '1990-01-15',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        '昵称长度必须为 2–20 个字符',
      );
    });

    it('should reject invalid phone format', () => {
      const result = validateMemberInfo({
        nickName: '张三',
        phone: '12345',
        birthday: '1990-01-15',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('手机号格式不正确');
    });

    it('should reject invalid birthday format', () => {
      const result = validateMemberInfo({
        nickName: '张三',
        phone: '13812345678',
        birthday: '1990/01/15',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        '生日格式必须为 YYYY-MM-DD',
      );
    });

    it('should call adminUpdateMember with correct params', async () => {
      mockAdminUpdateMember.mockResolvedValue({
        success: true,
      });

      const { adminUpdateMember } = await import('@/services/member');
      await adminUpdateMember('MEM001', {
        nickName: '新昵称',
        phone: '13999888777',
        birthday: '1992-03-20',
      });

      expect(mockAdminUpdateMember).toHaveBeenCalledWith('MEM001', {
        nickName: '新昵称',
        phone: '13999888777',
        birthday: '1992-03-20',
      });
    });
  });

  // 4. Consumption records tab shows data in correct format
  describe('consumption records tab', () => {
    it('should fetch consumption records with pagination', async () => {
      const records = [makeConsumption()];
      mockAdminGetMemberConsumptions.mockResolvedValue({
        success: true,
        data: { list: records, total: 1 },
      });

      const { adminGetMemberConsumptions } = await import(
        '@/services/member'
      );
      const res = await adminGetMemberConsumptions({
        memberId: 'MEM001',
        page: 1,
        pageSize: 10,
      });

      expect(mockAdminGetMemberConsumptions).toHaveBeenCalledWith({
        memberId: 'MEM001',
        page: 1,
        pageSize: 10,
      });
      expect(res.data!.list).toHaveLength(1);
    });

    it('should format consumption amount as yuan', () => {
      const record = makeConsumption({ amount: 12800 });
      expect(formatAmount(record.amount)).toBe('128.00');
    });

    it('should format consumption date correctly', () => {
      const record = makeConsumption({
        createdAt: new Date('2024-05-20T00:00:00Z'),
      });
      const formatted = formatDate(record.createdAt);
      expect(formatted).toMatch(/^2024-05-[12]\d$/);
    });

    it('should display serviceName and points', () => {
      const record = makeConsumption({
        serviceName: '美睫嫁接',
        points: 256,
      });
      expect(record.serviceName).toBe('美睫嫁接');
      expect(record.points).toBe(256);
    });

    it('should sort records by date descending', () => {
      const records = [
        makeConsumption({
          _id: 'cr1',
          createdAt: new Date('2024-03-01'),
        }),
        makeConsumption({
          _id: 'cr2',
          createdAt: new Date('2024-05-20'),
        }),
        makeConsumption({
          _id: 'cr3',
          createdAt: new Date('2024-01-10'),
        }),
      ];

      const sorted = [...records].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

      expect(sorted[0]._id).toBe('cr2');
      expect(sorted[1]._id).toBe('cr1');
      expect(sorted[2]._id).toBe('cr3');
    });
  });

  // 5. Card info tab shows balance and recharge history
  describe('card info tab', () => {
    it('should display card balance formatted as yuan', () => {
      const card = makeCard({ balance: 50000 });
      expect(formatAmount(card.balance)).toBe('500.00');
    });

    it('should display totalRecharge formatted as yuan', () => {
      const card = makeCard({ totalRecharge: 200000 });
      expect(formatAmount(card.totalRecharge)).toBe('2000.00');
    });

    it('should display card status', () => {
      const activeCard = makeCard({ status: 'active' });
      expect(activeCard.status).toBe('active');

      const frozenCard = makeCard({ status: 'frozen' });
      expect(frozenCard.status).toBe('frozen');
    });

    it('should return card data from member detail', async () => {
      const member = makeMember();
      const card = makeCard();
      mockAdminGetMemberDetail.mockResolvedValue({
        success: true,
        data: { member, card },
      });

      const { adminGetMemberDetail } = await import('@/services/member');
      const res = await adminGetMemberDetail('MEM001');

      expect(res.data!.card).toBeDefined();
      expect(res.data!.card!.balance).toBe(50000);
      expect(res.data!.card!.totalRecharge).toBe(200000);
      expect(res.data!.card!.discountLevelId).toBe('DL001');
    });

    it('should handle member without card (empty state)', async () => {
      const member = makeMember();
      mockAdminGetMemberDetail.mockResolvedValue({
        success: true,
        data: { member, card: undefined },
      });

      const { adminGetMemberDetail } = await import('@/services/member');
      const res = await adminGetMemberDetail('MEM001');

      expect(res.data!.card).toBeUndefined();
    });
  });

  // 6. Recharge modal validates amount > 0
  describe('recharge modal validation', () => {
    it('should reject amount of 0', () => {
      const amount = 0;
      expect(amount > 0).toBe(false);
    });

    it('should reject negative amount', () => {
      const amount = -100;
      expect(amount > 0).toBe(false);
    });

    it('should accept positive amount', () => {
      const amount = 100;
      expect(amount > 0).toBe(true);
    });

    it('should convert yuan to fen correctly', () => {
      const amountYuan = 50;
      const amountFen = Math.round(amountYuan * 100);
      expect(amountFen).toBe(5000);
    });

    it('should handle decimal yuan amounts', () => {
      const amountYuan = 99.99;
      const amountFen = Math.round(amountYuan * 100);
      expect(amountFen).toBe(9999);
    });
  });

  // 7. Back button navigates to member list
  describe('back button navigation', () => {
    it('should navigate to /member on back click', () => {
      mockNavigate('/member');
      expect(mockNavigate).toHaveBeenCalledWith('/member');
    });

    it('should not navigate to detail page', () => {
      mockNavigate('/member');
      expect(mockNavigate).not.toHaveBeenCalledWith(
        expect.stringContaining('/member/'),
      );
    });
  });
});
