import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  adminGetMemberList,
  adminCreateMember,
  adminGetMemberDetail,
  adminUpdateMember,
  adminGetMemberConsumptions,
  adminGetBirthdayMembers,
  adminGetDormantMembers,
  adminSendBirthdayNotification,
} from '@/services/member';
import http from '@/services/http';

vi.mock('@/services/http', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ clearAuth: vi.fn() }) },
}));

const mockPost = vi.mocked(http.post);

describe('member service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminGetMemberList', () => {
    it('should POST to /invoke/adminGetMemberList with params', async () => {
      const mockData = {
        data: { success: true, data: { list: [], total: 0 } },
      };
      mockPost.mockResolvedValue(mockData);

      const result = await adminGetMemberList({ page: 1, pageSize: 10 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetMemberList', {
        page: 1,
        pageSize: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data?.list).toEqual([]);
      expect(result.data?.total).toBe(0);
    });

    it('should pass keyword and level filters', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { list: [], total: 0 } },
      });

      await adminGetMemberList({ page: 1, pageSize: 10, keyword: '张', level: 'gold' });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetMemberList', {
        page: 1,
        pageSize: 10,
        keyword: '张',
        level: 'gold',
      });
    });
  });

  describe('adminGetMemberDetail', () => {
    it('should POST to /invoke/adminGetMemberDetail with memberId', async () => {
      const mockMember = {
        _id: '1',
        memberId: 'M001',
        openId: 'ox001',
        nickName: '测试用户',
        phone: '13800138000',
        level: 'normal' as const,
        points: 100,
        totalConsumption: 50000,
        consumptionCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPost.mockResolvedValue({
        data: { success: true, data: { member: mockMember } },
      });

      const result = await adminGetMemberDetail('M001');

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetMemberDetail', {
        memberId: 'M001',
      });
      expect(result.success).toBe(true);
      expect(result.data?.member.memberId).toBe('M001');
    });
    it('should return birthday field from member detail response', async () => {
      mockPost.mockResolvedValue({
        data: {
          success: true,
          data: {
            member: {
              _id: '1',
              memberId: 'M001',
              openId: 'ox001',
              nickName: '测试用户',
              phone: '13800138000',
              level: 'normal',
              points: 100,
              totalConsumption: 50000,
              consumptionCount: 5,
              birthday: '1992-03-18',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        },
      });
      const result = await adminGetMemberDetail('M001');
      expect(result.success).toBe(true);
      expect(result.data?.member.birthday).toBe('1992-03-18');
    });
  });

  describe('adminUpdateMember', () => {
    it('should POST to /invoke/adminUpdateMember with memberId and data', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminUpdateMember('M001', { nickName: '新昵称' });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateMember', {
        memberId: 'M001',
        nickName: '新昵称',
      });
      expect(result.success).toBe(true);
    });
    it('should persist birthday when updating member info', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      const result = await adminUpdateMember('M001', {
        nickName: '新昵称',
        birthday: '1990-06-15',
      });
      expect(mockPost).toHaveBeenCalledWith('/invoke/adminUpdateMember', {
        memberId: 'M001',
        nickName: '新昵称',
        birthday: '1990-06-15',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adminGetMemberConsumptions', () => {
    it('should POST to /invoke/adminGetMemberConsumptions with params', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { list: [], total: 0 } },
      });

      const result = await adminGetMemberConsumptions({
        memberId: 'M001',
        page: 1,
        pageSize: 10,
      });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetMemberConsumptions', {
        memberId: 'M001',
        page: 1,
        pageSize: 10,
      });
      expect(result.data?.list).toEqual([]);
    });
  });

  describe('adminGetBirthdayMembers', () => {
    it('should POST to /invoke/adminGetBirthdayMembers with days param', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { list: [], total: 0 } },
      });

      const result = await adminGetBirthdayMembers({ days: 7, page: 1, pageSize: 10 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetBirthdayMembers', {
        days: 7,
        page: 1,
        pageSize: 10,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adminGetDormantMembers', () => {
    it('should POST to /invoke/adminGetDormantMembers with pagination', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { list: [], total: 0 } },
      });

      const result = await adminGetDormantMembers({ page: 1, pageSize: 20 });

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminGetDormantMembers', {
        page: 1,
        pageSize: 20,
      });
      expect(result.data?.total).toBe(0);
    });
  });

  describe('adminSendBirthdayNotification', () => {
    it('should POST to /invoke/adminSendBirthdayNotification with memberId', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });

      const result = await adminSendBirthdayNotification('M001');

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminSendBirthdayNotification', {
        memberId: 'M001',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('adminCreateMember', () => {
    it('should POST full member fields and return created member', async () => {
      const payload = {
        nickName: '小美',
        phone: '13800138000',
        birthday: '1995-06-15',
        cardId: 'CARD001',
      };
      const created = { _id: 'm1', memberId: 'M001', ...payload };
      mockPost.mockResolvedValue({
        data: { success: true, data: created },
      });

      const result = await adminCreateMember(payload);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateMember', payload);
      expect(result.success).toBe(true);
      expect(result.data?.memberId).toBe('M001');
      expect(result.data?.birthday).toBe('1995-06-15');
    });

    it('should support optional fields omitted', async () => {
      const payload = { nickName: '小丽', phone: '13900139000' };
      mockPost.mockResolvedValue({
        data: { success: true, data: { _id: 'm2', memberId: 'M002', ...payload } },
      });

      const result = await adminCreateMember(payload);

      expect(mockPost).toHaveBeenCalledWith('/invoke/adminCreateMember', payload);
      expect(result.success).toBe(true);
      expect(result.data?.nickName).toBe('小丽');
    });

    it('should return failure when phone already exists', async () => {
      mockPost.mockResolvedValue({
        data: {
          success: false,
          error: { code: 'PHONE_EXISTS', message: '该手机号已注册' },
        },
      });

      const result = await adminCreateMember({ nickName: '小美', phone: '13800138000' });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('该手机号已注册');
    });
  });
});
