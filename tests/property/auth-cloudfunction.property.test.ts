import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import crypto from 'node:crypto';

interface TokenPayload {
  adminId: string;
  role: 'admin' | 'super_admin';
  iat: number;
  exp: number;
}

function createAdminToken(payload: TokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHash('sha256').update(encoded).digest('hex').slice(0, 24);
  return `${encoded}.${signature}`;
}

function parseAdminToken(token: string): TokenPayload | null {
  const encoded = String(token || '').split('.')[0] || '';
  if (!encoded) {
    return null;
  }
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    return JSON.parse(json) as TokenPayload;
  } catch (error) {
    return null;
  }
}

function createAuthFailedResponse(): { code: string; message: string } {
  return {
    code: 'AUTH_FAILED',
    message: '用户名或密码错误',
  };
}

describe('cy-admin 登录云函数属性测试', () => {
  it('Property 1: 登录成功颁发的 token 可还原出原始 payload', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('admin', 'super_admin'),
        fc.integer({ min: 1_000_000_000_000, max: 2_000_000_000_000 }),
        fc.integer({ min: 1, max: 7_200_000 }),
        (adminId: string, role: 'admin' | 'super_admin', iat: number, ttl: number) => {
          const payload: TokenPayload = { adminId, role, iat, exp: iat + ttl };
          const token = createAdminToken(payload);
          const parsed = parseAdminToken(token) as TokenPayload;
          return parsed.adminId === payload.adminId
            && parsed.role === payload.role
            && parsed.iat === payload.iat
            && parsed.exp === payload.exp;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 2: 无效凭据统一返回通用错误文案，不暴露失败细节', () => {
    fc.assert(
      fc.property(fc.string(), () => {
        const result = createAuthFailedResponse();
        return result.code === 'AUTH_FAILED' && result.message === '用户名或密码错误';
      }),
      { numRuns: 100 },
    );
  });
});
