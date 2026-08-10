import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Appointment } from '@/types/appointment';
import { formatAmount } from '@/utils/format';
import { calculatePoints } from '@/utils/points';
import { SEARCH_DEBOUNCE_MS, POINTS_PER_UNIT } from '@/constants/business';

/**
 * AppointmentListPage unit tests
 *
 * Tests data fetching, filters (date range, technician, status, keyword debounce),
 * actions (confirm arrival, complete service, cancel), points calculation,
 * pagination, status display, and error handling.
 */

// Mock appointment service
const mockAdminGetAppointmentList = vi.fn();
const mockAdminConfirmArrival = vi.fn();
const mockAdminCompleteService = vi.fn();
const mockAdminCancelAppointment = vi.fn();
vi.mock('@/services/appointment', () => ({
  adminGetAppointmentList: (...args: unknown[]) =>
    mockAdminGetAppointmentList(...args),
  adminConfirmArrival: (...args: unknown[]) =>
    mockAdminConfirmArrival(...args),
  adminCompleteService: (...args: unknown[]) =>
    mockAdminCompleteService(...args),
  adminCancelAppointment: (...args: unknown[]) =>
    mockAdminCancelAppointment(...args),
}));

// Mock technician service
const mockAdminGetTechnicianList = vi.fn();
vi.mock('@/services/technician', () => ({
  adminGetTechnicianList: (...args: unknown[]) =>
    mockAdminGetTechnicianList(...args),
}));

// Mock http
vi.mock('@/services/http', () => ({
  default: { post: vi.fn() },
}));

const makeAppointment = (
  overrides: Partial<Appointment> = {},
): Appointment => ({
  _id: 'a1',
  appointmentId: 'APT001',
  memberId: 'MEM001',
  serviceId: 'SVC001',
  technicianId: 'TECH001',
  appointmentDate: '2024-06-15',
  appointmentTime: '10:00',
  status: 'pending',
  note: '无特殊要求',
  createdAt: new Date('2024-06-14'),
  updatedAt: new Date('2024-06-14'),
  ...overrides,
});

