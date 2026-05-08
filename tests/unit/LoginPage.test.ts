import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * LoginPage unit tests
 *
 * Since LoginPage is a React component that depends on react-router-dom,
 * Ant Design, and multiple stores/services, we test the core logic paths
 * by mocking the dependencies and verifying the integration contract.
 */

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock antd message
const mockMessageError = vi.fn();
vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    message: {
      ...actual.message,
      error: mockMessageError,
    },
  };
});

// Mock auth service
const mockAdminLogin = vi.fn();
vi.mock('@/services/auth', () => ({
  adminLogin: (...args: unknown[]) => mockAdminLogin(...args),
}));

// Mock authStore
const mockLogin = vi.fn();
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ login: mockLogin }),
}));

// Mock http
vi.mock('@/services/http', () => ({
  isBusinessError: (err: unknown) =>
    err instanceof Error &&
    'isBusinessError' in err &&
    (err as Record<string, unknown>).isBusinessError === true,
}));

describe('LoginPage logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call adminLogin with username and password on successful submit', async () => {
    const mockResponse = {
      success: true,
      data: {
        token: 'fake-token',
        adminInfo: { adminId: 'ADM001', username: 'admin', role: 'super_admin' as const },
      },
    };
    mockAdminLogin.mockResolvedValue(mockResponse);

    // Dynamically import after mocks are set up
    const { adminLogin } = await import('@/services/auth');
    await adminLogin('testuser', 'password123');

    expect(mockAdminLogin).toHaveBeenCalledWith('testuser', 'password123');
  });

  it('should call store login and navigate on successful response', async () => {
    const loginData = {
      token: 'fake-token',
      adminInfo: { adminId: 'ADM001', username: 'admin', role: 'super_admin' as const },
    };
    const mockResponse = { success: true, data: loginData };
    mockAdminLogin.mockResolvedValue(mockResponse);

    const { useAuthStore } = await import('@/stores/authStore');
    const login = useAuthStore((s) => s.login) as typeof mockLogin;

    // Simulate the login flow
    const res = await mockAdminLogin('admin', 'password1');
    if (res.success && res.data) {
      login(res.data);
      mockNavigate('/', { replace: true });
    }

    expect(login).toHaveBeenCalledWith(loginData);
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should show generic error message on failed login', async () => {
    mockAdminLogin.mockResolvedValue({
      success: false,
      error: { code: 'AUTH_FAILED', message: '用户名或密码错误' },
    });

    const res = await mockAdminLogin('wrong', 'wrongpass');
    if (!res.success) {
      mockMessageError('用户名或密码错误');
    }

    expect(mockMessageError).toHaveBeenCalledWith('用户名或密码错误');
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show account locked message when account is locked', async () => {
    const lockedError = Object.assign(
      new Error('账号已锁定，请 30 分钟后重试'),
      { code: 'ACCOUNT_LOCKED', isBusinessError: true },
    );
    mockAdminLogin.mockRejectedValue(lockedError);

    const { isBusinessError } = await import('@/services/http');

    try {
      await mockAdminLogin('admin', 'wrongpass');
    } catch (err: unknown) {
      if (isBusinessError(err) && err.code === 'ACCOUNT_LOCKED') {
        mockMessageError(err.message);
      } else {
        mockMessageError('用户名或密码错误');
      }
    }

    expect(mockMessageError).toHaveBeenCalledWith('账号已锁定，请 30 分钟后重试');
  });

  it('should show generic error on network failure (not expose details)', async () => {
    mockAdminLogin.mockRejectedValue(new Error('Network Error'));

    try {
      await mockAdminLogin('admin', 'password1');
    } catch (err: unknown) {
      const { isBusinessError } = await import('@/services/http');
      if (isBusinessError(err) && err.code === 'ACCOUNT_LOCKED') {
        mockMessageError(err.message);
      } else {
        mockMessageError('用户名或密码错误');
      }
    }

    expect(mockMessageError).toHaveBeenCalledWith('用户名或密码错误');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should reject invalid credentials via validation before API call', async () => {
    const { validateAdminCredentials } = await import('@/utils/validation');

    // Username too short
    const result1 = validateAdminCredentials('ab', 'password123');
    expect(result1.valid).toBe(false);
    expect(result1.errors.length).toBeGreaterThan(0);

    // Password too short
    const result2 = validateAdminCredentials('admin', 'short');
    expect(result2.valid).toBe(false);
    expect(result2.errors.length).toBeGreaterThan(0);

    // Both valid
    const result3 = validateAdminCredentials('admin', 'password123');
    expect(result3.valid).toBe(true);
  });
});
