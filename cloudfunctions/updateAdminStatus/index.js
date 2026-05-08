'use strict';

const { db } = require('./_shared/db');
const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');

/**
 * 启用/禁用管理员账号（仅超级管理员）
 * - 验证身份 + 超级管理员权限
 * - 更新 status 字段
 *
 * @param {{ adminId: string, status: 'active' | 'disabled' }} event
 */
exports.main = async (event = {}) => {
  try {
    const operatorInfo = verifyAuth(event);

    // 仅超级管理员可操作
    if (operatorInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const targetAdminId = event.adminId;
    const status = event.status;

    if (!targetAdminId || !['active', 'disabled'].includes(status)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '参数不合法');
    }

    // 查询目标管理员
    const { data: accounts } = await db
      .collection('admin_accounts')
      .where({ adminId: targetAdminId })
      .limit(1)
      .get();

    const admin = (accounts || [])[0];
    if (!admin) {
      return error(AdminErrorCode.NOT_FOUND, '管理员不存在');
    }

    const now = new Date();

    await db.collection('admin_accounts').doc(admin._id).update({
      data: {
        status,
        updatedAt: now,
      },
    });

    // 记录操作日志
    const actionLabel = status === 'disabled' ? '禁用' : '启用';
    await db.collection('operation_logs').add({
      data: {
        adminId: operatorInfo.adminId,
        adminName: event.adminName || '',
        action: status === 'disabled' ? 'disable_admin' : 'enable_admin',
        targetType: 'admin',
        targetId: targetAdminId,
        detail: `${actionLabel}管理员 ${admin.username}`,
        ipAddress: event.ipAddress || '',
        createdAt: now,
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('updateAdminStatus error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