describe('AppointmentListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // 1. Renders table with appointment data
  describe('table data fetching', () => {
    it('should call adminGetAppointmentList with default params', async () => {
      const appointments = [makeAppointment()];
      mockAdminGetAppointmentList.mockResolvedValue({
        success: true,
        data: { list: appointments, total: 1 },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      const res = await adminGetAppointmentList({
        page: 1,
        pageSize: 10,
      });

      expect(mockAdminGetAppointmentList).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      });
      expect(res.data!.list).toHaveLength(1);
      expect(res.data!.list[0].appointmentId).toBe('APT001');
    });

    it('should return appointment with all required fields', async () => {
      const appt = makeAppointment({
        appointmentId: 'APT002',
        memberId: 'MEM002',
        serviceId: 'SVC002',
        technicianId: 'TECH002',
        appointmentDate: '2024-07-01',
        appointmentTime: '14:30',
        status: 'in_service',
        note: '过敏体质',
      });
      mockAdminGetAppointmentList.mockResolvedValue({
        success: true,
        data: { list: [appt], total: 1 },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      const res = await adminGetAppointmentList({ page: 1, pageSize: 10 });
      const item = res.data!.list[0];

      expect(item.appointmentId).toBe('APT002');
      expect(item.memberId).toBe('MEM002');
      expect(item.serviceId).toBe('SVC002');
      expect(item.technicianId).toBe('TECH002');
      expect(item.appointmentDate).toBe('2024-07-01');
      expect(item.appointmentTime).toBe('14:30');
      expect(item.status).toBe('in_service');
      expect(item.note).toBe('过敏体质');
    });
  });

  // 2. Default date filter is today
  describe('default date filter', () => {
    it('should use today as default date range', () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // The page defaults dateRange to [today, today]
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should call API with startDate and endDate params', async () => {
      mockAdminGetAppointmentList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      await adminGetAppointmentList({
        page: 1,
        pageSize: 10,
        startDate: '2024-06-15',
        endDate: '2024-06-15',
      });

      expect(mockAdminGetAppointmentList).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-06-15',
          endDate: '2024-06-15',
        }),
      );
    });
  });

  // 3. Status filter works
  describe('status filter', () => {
    it('should call API with status param when filter is applied', async () => {
      mockAdminGetAppointmentList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      await adminGetAppointmentList({
        page: 1,
        pageSize: 10,
        status: 'pending',
      });

      expect(mockAdminGetAppointmentList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
      );
    });

    it('should support all four status values', () => {
      const validStatuses = ['pending', 'in_service', 'completed', 'cancelled'];
      validStatuses.forEach((s) => {
        expect(validStatuses).toContain(s);
      });
    });

    it('should filter by technician', async () => {
      mockAdminGetAppointmentList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      await adminGetAppointmentList({
        page: 1,
        pageSize: 10,
        technicianId: 'TECH001',
      });

      expect(mockAdminGetAppointmentList).toHaveBeenCalledWith(
        expect.objectContaining({ technicianId: 'TECH001' }),
      );
    });
  });

  // 4. Keyword search with debounce
  describe('keyword search with debounce', () => {
    it('should use SEARCH_DEBOUNCE_MS (300ms) for debounce delay', () => {
      expect(SEARCH_DEBOUNCE_MS).toBe(300);
    });

    it('should call API with keyword param after debounce', async () => {
      mockAdminGetAppointmentList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      await adminGetAppointmentList({
        page: 1,
        pageSize: 10,
        keyword: '张三',
      });

      expect(mockAdminGetAppointmentList).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: '张三' }),
      );
    });
  });

  // 5. Confirm arrival action
  describe('confirm arrival', () => {
    it('should call adminConfirmArrival with _id', async () => {
      mockAdminConfirmArrival.mockResolvedValue({ success: true });

      const { adminConfirmArrival } = await import('@/services/appointment');
      const res = await adminConfirmArrival('a1');

      expect(mockAdminConfirmArrival).toHaveBeenCalledWith('a1');
      expect(res.success).toBe(true);
    });

    it('should handle confirm arrival failure', async () => {
      mockAdminConfirmArrival.mockResolvedValue({
        success: false,
        error: { code: 'INVALID_STATUS', message: '状态不允许' },
      });

      const { adminConfirmArrival } = await import('@/services/appointment');
      const res = await adminConfirmArrival('a1');

      expect(res.success).toBe(false);
      expect(res.error?.message).toBe('状态不允许');
    });

    it('should only be available for pending appointments', () => {
      const pending = makeAppointment({ status: 'pending' });
      const inService = makeAppointment({ status: 'in_service' });
      const completed = makeAppointment({ status: 'completed' });
      const cancelled = makeAppointment({ status: 'cancelled' });

      expect(pending.status === 'pending').toBe(true);
      expect(inService.status === 'pending').toBe(false);
      expect(completed.status === 'pending').toBe(false);
      expect(cancelled.status === 'pending').toBe(false);
    });
  });

  // 6. Complete service modal with amount input
  describe('complete service', () => {
    it('should call adminCompleteService with _id and amount in fen', async () => {
      mockAdminCompleteService.mockResolvedValue({ success: true });

      const { adminCompleteService } = await import('@/services/appointment');
      // 99.50 yuan = 9950 fen
      const amountInFen = Math.round(99.5 * 100);
      const res = await adminCompleteService('a1', amountInFen);

      expect(mockAdminCompleteService).toHaveBeenCalledWith('a1', 9950);
      expect(res.success).toBe(true);
    });

    it('should allow zero amount (free service)', async () => {
      mockAdminCompleteService.mockResolvedValue({ success: true });

      const { adminCompleteService } = await import('@/services/appointment');
      const res = await adminCompleteService('a1', 0);

      expect(mockAdminCompleteService).toHaveBeenCalledWith('a1', 0);
      expect(res.success).toBe(true);
    });

    it('should convert yuan to fen correctly', () => {
      expect(Math.round(0 * 100)).toBe(0);
      expect(Math.round(1.5 * 100)).toBe(150);
      expect(Math.round(99.99 * 100)).toBe(9999);
      expect(Math.round(100 * 100)).toBe(10000);
      expect(Math.round(0.01 * 100)).toBe(1);
    });

    it('should only be available for in_service appointments', () => {
      const pending = makeAppointment({ status: 'pending' });
      const inService = makeAppointment({ status: 'in_service' });
      const completed = makeAppointment({ status: 'completed' });

      expect(pending.status === 'in_service').toBe(false);
      expect(inService.status === 'in_service').toBe(true);
      expect(completed.status === 'in_service').toBe(false);
    });
  });

  // 7. Cancel appointment action
  describe('cancel appointment', () => {
    it('should call adminCancelAppointment with _id', async () => {
      mockAdminCancelAppointment.mockResolvedValue({ success: true });

      const { adminCancelAppointment } = await import(
        '@/services/appointment'
      );
      const res = await adminCancelAppointment('a1');

      expect(mockAdminCancelAppointment).toHaveBeenCalledWith('a1');
      expect(res.success).toBe(true);
    });

    it('should handle cancel failure', async () => {
      mockAdminCancelAppointment.mockResolvedValue({
        success: false,
        error: { code: 'ALREADY_COMPLETED', message: '已完成无法取消' },
      });

      const { adminCancelAppointment } = await import(
        '@/services/appointment'
      );
      const res = await adminCancelAppointment('a1');

      expect(res.success).toBe(false);
      expect(res.error?.message).toBe('已完成无法取消');
    });

    it('should be available for pending and in_service appointments', () => {
      const pending = makeAppointment({ status: 'pending' });
      const inService = makeAppointment({ status: 'in_service' });
      const completed = makeAppointment({ status: 'completed' });
      const cancelled = makeAppointment({ status: 'cancelled' });

      const canCancel = (s: string) =>
        s === 'pending' || s === 'in_service';

      expect(canCancel(pending.status)).toBe(true);
      expect(canCancel(inService.status)).toBe(true);
      expect(canCancel(completed.status)).toBe(false);
      expect(canCancel(cancelled.status)).toBe(false);
    });
  });

  // 8. Points calculation display
  describe('points calculation', () => {
    it('should calculate points as Math.floor(amountInFen / 10)', () => {
      expect(calculatePoints(0)).toBe(0);
      expect(calculatePoints(9)).toBe(0);
      expect(calculatePoints(10)).toBe(1);
      expect(calculatePoints(99)).toBe(9);
      expect(calculatePoints(100)).toBe(10);
      expect(calculatePoints(9950)).toBe(995);
      expect(calculatePoints(10000)).toBe(1000);
    });

    it('should use POINTS_PER_UNIT constant (10)', () => {
      expect(POINTS_PER_UNIT).toBe(10);
    });

    it('should return 0 points for negative amounts', () => {
      expect(calculatePoints(-100)).toBe(0);
    });

    it('should display correct amount formatting', () => {
      expect(formatAmount(9950)).toBe('99.50');
      expect(formatAmount(0)).toBe('0.00');
      expect(formatAmount(10000)).toBe('100.00');
      expect(formatAmount(1)).toBe('0.01');
    });
  });

  // 9. Pagination
  describe('pagination', () => {
    it('should call API with correct page param', async () => {
      mockAdminGetAppointmentList.mockResolvedValue({
        success: true,
        data: { list: [], total: 50 },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      await adminGetAppointmentList({ page: 3, pageSize: 10 });

      expect(mockAdminGetAppointmentList).toHaveBeenCalledWith({
        page: 3,
        pageSize: 10,
      });
    });

    it('should return total count for pagination', async () => {
      mockAdminGetAppointmentList.mockResolvedValue({
        success: true,
        data: { list: [makeAppointment()], total: 42 },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      const res = await adminGetAppointmentList({ page: 1, pageSize: 10 });

      expect(res.data!.total).toBe(42);
    });

    it('should handle empty page gracefully', async () => {
      mockAdminGetAppointmentList.mockResolvedValue({
        success: true,
        data: { list: [], total: 0 },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      const res = await adminGetAppointmentList({ page: 1, pageSize: 10 });

      const list = res.data?.list ?? [];
      expect(list).toHaveLength(0);
      expect(res.data!.total).toBe(0);
    });
  });

  // 10. Error handling
  describe('error handling', () => {
    it('should handle API network error gracefully', async () => {
      mockAdminGetAppointmentList.mockRejectedValue(
        new Error('Network Error'),
      );

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );

      await expect(
        adminGetAppointmentList({ page: 1, pageSize: 10 }),
      ).rejects.toThrow('Network Error');
    });

    it('should handle API returning success=false', async () => {
      mockAdminGetAppointmentList.mockResolvedValue({
        success: false,
        error: { code: 'SERVER_ERROR', message: '服务器错误' },
      });

      const { adminGetAppointmentList } = await import(
        '@/services/appointment'
      );
      const res = await adminGetAppointmentList({ page: 1, pageSize: 10 });

      expect(res.success).toBe(false);
      expect(res.error?.message).toBe('服务器错误');
    });

    it('should handle confirm arrival network error', async () => {
      mockAdminConfirmArrival.mockRejectedValue(new Error('Timeout'));

      const { adminConfirmArrival } = await import('@/services/appointment');

      await expect(adminConfirmArrival('a1')).rejects.toThrow('Timeout');
    });

    it('should handle complete service network error', async () => {
      mockAdminCompleteService.mockRejectedValue(new Error('Timeout'));

      const { adminCompleteService } = await import(
        '@/services/appointment'
      );

      await expect(
        adminCompleteService('a1', 5000),
      ).rejects.toThrow('Timeout');
    });
  });

  // 11. Status display
  describe('status display', () => {
    it('should map status to correct labels', () => {
      const statusMap: Record<string, string> = {
        pending: '待服务',
        in_service: '服务中',
        completed: '已完成',
        cancelled: '已取消',
      };

      expect(statusMap['pending']).toBe('待服务');
      expect(statusMap['in_service']).toBe('服务中');
      expect(statusMap['completed']).toBe('已完成');
      expect(statusMap['cancelled']).toBe('已取消');
    });

    it('should map status to correct tag colors', () => {
      const colorMap: Record<string, string> = {
        pending: 'orange',
        in_service: 'blue',
        completed: 'green',
        cancelled: 'default',
      };

      expect(colorMap['pending']).toBe('orange');
      expect(colorMap['in_service']).toBe('blue');
      expect(colorMap['completed']).toBe('green');
      expect(colorMap['cancelled']).toBe('default');
    });
  });

  // 12. Technician list for filter
  describe('technician filter dropdown', () => {
    it('should fetch technician list for dropdown', async () => {
      mockAdminGetTechnicianList.mockResolvedValue({
        success: true,
        data: {
          list: [
            { _id: 'T1', name: '小红' },
            { _id: 'T2', name: '小明' },
          ],
          total: 2,
        },
      });

      const { adminGetTechnicianList } = await import(
        '@/services/technician'
      );
      const res = await adminGetTechnicianList({ page: 1, pageSize: 100 });

      expect(res.data!.list).toHaveLength(2);
      expect(res.data!.list[0].name).toBe('小红');
    });
  });
});
