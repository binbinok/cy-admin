'use strict';

const bcrypt = require('bcryptjs');
const { db } = require('./_shared/db');
const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');

/**
 * 管理员修改密码
 * - 验证身份
 * - 验证当前密码（bcrypt）
 * - 更新密码哈希
 *
 * @param {{ currentPassword: string, newPassword: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const currentPassword = String(event.currentPassword || '');
    const newPassword = String(event.newPassword || '');

    if (!currentPassword || !newPassword) {
      return error(AdminErrorCode.VALIDATION_ERROR, '参数不完整');
    }

    // 查询当前管理员
    const { data: accounts } = await db
      .collection('admin_accounts')
      .where({ adminId: adminInfo.adminId })
      .limit(1)
      .get();

    const admin = (accounts || [])[0];
    if (!admin) {
      return error(AdminErrorCode.NOT_FOUND, '管理员不存在');
    }

    // 验证当前密码
    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) {
      return error(AdminErrorCode.AUTH_FAILED, '当前密码错误');
    }

    // 哈希新密码并更新
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.collection('admin_accounts').doc(admin._id).update({
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminChangePassword error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
