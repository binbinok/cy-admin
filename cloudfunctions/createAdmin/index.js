'use strict';

const bcrypt = require('bcryptjs');
const { db } = require('./_shared/db');
const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');

const BCRYPT_SALT_ROUNDS = 10;
const ROLE_SUPER_ADMIN = 'super_admin';
const ROLE_ADMIN = 'admin';
const ADMIN_ID_PREFIX = 'ADM';

/**
 * 创建管理员账号（仅超级管理员）
 * - JWT 鉴权（_shared/auth）
 * - 用户名/密码仅校验非空
 * - 密码使用 bcrypt 哈希存储（salt rounds 10），不存明文
 * - 记录创建操作日志
 *
 * @param {{ username?: string, password?: string, role?: string, adminName?: string, ipAddress?: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== ROLE_SUPER_ADMIN) {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const username = String(event.username || '').trim();
    const password = String(event.password || '');
    const role = event.role === ROLE_SUPER_ADMIN ? ROLE_SUPER_ADMIN : ROLE_ADMIN;

    if (username === '') {
      return error(AdminErrorCode.VALIDATION_ERROR, '用户名不能为空');
    }
    if (password === '') {
      return error(AdminErrorCode.VALIDATION_ERROR, '密码不能为空');
    }

    const { data: existing } = await db
      .collection('admin_accounts')
      .where({ username })
      .limit(1)
      .get();
    if ((existing || []).length > 0) {
      return error(AdminErrorCode.CONFLICT, '用户名已存在');
    }

    const now = new Date();
    const adminId = `${ADMIN_ID_PREFIX}${Date.now()}`;
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await db.collection('admin_accounts').add({
      data: {
        adminId,
        username,
        passwordHash,
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
        detail: `创建管理员 ${username}（角色：${role}）`,
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
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('createAdmin error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '创建失败，请稍后重试');
  }
};
