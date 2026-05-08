import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import http, { isBusinessError } from '@/services/http';
import { useAuthStore } from '@/stores/authStore';

describe('http service', () => {
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
    // Mock window.location
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

  describe('callFunction request', () => {
    it('should inject authorization context when token exists', async () => {
      localStorage.setItem('admin_token', 'test-jwt-token');
      callFunctionMock.mockResolvedValue({
        result: { success: true, data: {} },
      });
      await http.post('/invoke/adminLogin', { username: 'u' });
      expect(callFunctionMock).toHaveBeenCalledWith({
        name: 'adminLogin',
        data: {
          username: 'u',
          adminId: 'admin-1',
          token: 'test-jwt-token',
          authorization: 'Bearer test-jwt-token',
        },
      });
    });
    it('should call function without token context when no token', async () => {
      callFunctionMock.mockResolvedValue({
        result: { success: true, data: {} },
      });
      await http.post('/invoke/adminLogin', { username: 'u' });
      expect(callFunctionMock).toHaveBeenCalledWith({
        name: 'adminLogin',
        data: {
          username: 'u',
          adminId: 'admin-1',
        },
      });
    });
    it('should reject invalid invoke path', async () => {
      await expect(http.post('/test', {})).rejects.toThrow(
        '仅支持 /invoke/{函数名} 调用格式',
      );
    });
  });

  describe('response handling', () => {
    it('should pass through successful responses', async () => {
      const mockData = { success: true, data: { id: '1', name: 'test' } };
      callFunctionMock.mockResolvedValue({
        result: mockData,
      });
      const response = await http.post('/invoke/getAdminList', {});
      expect(response.data).toEqual(mockData);
    });
    it('should reject business errors from function result', async () => {
      const mockData = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '输入验证失败' },
      };
      callFunctionMock.mockResolvedValue({
        result: mockData,
      });
      await expect(http.post('/invoke/getAdminList', {})).rejects.toThrow(
        '输入验证失败',
      );
    });
    it('should clear auth and redirect on UNAUTHORIZED', async () => {
      callFunctionMock.mockResolvedValue({
        result: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: '未授权' },
        },
      });
      await expect(http.post('/invoke/getAdminList', {})).rejects.toThrow(
        '登录已过期，请重新登录',
      );
      const { clearAuth } = useAuthStore.getState();
      expect(clearAuth).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });
    it('should show permission denied message on FORBIDDEN', async () => {
      callFunctionMock.mockResolvedValue({
        result: {
          success: false,
          error: { code: 'FORBIDDEN', message: '权限不足' },
        },
      });
      await expect(http.post('/invoke/getAdminList', {})).rejects.toThrow(
        '权限不足，请联系超级管理员',
      );
    });
    it('should show network error for non-Error throw', async () => {
      callFunctionMock.mockRejectedValue('NETWORK_ERROR');
      await expect(http.post('/invoke/getAdminList', {})).rejects.toThrow(
        '网络异常，请稍后重试',
      );
    });
    it('should pass through Error throw from sdk', async () => {
      callFunctionMock.mockRejectedValue(new Error('SDK 错误'));
      await expect(http.post('/invoke/getAdminList', {})).rejects.toThrow('SDK 错误');
    });
  });

  describe('isBusinessError', () => {
    it('should return true for business errors', () => {
      const error = new Error('test') as unknown as Record<string, unknown>;
      error.code = 'TEST_ERROR';
      error.isBusinessError = true;
      expect(isBusinessError(error)).toBe(true);
    });

    it('should return false for regular errors', () => {
      expect(isBusinessError(new Error('test'))).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isBusinessError('string')).toBe(false);
      expect(isBusinessError(null)).toBe(false);
      expect(isBusinessError(undefined)).toBe(false);
    });
  });
});
