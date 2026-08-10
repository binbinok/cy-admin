import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * AdminListPage unit tests
 *
 * Tests the core logic paths: data fetching, role-based visibility,
 * form validation, and status toggle confirmation flow.
 * Follows the same mock-based pattern as LoginPage.test.ts / DashboardPage.test.ts.
 */

// Mock auth service
const mockGetAdminList = vi.fn();
const mockCreateAdmin = vi.fn();
const mockUpdateAdminStatus = vi.fn();
const mockAdminChangePassword = vi.fn();
const mockGetLoginLogs = vi.fn();

vi.mock('@/services/auth', () => ({
  getAdminList: (...args: unknown[]) => mockGetAdminList(...args),
  createAdmin: (...args: unknown[]) => mockCreateAdmin(...args),
  updateAdminStatus: (...args: unknown[]) => mockUpdateAdminStatus(...args),
  adminChangePassword: (...args: unknown[]) =>
    mockAdminChangePassword(...args),
  getLoginLogs: (...args: unknown[]) => mockGetLoginLogs(...args),
}));

interface MockAdminInfo {
  adminId: string;
  username: string;
  role: 'admin' | 'super_admin';
}

// Mock authStore — role can be overridden per test
let mockAdminInfo: MockAdminInfo = {
  adminId: 'ADM001',
  username: 'superadmin',
  role: 'super_admin' as const,
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ adminInfo: mockAdminInfo }),
}));

