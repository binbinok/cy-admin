import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  adminLogin,
  adminLogout,
  adminChangePassword,
  getAdminList,
  createAdmin,
  updateAdminStatus,
  getLoginLogs,
} from '@/services/auth';
import http from '@/services/http';

vi.mock('@/services/http', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Suppress zustand/sessionStorage warnings in test env
vi.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ clearAuth: vi.fn() }) },
}));

const mockPost = vi.mocked(http.post);

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminLogin', () => {
    it('should POST to /invoke/adminLogin with credentials', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'jwt-token',
            adminInfo: { adminId: 'ADM001', username: 'admin', role: 'super_admin' as const },
          },
        },
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await adminLogin('admin', 'password123');

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminLogin', {
        username: 'admin',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      expect(result.data?.token).toBe('jwt-token');
    });
  });

  describe('adminLogout', () => {
    it('should POST to /invoke/adminLogout', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminLogout();

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminLogout');
      expect(result.success).toBe(true);
    });
  });

  describe('adminChangePassword', () => {
    it('should POST to /invoke/adminChangePassword with passwords', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminChangePassword('oldPass', 'newPass123');

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminChangePassword', {
        currentPassword: 'oldPass',
        newPassword: 'newPass123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getAdminList', () => {
    it('should POST to /invoke/getAdminList with pagination params', async () => {
      const mockData = {
        data: {
          success: true,
          data: { list: [], total: 0 },
        },
      };
      mockPost.mockResolvedValue(mockData);

      const result = await getAdminList({ page: 1, pageSize: 10 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/getAdminList', {
        page: 1,
        pageSize: 10,
      });
      expect(result.data?.list).toEqual([]);
      expect(result.data?.total).toBe(0);
    });
  });

  describe('createAdmin', () => {
    it('should POST to /invoke/createAdmin with admin data', async () => {
      const adminData = { username: 'newadmin', password: 'pass1234', role: 'admin' };
      mockPost.mockResolvedValue({
        data: {
          success: true,
          data: { adminInfo: { adminId: 'ADM002', username: 'newadmin' } },
        },
      });

      const result = await createAdmin(adminData);

      expect(mockPost).toHaveBeenCalledWith('/invoke/createAdmin', adminData);
      expect(result.success).toBe(true);
    });
  });

  describe('updateAdminStatus', () => {
    it('should POST to /invoke/updateAdminStatus with adminId and status', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await updateAdminStatus('ADM002', 'disabled');

      expect(mockPost).toHaveBeenCalledWith('/invoke/updateAdminStatus', {
        adminId: 'ADM002',
        status: 'disabled',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getLoginLogs', () => {
    it('should POST to /invoke/getLoginLogs with pagination params', async () => {
      mockPost.mockResolvedValue({
        data: {
          success: true,
          data: { list: [], total: 0 },
        },
      });

      const result = await getLoginLogs({ page: 1, pageSize: 20 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/getLoginLogs', {
        page: 1,
        pageSize: 20,
      });
      expect(result.data?.list).toEqual([]);
    });
  });
});
