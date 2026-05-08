'use strict';
const crypto = require('crypto');
/**
 * 创建数据库客户端（兼容 wx-server-sdk 与 @cloudbase/node-sdk）
 * @returns {import('wx-server-sdk').database.Database}
 */
function createDatabaseClient() {
  try {
    const wxCloud = require('wx-server-sdk');
    wxCloud.init({ env: wxCloud.DYNAMIC_CURRENT_ENV });
    return wxCloud.database();
  } catch {
    const cloudbase = require('@cloudbase/node-sdk');
    const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
    return app.database();
  }
}
const db = createDatabaseClient();
const TOKEN_SIGNATURE_LENGTH = 24;
const ROLE_SUPER_ADMIN = 'super_admin';
const ROLE_ADMIN = 'admin';
const ADMIN_ID_PREFIX = 'ADM';
/**
 * 返回成功响应
 * @param {unknown} data
 * @returns {{success: true, data: unknown}}
 */
function success(data = null) {
  return { success: true, data };
}
/**
 * 返回失败响应
 * @param {string} code
 * @param {string} message
 * @returns {{success: false, error: {code: string, message: string}}}
 */
function failure(code, message) {
  return { success: false, error: { code, message } };
}
/**
 * 校验管理员令牌并返回管理员信息
 * @param {{authorization?: string, token?: string}} event
 * @returns {{adminId: string, role: string}}
 */
function verifyAuth(event) {
  const rawToken = String(event.authorization || event.token || '').trim();
  const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }
  const tokenParts = token.split('.');
  if (tokenParts.length !== 2) {
    throw new Error('UNAUTHORIZED');
  }
  const encoded = tokenParts[0];
  const signature = tokenParts[1];
  const expected = crypto.createHash('sha256').update(encoded).digest('hex').slice(0, TOKEN_SIGNATURE_LENGTH);
  if (signature !== expected) {
    throw new Error('UNAUTHORIZED');
  }
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload.exp || Date.now() >= payload.exp) {
    throw new Error('UNAUTHORIZED');
  }
  return {
    adminId: String(payload.adminId || ''),
    role: String(payload.role || ''),
  };
}
/**
 * 创建管理员账号（仅超级管理员）
 * @param {{username?: string, password?: string, role?: string, authorization?: string, token?: string, adminName?: string, ipAddress?: string}} event
 * @returns {Promise<{success: boolean, data?: unknown, error?: {code: string, message: string}}>}
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== ROLE_SUPER_ADMIN) {
      return failure('FORBIDDEN', '权限不足，仅超级管理员可执行此操作');
    }
    const username = String(event.username || '').trim();
    const password = String(event.password || '');
    const role = event.role === ROLE_SUPER_ADMIN ? ROLE_SUPER_ADMIN : ROLE_ADMIN;
    if (username.length < 4 || username.length > 20) {
      return failure('VALIDATION_ERROR', '用户名长度必须为 4-20 字符');
    }
    if (password.length < 8 || password.length > 32) {
      return failure('VALIDATION_ERROR', '密码长度必须为 8-32 字符');
    }
    const existingRes = await db.collection('admin_accounts').where({ username }).limit(1).get();
    const existing = existingRes.data || [];
    if (existing.length > 0) {
      return failure('CONFLICT', '用户名已存在');
    }
    const now = new Date();
    const adminId = `${ADMIN_ID_PREFIX}${Date.now()}`;
    await db.collection('admin_accounts').add({
      data: {
        adminId,
        username,
        passwordHash: password,
        password,
        role,
        status: 'active',
        failCount: 0,
        createdBy: adminInfo.adminId,
        createdAt: now,
        updatedAt: now,
      },
    });
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: String(event.adminName || ''),
        action: 'create_admin',
        targetType: 'admin',
        targetId: adminId,
        detail: `创建管理员 ${username}，角色：${role}`,
        ipAddress: String(event.ipAddress || ''),
        createdAt: now,
      },
    });
    return success({
      adminInfo: {
        adminId,
        username,
        role,
        status: 'active',
        createdAt: now,
      },
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return failure('UNAUTHORIZED', '登录已过期，请重新登录');
    }
    return failure('INTERNAL_ERROR', error.message || '操作失败，请稍后重试');
  }
};
