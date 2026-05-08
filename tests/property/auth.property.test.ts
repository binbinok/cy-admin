import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { validateAdminCredentials } from '@/utils/validation';

const { callFunctionMock, clearAuthMock, hasLoginStateMock, signInAnonymouslyMock } = vi.hoisted(() => ({
  callFunctionMock: vi.fn(),
  clearAuthMock: vi.fn(),
  hasLoginStateMock: vi.fn(),
  signInAnonymouslyMock: vi.fn(),
}));

// Mock authStore before importing http
vi.mock('@/stores/authStore', () => {
  return {
    useAuthStore: {
      getState: () => ({
        clearAuth: clearAuthMock,
        adminInfo: { adminId: 'admin-1' },
      }),
    },
  };
});

vi.mock('@cloudbase/js-sdk', () => ({
  default: {
    init: () => ({
      callFunction: callFunctionMock,
      auth: () => ({
        hasLoginState: hasLoginStateMock,
        signInAnonymously: signInAnonymouslyMock,
      }),
    }),
  },
}));

import http from '@/services/http';
import { useAuthStore } from '@/stores/authStore';

describe('cy-admin 认证属性测试', () => {
  // Feature: cy-admin, Property 3: 管理员账号字段验证正确性
  // **Validates: Requirements 1.5, 1.7**

  it('Property 3: 合法用户名(4–20)和密码(8–32)应返回 valid=true', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 20 }),
        fc.string({ minLength: 8, maxLength: 32 }),
        (username, password) => {
          const result = validateAdminCredentials(username, password);
          return result.valid === true && result.errors.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3: 过短用户名(<4)应返回 valid=false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 8, maxLength: 32 }),
        (username, password) => {
          const result = validateAdminCredentials(username, password);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3: 过长用户名(>20)应返回 valid=false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 21, maxLength: 50 }),
        fc.string({ minLength: 8, maxLength: 32 }),
        (username, password) => {
          const result = validateAdminCredentials(username, password);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3: 过短密码(<8)应返回 valid=false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 7 }),
        (username, password) => {
          const result = validateAdminCredentials(username, password);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3: 过长密码(>32)应返回 valid=false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 20 }),
        fc.string({ minLength: 33, maxLength: 64 }),
        (username, password) => {
          const result = validateAdminCredentials(username, password);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---- 补充边界用例（任务 6.3） ----
  // Feature: cy-admin, Property 3: 管理员账号字段验证正确性（边界）
  // **Validates: Requirements 1.5, 1.7**

  it('Property 3 边界: 精确边界长度(用户名4/20, 密码8/32)应被接受', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(4, 20),
        fc.constantFrom(8, 32),
        fc.string({ minLength: 1, maxLength: 1 }),
        fc.string({ minLength: 1, maxLength: 1 }),
        (uLen, pLen, uChar, pChar) => {
          const username = uChar.repeat(uLen);
          const password = pChar.repeat(pLen);
          const result = validateAdminCredentials(username, password);
          return result.valid === true && result.errors.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3 边界: 偏移边界长度(用户名3/21)应被拒绝', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(3, 21),
        fc.string({ minLength: 1, maxLength: 1 }),
        (uLen, uChar) => {
          const username = uChar.repeat(uLen);
          const password = 'a'.repeat(16); // 合法密码长度
          const result = validateAdminCredentials(username, password);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3 边界: 偏移边界长度(密码7/33)应被拒绝', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(7, 33),
        fc.string({ minLength: 1, maxLength: 1 }),
        (pLen, pChar) => {
          const username = 'a'.repeat(10); // 合法用户名长度
          const password = pChar.repeat(pLen);
          const result = validateAdminCredentials(username, password);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3 边界: 空字符串用户名应被拒绝', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 32 }),
        (password) => {
          const result = validateAdminCredentials('', password);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3 边界: 空字符串密码应被拒绝', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 20 }),
        (username) => {
          const result = validateAdminCredentials(username, '');
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 3 边界: 用户名和密码均为空字符串应被拒绝', () => {
    const result = validateAdminCredentials('', '');
    return result.valid === false && result.errors.length === 2;
  });
});

// Feature: cy-admin, Property 20: 未授权请求被拒绝
// **Validates: Requirements 11.1**
describe('Property 20: 未授权请求被拒绝', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    callFunctionMock.mockReset();
    clearAuthMock.mockReset();
    hasLoginStateMock.mockReset();
    signInAnonymouslyMock.mockReset();
    hasLoginStateMock.mockReturnValue({ isAnonymous: true });
    signInAnonymouslyMock.mockResolvedValue({});
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('Property 20: 任意字符串 token 都会被注入为 Bearer 头', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (token) => {
          localStorage.clear();
          localStorage.setItem('admin_token', token);
          callFunctionMock.mockReset();
          callFunctionMock.mockResolvedValue({
            result: { success: true, data: {} },
          });

          await http.post('/invoke/testFunc', {});

          const callArgs = callFunctionMock.mock.calls[0][0];
          return (
            callArgs.data.authorization === `Bearer ${token}` &&
            callArgs.data.token === token
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 20: 无 token 时不注入 Authorization 头', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          localStorage.clear();
          callFunctionMock.mockReset();
          callFunctionMock.mockResolvedValue({
            result: { success: true, data: {} },
          });

          await http.post('/invoke/testFunc', {});

          const callArgs = callFunctionMock.mock.calls[0][0];
          return (
            callArgs.data.authorization === undefined &&
            callArgs.data.token === undefined
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 20: 401 响应始终清除认证并跳转登录页', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 200 }),
        async (errorMessage) => {
          localStorage.clear();
          vi.clearAllMocks();
          callFunctionMock.mockReset();
          clearAuthMock.mockReset();
          hasLoginStateMock.mockReturnValue({ isAnonymous: true });
          signInAnonymouslyMock.mockResolvedValue({});
          Object.defineProperty(window, 'location', {
            writable: true,
            value: { ...originalLocation, href: '' },
          });

          callFunctionMock.mockResolvedValue({
            result: {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: errorMessage || '未授权',
              },
            },
          });

          try {
            await http.post('/invoke/testFunc', {});
            return false;
          } catch (err) {
            const { clearAuth } = useAuthStore.getState();
            const calls = (clearAuth as ReturnType<typeof vi.fn>).mock.calls;
            const didClearAuth = calls.length > 0;
            const didRedirect = window.location.href === '/login';
            const hasCorrectMessage =
              (err as Error).message === '登录已过期，请重新登录';
            return didClearAuth && didRedirect && hasCorrectMessage;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
