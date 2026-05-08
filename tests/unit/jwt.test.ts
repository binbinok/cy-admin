import { describe, it, expect } from 'vitest';
import { parseJwtPayload } from '@/utils/jwt';

/**
 * Helper: create a fake JWT with given payload (no real signature)
 */
function createFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

describe('parseJwtPayload', () => {
  it('should parse a valid JWT payload', () => {
    const token = createFakeJwt({
      adminId: 'ADM001',
      role: 'super_admin',
      exp: 1700000000,
      iat: 1699990000,
    });

    const result = parseJwtPayload(token);
    expect(result).toEqual({
      adminId: 'ADM001',
      role: 'super_admin',
      exp: 1700000000,
      iat: 1699990000,
    });
  });

  it('should return null for token with wrong number of parts', () => {
    expect(parseJwtPayload('only-one-part')).toBeNull();
    expect(parseJwtPayload('two.parts')).toBeNull();
    expect(parseJwtPayload('a.b.c.d')).toBeNull();
  });

  it('should return null for invalid base64 payload', () => {
    expect(parseJwtPayload('header.!!!invalid!!!.sig')).toBeNull();
  });

  it('should return null when required fields are missing', () => {
    const token = createFakeJwt({ adminId: 'ADM001' });
    expect(parseJwtPayload(token)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseJwtPayload('')).toBeNull();
  });

  it('should handle base64url encoding (- and _ chars)', () => {
    const payload = {
      adminId: 'ADM001',
      role: 'admin',
      exp: 1700000000,
      iat: 1699990000,
    };
    const header = btoa(JSON.stringify({ alg: 'HS256' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const body = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = parseJwtPayload(`${header}.${body}.sig`);
    expect(result).toEqual(payload);
  });
});
