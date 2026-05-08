'use strict';

const { db } = require('./_shared/db');
const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');

/**
 * 管理员退出登录
 * - 验证身份
 * - 记录退出日志
 *
 * @param {object} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: event.adminName || '',
        action: 'logout',
        targetType: 'session',
        targetId: adminInfo.adminId,
        detail: '管理员退出登录',
        ipAddress: event.ipAddress || '',
        createdAt: new Date(),
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminLogout error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
