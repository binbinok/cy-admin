/**
 * JWT 解析工具
 * 仅解析 payload，不验证签名（签名验证由云函数端完成）
 */

export interface JwtPayload {
  adminId: string;
  role: 'super_admin' | 'admin';
  exp: number;
  iat: number;
}

/**
 * 解析 JWT token 的 payload 部分
 * @param token - JWT token 字符串
 * @returns 解析后的 payload，解析失败返回 null
 */
export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    // base64url → base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    const parsed: unknown = JSON.parse(jsonStr);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as JwtPayload).adminId !== 'string' ||
      typeof (parsed as JwtPayload).role !== 'string' ||
      typeof (parsed as JwtPayload).exp !== 'number' ||
      typeof (parsed as JwtPayload).iat !== 'number'
    ) {
      return null;
    }

    return parsed as JwtPayload;
  } catch {
    return null;
  }
}
