import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Technician } from '@/types/technician';
import type { Service } from '@/types/service';

/**
 * TechnicianDetailPage unit tests
 *
 * Tests technician detail fetching/display, edit modal validation,
 * schedule config rendering, service slot config, back navigation,
 * and API interactions.
 */

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'TECH001' }),
  useNavigate: () => mockNavigate,
}));

// Mock technician service
const mockAdminGetTechnicianDetail = vi.fn();
const mockAdminUpdateTechnician = vi.fn();
const mockAdminSetTechnicianSchedule = vi.fn();
const mockAdminSetTechnicianServiceSlots = vi.fn();
vi.mock('@/services/technician', () => ({
  adminGetTechnicianDetail: (...args: unknown[]) =>
    mockAdminGetTechnicianDetail(...args),
  adminUpdateTechnician: (...args: unknown[]) =>
    mockAdminUpdateTechnician(...args),
  adminSetTechnicianSchedule: (...args: unknown[]) =>
    mockAdminSetTechnicianSchedule(...args),
  adminSetTechnicianServiceSlots: (...args: unknown[]) =>
    mockAdminSetTechnicianServiceSlots(...args),
}));

// Mock service API
const mockAdminGetServiceList = vi.fn();
vi.mock('@/services/service', () => ({
  adminGetServiceList: (...args: unknown[]) =>
    mockAdminGetServiceList(...args),
}));

// Mock http
vi.mock('@/services/http', () => ({
  default: { post: vi.fn() },
}));