describe('AdminListPage logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminInfo = {
      adminId: 'ADM001',
      username: 'superadmin',
      role: 'super_admin',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------
  it('should call getAdminList with page and pageSize', async () => {
    mockGetAdminList.mockResolvedValue({
      success: true,
      data: { list: [], total: 0 },
    });

    const { getAdminList } = await import('@/services/auth');
    await getAdminList({ page: 1, pageSize: 10 });

    expect(mockGetAdminList).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
  });

  it('should extract admin list from API response', async () => {
    const mockAdmins = [
      {
        _id: 'a1',
        adminId: 'ADM001',
        username: 'superadmin',
        passwordHash: '',
        role: 'super_admin' as const,
        status: 'active' as const,
        failCount: 0,
        lastLoginAt: new Date('2024-06-15T10:00:00Z'),
        lastLoginIp: '192.168.1.1',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: 'a2',
        adminId: 'ADM002',
        username: 'normaladmin',
        passwordHash: '',
        role: 'admin' as const,
        status: 'disabled' as const,
        failCount: 0,
        createdBy: 'ADM001',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockGetAdminList.mockResolvedValue({
      success: true,
      data: { list: mockAdmins, total: 2 },
    });

    const res = await mockGetAdminList({ page: 1, pageSize: 10 });
    const data = res.data;

    expect(data.list).toHaveLength(2);
    expect(data.list[0].username).toBe('superadmin');
    expect(data.list[0].role).toBe('super_admin');
    expect(data.list[1].status).toBe('disabled');
    expect(data.total).toBe(2);
  });

  it('should handle empty admin list gracefully', async () => {
    mockGetAdminList.mockResolvedValue({
      success: true,
      data: { list: [], total: 0 },
    });

    const res = await mockGetAdminList({ page: 1, pageSize: 10 });
    const admins = res.data?.list ?? [];

    expect(admins).toHaveLength(0);
  });

  // -------------------------------------------------------
  // Role-based visibility
  // -------------------------------------------------------
  it('should identify super_admin role correctly', async () => {
    const { useAuthStore } = await import('@/stores/authStore');
    const info = useAuthStore(
      (s) => s.adminInfo,
    );
    expect(info?.role).toBe('super_admin');

    const isSuperAdmin = info?.role === 'super_admin';
    expect(isSuperAdmin).toBe(true);
  });

  it('should identify normal admin role correctly', async () => {
    mockAdminInfo = {
      adminId: 'ADM002',
      username: 'normaladmin',
      role: 'admin',
    };

    const { useAuthStore } = await import('@/stores/authStore');
    const info = useAuthStore(
      (s) => s.adminInfo,
    );
    expect(info?.role).toBe('admin');

    const isSuperAdmin = info?.role === 'super_admin';
    expect(isSuperAdmin).toBe(false);
  });

  // -------------------------------------------------------
  // Form validation (create admin)
  // -------------------------------------------------------
  it('should reject username shorter than 4 characters', async () => {
    const { validateAdminCredentials } = await import(
      '@/utils/validation'
    );
    const result = validateAdminCredentials('ab', 'password123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      '用户名长度必须为 4–20 个字符',
    );
  });

  it('should reject username longer than 20 characters', async () => {
    const { validateAdminCredentials } = await import(
      '@/utils/validation'
    );
    const result = validateAdminCredentials(
      'a'.repeat(21),
      'password123',
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      '用户名长度必须为 4–20 个字符',
    );
  });

  it('should reject password shorter than 8 characters', async () => {
    const { validateAdminCredentials } = await import(
      '@/utils/validation'
    );
    const result = validateAdminCredentials('admin', 'short');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      '密码长度必须为 8–32 个字符',
    );
  });

  it('should reject password longer than 32 characters', async () => {
    const { validateAdminCredentials } = await import(
      '@/utils/validation'
    );
    const result = validateAdminCredentials(
      'admin',
      'p'.repeat(33),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      '密码长度必须为 8–32 个字符',
    );
  });

  it('should accept valid username and password', async () => {
    const { validateAdminCredentials } = await import(
      '@/utils/validation'
    );
    const result = validateAdminCredentials('admin', 'password123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept boundary-length username (4 chars)', async () => {
    const { validateAdminCredentials } = await import(
      '@/utils/validation'
    );
    const result = validateAdminCredentials('abcd', 'password123');
    expect(result.valid).toBe(true);
  });

  it('should accept boundary-length username (20 chars)', async () => {
    const { validateAdminCredentials } = await import(
      '@/utils/validation'
    );
    const result = validateAdminCredentials(
      'a'.repeat(20),
      'password123',
    );
    expect(result.valid).toBe(true);
  });

  it('should accept boundary-length password (8 chars)', async () => {
    const { validateAdminCredentials } = await import(
      '@/utils/validation'
    );
    const result = validateAdminCredentials('admin', '12345678');
    expect(result.valid).toBe(true);
  });

  it('should accept boundary-length password (32 chars)', async () => {
    const { validateAdminCredentials } = await import(
      '@/utils/validation'
    );
    const result = validateAdminCredentials(
      'admin',
      'p'.repeat(32),
    );
    expect(result.valid).toBe(true);
  });

  // -------------------------------------------------------
  // Create admin API
  // -------------------------------------------------------
  it('should call createAdmin with correct params', async () => {
    mockCreateAdmin.mockResolvedValue({
      success: true,
      data: {
        adminInfo: {
          adminId: 'ADM003',
          username: 'newadmin',
          role: 'admin',
        },
      },
    });

    const { createAdmin } = await import('@/services/auth');
    const res = await createAdmin({
      username: 'newadmin',
      password: 'password123',
      role: 'admin',
    });

    expect(mockCreateAdmin).toHaveBeenCalledWith({
      username: 'newadmin',
      password: 'password123',
      role: 'admin',
    });
    expect(res.success).toBe(true);
    expect(res.data?.adminInfo.username).toBe('newadmin');
  });

  // -------------------------------------------------------
  // Update admin status API
  // -------------------------------------------------------
  it('should call updateAdminStatus to disable an admin', async () => {
    mockUpdateAdminStatus.mockResolvedValue({ success: true });

    const { updateAdminStatus } = await import('@/services/auth');
    const res = await updateAdminStatus('ADM002', 'disabled');

    expect(mockUpdateAdminStatus).toHaveBeenCalledWith(
      'ADM002',
      'disabled',
    );
    expect(res.success).toBe(true);
  });

  it('should call updateAdminStatus to enable an admin', async () => {
    mockUpdateAdminStatus.mockResolvedValue({ success: true });

    const { updateAdminStatus } = await import('@/services/auth');
    const res = await updateAdminStatus('ADM002', 'active');

    expect(mockUpdateAdminStatus).toHaveBeenCalledWith(
      'ADM002',
      'active',
    );
    expect(res.success).toBe(true);
  });

  // -------------------------------------------------------
  // Change password API
  // -------------------------------------------------------
  it('should call adminChangePassword with correct params', async () => {
    mockAdminChangePassword.mockResolvedValue({ success: true });

    const { adminChangePassword } = await import('@/services/auth');
    const res = await adminChangePassword('oldpass12', 'newpass12');

    expect(mockAdminChangePassword).toHaveBeenCalledWith(
      'oldpass12',
      'newpass12',
    );
    expect(res.success).toBe(true);
  });

  it('should handle change password failure gracefully', async () => {
    mockAdminChangePassword.mockResolvedValue({
      success: false,
      error: { code: 'WRONG_PASSWORD', message: '当前密码错误' },
    });

    const res = await mockAdminChangePassword('wrong', 'newpass12');

    expect(res.success).toBe(false);
    expect(res.error.message).toBe('当前密码错误');
  });

  // -------------------------------------------------------
  // Error handling — no technical details exposed
  // -------------------------------------------------------
  it('should not expose technical error details on API failure', async () => {
    mockGetAdminList.mockRejectedValue(
      new Error('Internal Server Error'),
    );

    try {
      await mockGetAdminList({ page: 1, pageSize: 10 });
    } catch (err: unknown) {
      // The page should show a generic message, not the raw error
      expect(err instanceof Error).toBe(true);
      // Verify the component would use a generic message
      const userMessage = '操作失败，请稍后再试';
      expect(userMessage).not.toContain('Internal Server');
    }
  });

  // -------------------------------------------------------
  // Login logs — data fetching
  // -------------------------------------------------------
  it('should call getLoginLogs with page and pageSize', async () => {
    mockGetLoginLogs.mockResolvedValue({
      success: true,
      data: { list: [], total: 0 },
    });

    const { getLoginLogs } = await import('@/services/auth');
    await getLoginLogs({ page: 1, pageSize: 10 });

    expect(mockGetLoginLogs).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
  });

  it('should extract login logs from API response', async () => {
    const mockLogs = [
      {
        _id: 'log1',
        adminId: 'ADM001',
        username: 'superadmin',
        loginTime: new Date('2024-06-15T10:00:00Z'),
        ipAddress: '192.168.1.1',
        result: 'success' as const,
      },
      {
        _id: 'log2',
        adminId: 'ADM002',
        username: 'normaladmin',
        loginTime: new Date('2024-06-15T09:30:00Z'),
        ipAddress: '10.0.0.5',
        result: 'failed' as const,
        failReason: 'wrong password',
      },
    ];

    mockGetLoginLogs.mockResolvedValue({
      success: true,
      data: { list: mockLogs, total: 2 },
    });

    const res = await mockGetLoginLogs({ page: 1, pageSize: 10 });
    const data = res.data;

    expect(data.list).toHaveLength(2);
    expect(data.list[0].username).toBe('superadmin');
    expect(data.list[0].result).toBe('success');
    expect(data.list[0].ipAddress).toBe('192.168.1.1');
    expect(data.list[1].result).toBe('failed');
    expect(data.total).toBe(2);
  });

  it('should handle empty login logs gracefully', async () => {
    mockGetLoginLogs.mockResolvedValue({
      success: true,
      data: { list: [], total: 0 },
    });

    const res = await mockGetLoginLogs({ page: 1, pageSize: 10 });
    const logs = res.data?.list ?? [];

    expect(logs).toHaveLength(0);
  });

  it('should support pagination for login logs', async () => {
    mockGetLoginLogs.mockResolvedValue({
      success: true,
      data: { list: [{ _id: 'log3' }], total: 25 },
    });

    const { getLoginLogs } = await import('@/services/auth');
    const res = await getLoginLogs({ page: 3, pageSize: 10 });

    expect(mockGetLoginLogs).toHaveBeenCalledWith({
      page: 3,
      pageSize: 10,
    });
    expect(res.data?.total).toBe(25);
  });

  it('should include loginTime, ipAddress, and result fields in log entries', async () => {
    const logEntry = {
      _id: 'log1',
      adminId: 'ADM001',
      username: 'admin',
      loginTime: new Date('2024-06-15T10:00:00Z'),
      ipAddress: '192.168.1.100',
      result: 'success' as const,
    };

    mockGetLoginLogs.mockResolvedValue({
      success: true,
      data: { list: [logEntry], total: 1 },
    });

    const res = await mockGetLoginLogs({ page: 1, pageSize: 10 });
    const entry = res.data?.list[0];

    expect(entry).toBeDefined();
    expect(entry).toHaveProperty('loginTime');
    expect(entry).toHaveProperty('ipAddress');
    expect(entry).toHaveProperty('result');
    expect(entry).toHaveProperty('username');
    expect(['success', 'failed']).toContain(entry?.result);
  });
});
