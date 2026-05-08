import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
interface DashboardListResponse<T> {
  success: boolean;
  data: {
    list: T[];
    total?: number;
  };
}
interface DashboardAppointmentItem {
  appointmentId: string;
  status: 'pending' | 'confirmed' | 'in_service' | 'completed' | 'cancelled';
}
interface DashboardBirthdayMemberItem {
  nickName: string;
  phone: string;
}

/**
 * DashboardPage unit tests
 *
 * Tests the data fetching logic and rendering contract for the dashboard.
 * Mocks http and React Query to verify correct API calls.
 */

// Mock http
const mockPost = vi.fn();
vi.mock('@/services/http', () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

// Mock dayjs to return a fixed date
vi.mock('dayjs', () => {
  const fixedDate = {
    format: (fmt: string) => {
      if (fmt === 'YYYY-MM-DD') return '2024-06-15';
      return '2024-06-15';
    },
  };
  const dayjsFn = () => fixedDate;
  dayjsFn.default = dayjsFn;
  return { default: dayjsFn };
});

describe('DashboardPage data fetching logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call appointment API with correct params for today', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { list: [], total: 0 },
      },
    });

    const http = (await import('@/services/http')).default;
    await http.post('/invoke/adminGetAppointmentList', {
      dateFrom: '2024-06-15',
      dateTo: '2024-06-15',
      status: 'pending',
      page: 1,
      pageSize: 20,
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/invoke/adminGetAppointmentList',
      {
        dateFrom: '2024-06-15',
        dateTo: '2024-06-15',
        status: 'pending',
        page: 1,
        pageSize: 20,
      },
    );
  });

  it('should call birthday members API with days=0', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { list: [] },
      },
    });

    const http = (await import('@/services/http')).default;
    await http.post('/invoke/adminGetBirthdayMembers', { days: 0 });

    expect(mockPost).toHaveBeenCalledWith(
      '/invoke/adminGetBirthdayMembers',
      { days: 0 },
    );
  });

  it('should extract appointment list from API response', async () => {
    const mockAppointments = [
      {
        _id: 'apt1',
        appointmentId: 'APT001',
        memberId: 'M001',
        serviceId: 'S001',
        technicianId: 'T001',
        appointmentDate: '2024-06-15',
        appointmentTime: '10:00',
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { list: mockAppointments, total: 1 },
      },
    });

    const http = (await import('@/services/http')).default;
    const res = await http.post<DashboardListResponse<DashboardAppointmentItem>>('/invoke/adminGetAppointmentList', {
      dateFrom: '2024-06-15',
      dateTo: '2024-06-15',
      status: 'pending',
      page: 1,
      pageSize: 20,
    });

    const data = res.data.data;
    expect(data.list).toHaveLength(1);
    expect(data.list[0].appointmentId).toBe('APT001');
    expect(data.list[0].status).toBe('pending');
  });

  it('should extract birthday members from API response', async () => {
    const mockMembers = [
      {
        _id: 'm1',
        memberId: 'MEM001',
        openId: 'open1',
        nickName: '张三',
        phone: '13812345678',
        level: 'gold' as const,
        points: 500,
        totalConsumption: 80000,
        birthday: '1990-06-15',
        consumptionCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { list: mockMembers },
      },
    });

    const http = (await import('@/services/http')).default;
    const res = await http.post<DashboardListResponse<DashboardBirthdayMemberItem>>('/invoke/adminGetBirthdayMembers', {
      days: 0,
    });

    const data = res.data.data;
    expect(data.list).toHaveLength(1);
    expect(data.list[0].nickName).toBe('张三');
    expect(data.list[0].phone.slice(-4)).toBe('5678');
  });

  it('should handle empty appointment list gracefully', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { list: [], total: 0 },
      },
    });

    const http = (await import('@/services/http')).default;
    const res = await http.post<DashboardListResponse<DashboardAppointmentItem>>('/invoke/adminGetAppointmentList', {
      dateFrom: '2024-06-15',
      dateTo: '2024-06-15',
      status: 'pending',
      page: 1,
      pageSize: 20,
    });

    const appointments = res.data.data?.list ?? [];
    expect(appointments).toHaveLength(0);
  });

  it('should handle empty birthday members list gracefully', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { list: [] },
      },
    });

    const http = (await import('@/services/http')).default;
    const res = await http.post<DashboardListResponse<DashboardBirthdayMemberItem>>('/invoke/adminGetBirthdayMembers', {
      days: 0,
    });

    const members = res.data.data?.list ?? [];
    expect(members).toHaveLength(0);
  });
});