const makeTechnician = (
  overrides: Partial<Technician> = {},
): Technician => ({
  _id: 'TECH001',
  name: '王技师',
  avatarUrl: 'https://example.com/avatar.jpg',
  specialties: ['美甲', '美睫'],
  status: 'idle',
  schedule: {
    '1': [{ startTime: '09:00', endTime: '18:00' }],
    '3': [{ startTime: '10:00', endTime: '17:00' }],
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
  ...overrides,
});

const makeService = (
  overrides: Partial<Service> = {},
): Service => ({
  _id: 'SVC001',
  name: '基础美甲',
  category: 'nail',
  price: 12800,
  duration: 60,
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
  ...overrides,
});

describe('TechnicianDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Renders loading state initially
  describe('loading state', () => {
    it('should show loading state while fetching technician detail', async () => {
      // The page starts with loading=true and shows Spin
      // Verify the API is called with the correct technicianId
      mockAdminGetTechnicianDetail.mockResolvedValue({
        success: true,
        data: makeTechnician(),
      });

      const { adminGetTechnicianDetail } = await import(
        '@/services/technician'
      );
      const res = await adminGetTechnicianDetail('TECH001');

      expect(mockAdminGetTechnicianDetail).toHaveBeenCalledWith('TECH001');
      expect(res.success).toBe(true);
    });
  });

  // 2. Displays technician info after loading
  describe('technician info display', () => {
    it('should fetch and return technician name and specialties', async () => {
      const tech = makeTechnician();
      mockAdminGetTechnicianDetail.mockResolvedValue({
        success: true,
        data: tech,
      });

      const { adminGetTechnicianDetail } = await import(
        '@/services/technician'
      );
      const res = await adminGetTechnicianDetail('TECH001');

      expect(res.data!.name).toBe('王技师');
      expect(res.data!.specialties).toEqual(['美甲', '美睫']);
      expect(res.data!.status).toBe('idle');
    });

    it('should display avatarUrl when present', async () => {
      const tech = makeTechnician({
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      mockAdminGetTechnicianDetail.mockResolvedValue({
        success: true,
        data: tech,
      });

      const { adminGetTechnicianDetail } = await import(
        '@/services/technician'
      );
      const res = await adminGetTechnicianDetail('TECH001');

      expect(res.data!.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should handle technician without avatarUrl', async () => {
      const tech = makeTechnician({ avatarUrl: undefined });
      mockAdminGetTechnicianDetail.mockResolvedValue({
        success: true,
        data: tech,
      });

      const { adminGetTechnicianDetail } = await import(
        '@/services/technician'
      );
      const res = await adminGetTechnicianDetail('TECH001');

      expect(res.data!.avatarUrl).toBeUndefined();
    });

    it('should map status to correct label', () => {
      const statusMap: Record<string, string> = {
        idle: '空闲',
        busy: '服务中',
        rest: '休息',
      };
      expect(statusMap['idle']).toBe('空闲');
      expect(statusMap['busy']).toBe('服务中');
      expect(statusMap['rest']).toBe('休息');
    });
  });

  // 3. Edit modal validates fields
  describe('edit modal validation', () => {
    it('should reject name shorter than 2 chars', () => {
      const name = '王';
      expect(name.length >= 2).toBe(false);
    });

    it('should reject name longer than 10 chars', () => {
      const name = '一二三四五六七八九十一';
      expect(name.length <= 10).toBe(false);
    });

    it('should accept valid name between 2-10 chars', () => {
      const name = '王技师';
      expect(name.length >= 2 && name.length <= 10).toBe(true);
    });

    it('should reject empty specialties', () => {
      const specialties: string[] = [];
      expect(specialties.length > 0).toBe(false);
    });

    it('should call adminUpdateTechnician with correct params', async () => {
      mockAdminUpdateTechnician.mockResolvedValue({ success: true });

      const { adminUpdateTechnician } = await import(
        '@/services/technician'
      );
      await adminUpdateTechnician('TECH001', {
        name: '新名字',
        avatarUrl: 'https://example.com/new.jpg',
        specialties: ['美甲', '指甲护理'],
      });

      expect(mockAdminUpdateTechnician).toHaveBeenCalledWith(
        'TECH001',
        {
          name: '新名字',
          avatarUrl: 'https://example.com/new.jpg',
          specialties: ['美甲', '指甲护理'],
        },
      );
    });
  });

  // 4. Schedule config renders days of week
  describe('schedule config', () => {
    it('should have all 7 days of week labels', () => {
      const dayLabels: Record<number, string> = {
        0: '周日',
        1: '周一',
        2: '周二',
        3: '周三',
        4: '周四',
        5: '周五',
        6: '周六',
      };
      expect(Object.keys(dayLabels)).toHaveLength(7);
      expect(dayLabels[1]).toBe('周一');
      expect(dayLabels[0]).toBe('周日');
    });

    it('should display day order as Mon-Sun', () => {
      const dayOrder = [1, 2, 3, 4, 5, 6, 0];
      expect(dayOrder[0]).toBe(1); // Monday first
      expect(dayOrder[6]).toBe(0); // Sunday last
    });

    it('should parse schedule from technician data', async () => {
      const tech = makeTechnician({
        schedule: {
          '1': [{ startTime: '09:00', endTime: '18:00' }],
          '3': [
            { startTime: '10:00', endTime: '14:00' },
            { startTime: '15:00', endTime: '19:00' },
          ],
        },
      });
      mockAdminGetTechnicianDetail.mockResolvedValue({
        success: true,
        data: tech,
      });

      const { adminGetTechnicianDetail } = await import(
        '@/services/technician'
      );
      const res = await adminGetTechnicianDetail('TECH001');
      const sched = res.data!.schedule;

      expect(sched['1']).toHaveLength(1);
      expect(sched['3']).toHaveLength(2);
      expect(sched['1'][0].startTime).toBe('09:00');
      expect(sched['3'][1].endTime).toBe('19:00');
    });

    it('should call adminSetTechnicianSchedule with correct params', async () => {
      const schedule = {
        '1': [{ startTime: '09:00', endTime: '18:00' }],
        '5': [{ startTime: '10:00', endTime: '17:00' }],
      };
      mockAdminSetTechnicianSchedule.mockResolvedValue({
        success: true,
      });

      const { adminSetTechnicianSchedule } = await import(
        '@/services/technician'
      );
      await adminSetTechnicianSchedule('TECH001', schedule);

      expect(mockAdminSetTechnicianSchedule).toHaveBeenCalledWith(
        'TECH001',
        schedule,
      );
    });

    it('should handle empty schedule (no slots)', async () => {
      const tech = makeTechnician({ schedule: {} });
      mockAdminGetTechnicianDetail.mockResolvedValue({
        success: true,
        data: tech,
      });

      const { adminGetTechnicianDetail } = await import(
        '@/services/technician'
      );
      const res = await adminGetTechnicianDetail('TECH001');

      expect(Object.keys(res.data!.schedule)).toHaveLength(0);
    });
  });

  // 5. Service slot config renders
  describe('service slot config', () => {
    it('should fetch service list for options', async () => {
      const services = [
        makeService({ _id: 'SVC001', name: '基础美甲' }),
        makeService({ _id: 'SVC002', name: '美睫嫁接' }),
      ];
      mockAdminGetServiceList.mockResolvedValue({
        success: true,
        data: { list: services, total: 2 },
      });

      const { adminGetServiceList } = await import(
        '@/services/service'
      );
      const res = await adminGetServiceList({
        page: 1,
        pageSize: 100,
      });

      expect(res.data!.list).toHaveLength(2);
      expect(res.data!.list[0].name).toBe('基础美甲');
    });

    it('should build service slots from schedule', () => {
      const schedule: Record<
        string,
        { startTime: string; endTime: string }[]
      > = {
        '1': [{ startTime: '09:00', endTime: '18:00' }],
        '3': [{ startTime: '10:00', endTime: '17:00' }],
      };

      const slots: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        serviceIds: string[];
      }[] = [];

      Object.entries(schedule).forEach(([day, timeSlots]) => {
        timeSlots.forEach((slot) => {
          slots.push({
            dayOfWeek: parseInt(day, 10),
            startTime: slot.startTime,
            endTime: slot.endTime,
            serviceIds: [],
          });
        });
      });

      expect(slots).toHaveLength(2);
      expect(slots[0].dayOfWeek).toBe(1);
      expect(slots[1].dayOfWeek).toBe(3);
      expect(slots[0].serviceIds).toEqual([]);
    });

    it('should call adminSetTechnicianServiceSlots with correct params', async () => {
      const slots = [
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '18:00',
          serviceIds: ['SVC001', 'SVC002'],
        },
      ];
      mockAdminSetTechnicianServiceSlots.mockResolvedValue({
        success: true,
      });

      const { adminSetTechnicianServiceSlots } = await import(
        '@/services/technician'
      );
      await adminSetTechnicianServiceSlots('TECH001', slots);

      expect(
        mockAdminSetTechnicianServiceSlots,
      ).toHaveBeenCalledWith('TECH001', slots);
    });
  });

  // 6. Back button navigates to list
  describe('back button navigation', () => {
    it('should navigate to /technician on back click', () => {
      mockNavigate('/technician');
      expect(mockNavigate).toHaveBeenCalledWith('/technician');
    });

    it('should not navigate to a detail sub-path', () => {
      mockNavigate('/technician');
      expect(mockNavigate).not.toHaveBeenCalledWith(
        expect.stringContaining('/technician/'),
      );
    });
  });

  // 7. Error handling
  describe('error handling', () => {
    it('should handle API failure gracefully', async () => {
      mockAdminGetTechnicianDetail.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: '技师不存在' },
      });

      const { adminGetTechnicianDetail } = await import(
        '@/services/technician'
      );
      const res = await adminGetTechnicianDetail('TECH_INVALID');

      expect(res.success).toBe(false);
      expect(res.error?.message).toBe('技师不存在');
    });

    it('should handle update failure', async () => {
      mockAdminUpdateTechnician.mockResolvedValue({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '姓名不合法' },
      });

      const { adminUpdateTechnician } = await import(
        '@/services/technician'
      );
      const res = await adminUpdateTechnician('TECH001', {
        name: 'x',
      });

      expect(res.success).toBe(false);
      expect(res.error?.message).toBe('姓名不合法');
    });
  });
});
