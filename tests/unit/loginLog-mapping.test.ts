import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { mapLoginLog } = require('../../cloudfunctions/getLoginLogs/mapLoginLog') as {
  mapLoginLog: (log: Record<string, unknown>) => {
    _id?: unknown;
    adminId?: unknown;
    username?: unknown;
    loginTime?: unknown;
    ipAddress: string;
    result: 'success' | 'failed';
    failReason?: string;
  };
};

describe('getLoginLogs mapLoginLog（operation_logs → LoginLog 契约映射）', () => {
  it('should map adminName/createdAt to username/loginTime for success log', () => {
    const raw = {
      _id: 'log1',
      adminId: 'ADM001',
      adminName: 'admin',
      action: 'login',
      targetType: 'session',
      targetId: 'ADM001',
      detail: '登录成功',
      ipAddress: '127.0.0.1',
      createdAt: new Date('2026-05-19T10:00:00Z'),
    };

    const mapped = mapLoginLog(raw);

    expect(mapped._id).toBe('log1');
    expect(mapped.adminId).toBe('ADM001');
    expect(mapped.username).toBe('admin');
    expect(mapped.loginTime).toEqual(new Date('2026-05-19T10:00:00Z'));
    expect(mapped.ipAddress).toBe('127.0.0.1');
    expect(mapped.result).toBe('success');
    expect(mapped.failReason).toBeUndefined();
  });

  it('should mark failed log and expose detail as failReason', () => {
    const raw = {
      _id: 'log2',
      adminId: 'ADM001',
      adminName: 'admin',
      detail: '登录失败：密码错误',
      ipAddress: '10.0.0.1',
      createdAt: new Date('2026-05-19T11:00:00Z'),
    };

    const mapped = mapLoginLog(raw);

    expect(mapped.result).toBe('failed');
    expect(mapped.failReason).toBe('登录失败：密码错误');
  });

  it('should treat logout log as success without failReason', () => {
    const mapped = mapLoginLog({
      adminName: 'admin',
      detail: '登出成功',
      createdAt: new Date(),
    });

    expect(mapped.result).toBe('success');
    expect(mapped.failReason).toBeUndefined();
  });

  it('should tolerate missing detail and ipAddress', () => {
    const mapped = mapLoginLog({ adminName: 'admin' });

    expect(mapped.result).toBe('success');
    expect(mapped.ipAddress).toBe('');
  });
});
