import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import type { LoginResponse } from '@/types/auth';

// Helper to create a fake JWT token with payload
function createFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const sig = btoa('fake-signature');
  return `${header}.${body}.${sig}`;
}

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store to initial state
    useAuthStore.setState({
      adminInfo: null,
      token: null,
      isAuthenticated: false,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    useAuthStore.getState().stopInactivityTimer();
    vi.useRealTimers();
  });

  const mockLoginResponse: LoginResponse = {
    token: createFakeJwt({
      adminId: 'ADM001',
      username: 'admin',
      role: 'super_admin',
      exp: Math.floor(Date.now() / 1000) + 7200,
    }),
    adminInfo: {
      adminId: 'ADM001',
      username: 'admin',
      role: 'super_admin',
    },
  };

  describe('login', () => {
    it('should set adminInfo, token, and isAuthenticated on login', () => {
      useAuthStore.getState().login(mockLoginResponse);

      const state = useAuthStore.getState();
      expect(state.adminInfo).toEqual(mockLoginResponse.adminInfo);
      expect(state.token).toBe(mockLoginResponse.token);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should store token in localStorage', () => {
      useAuthStore.getState().login(mockLoginResponse);

      expect(localStorage.getItem('admin_token')).toBe(
        mockLoginResponse.token,
      );
    });

    it('should store adminInfo in localStorage', () => {
      useAuthStore.getState().login(mockLoginResponse);

      const stored = localStorage.getItem('admin_info');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(mockLoginResponse.adminInfo);
    });
  });

  describe('logout', () => {
    it('should clear all auth state on logout', () => {
      useAuthStore.getState().login(mockLoginResponse);
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.adminInfo).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should remove token from localStorage', () => {
      useAuthStore.getState().login(mockLoginResponse);
      useAuthStore.getState().logout();

      expect(localStorage.getItem('admin_token')).toBeNull();
    });

    it('should remove adminInfo from localStorage', () => {
      useAuthStore.getState().login(mockLoginResponse);
      useAuthStore.getState().logout();

      expect(localStorage.getItem('admin_info')).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth state without API call', () => {
      useAuthStore.getState().login(mockLoginResponse);
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.adminInfo).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should remove token and adminInfo from localStorage', () => {
      useAuthStore.getState().login(mockLoginResponse);
      useAuthStore.getState().clearAuth();

      expect(localStorage.getItem('admin_token')).toBeNull();
      expect(localStorage.getItem('admin_info')).toBeNull();
    });
  });

  describe('inactivity timer', () => {
    it('should auto-clear auth after 2 hours of inactivity', () => {
      useAuthStore.getState().login(mockLoginResponse);

      // Advance time by 2 hours
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.adminInfo).toBeNull();
    });

    it('should not clear auth before 2 hours', () => {
      useAuthStore.getState().login(mockLoginResponse);

      // Advance time by 1 hour 59 minutes
      vi.advanceTimersByTime(2 * 60 * 60 * 1000 - 1000);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('rehydrate', () => {
    it('should restore auth state from localStorage with adminInfo', () => {
      const token = createFakeJwt({
        adminId: 'ADM002',
        username: 'manager',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 7200,
      });
      const adminInfo = {
        adminId: 'ADM002',
        username: 'manager',
        role: 'admin' as const,
      };
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_info', JSON.stringify(adminInfo));

      useAuthStore.getState().rehydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(token);
      expect(state.adminInfo).toEqual(adminInfo);
    });

    it('should fallback to JWT payload when adminInfo not in localStorage', () => {
      const token = createFakeJwt({
        adminId: 'ADM003',
        username: 'staff',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 7200,
      });
      localStorage.setItem('admin_token', token);
      // No admin_info in localStorage

      useAuthStore.getState().rehydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(token);
      expect(state.adminInfo).toEqual({
        adminId: 'ADM003',
        username: 'staff',
        role: 'admin',
      });
    });

    it('should clear localStorage and not restore if token is expired', () => {
      const token = createFakeJwt({
        adminId: 'ADM002',
        username: 'manager',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) - 100, // expired
      });
      localStorage.setItem('admin_token', token);
      localStorage.setItem(
        'admin_info',
        JSON.stringify({ adminId: 'ADM002', username: 'manager', role: 'admin' }),
      );

      useAuthStore.getState().rehydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('admin_token')).toBeNull();
      expect(localStorage.getItem('admin_info')).toBeNull();
    });

    it('should clear localStorage if token is invalid', () => {
      localStorage.setItem('admin_token', 'invalid-token');

      useAuthStore.getState().rehydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('admin_token')).toBeNull();
      expect(localStorage.getItem('admin_info')).toBeNull();
    });

    it('should do nothing if no token in localStorage', () => {
      useAuthStore.getState().rehydrate();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.adminInfo).toBeNull();
    });
  });
});
