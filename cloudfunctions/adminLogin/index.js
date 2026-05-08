'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./_shared/db');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const BCRYPT_HASH_PREFIX_PATTERN = /^\$2[aby]\$\d{2}\$/;
const BCRYPT_SALT_ROUNDS = 10;
/**
 * 兼容历史密码格式并返回是否需要升级哈希。
 * @param {string} password
 * @param {{ passwordHash?: string, password?: string }} admin
 * @returns {Promise<{ matched: boolean, needUpgrade: boolean }>}
 */
async function verifyPasswordWithLegacySupport(password, admin) {
  const passwordHash = String(admin.passwordHash || '');
  const legacyPassword = String(admin.password || '');
  if (BCRYPT_HASH_PREFIX_PATTERN.test(passwordHash)) {
    const matched = await bcrypt.compare(password, passwordHash);
    return { matched, needUpgrade: false };
  }
  const matched = passwordHash === password || legacyPassword === password;
  return { matched, needUpgrade: matched };
}

/**
 * 管理员登录
 * - bcrypt 验证密码
 * - 失败计数（≥5 次锁定 30 分钟）
 * - 成功颁发 JWT（含 adminId、role，2 小时过期）
 * - 记录登录日志
 *
 * @param {{ username: string, password: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const username = String(event.username || '').trim();
    const password = String(event.password || '');

    if (!username || !password) {
      return error(AdminErrorCode.AUTH_FAILED, '用户名或密码错误');
    }

    const now = new Date();

    // 查询账号
    const { data: accounts } = await db
      .collection('admin_accounts')
      .where({ username })
      .limit(1)
      .get();

    const admin = (accounts || [])[0];

    if (!admin) {
      return error(AdminErrorCode.AUTH_FAILED, '用户名或密码错误');
    }

    // 检查账号是否被禁用
    if (admin.status === 'disabled') {
      return error(AdminErrorCode.ACCOUNT_DISABLED, '账号已被禁用');
    }

    // 检查是否被锁定
    if (admin.lockedUntil && new Date(admin.lockedUntil).getTime() > now.getTime()) {
      return error(AdminErrorCode.ACCOUNT_LOCKED, '账号已锁定，请 30 分钟后再试');
    }

    const passwordCheck = await verifyPasswordWithLegacySupport(password, admin);
    const passwordMatch = passwordCheck.matched;

    if (!passwordMatch) {
      const failCount = (admin.failCount || 0) + 1;
      const updateData = { failCount, updatedAt: now };

      if (failCount >= 5) {
        updateData.lockedUntil = new Date(now.getTime() + 30 * 60 * 1000);
      }

      await db.collection('admin_accounts').doc(admin._id).update({ data: updateData });

      // 记录失败登录日志
      await db.collection('operation_logs').add({
        data: {
          adminId: admin.adminId,
          adminName: admin.username,
          action: 'login',
          targetType: 'session',
          targetId: admin.adminId,
          detail: '登录失败：密码错误',
          ipAddress: event.ipAddress || '',
          createdAt: now,
        },
      });

      return error(AdminErrorCode.AUTH_FAILED, '用户名或密码错误');
    }

    const passwordHashUpdate = passwordCheck.needUpgrade
      ? { passwordHash: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS) }
      : {};
    // 登录成功：重置失败计数，记录登录时间
    await db.collection('admin_accounts').doc(admin._id).update({
      data: {
        failCount: 0,
        lockedUntil: null,
        lastLoginAt: now,
        lastLoginIp: event.ipAddress || '',
        ...passwordHashUpdate,
        updatedAt: now,
      },
    });

    // 颁发 JWT
    const token = jwt.sign(
      { adminId: admin.adminId, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 记录成功登录日志
    await db.collection('operation_logs').add({
      data: {
        adminId: admin.adminId,
        adminName: admin.username,
        action: 'login',
        targetType: 'session',
        targetId: admin.adminId,
        detail: '登录成功',
        ipAddress: event.ipAddress || '',
        createdAt: now,
      },
    });

    return success({
      token,
      adminInfo: {
        adminId: admin.adminId,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error('adminLogin error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
