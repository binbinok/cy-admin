'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 上下架服务项目
 * - 设置 active 字段为 true/false
 * - 下架（active = false）不影响已有预约，仅新预约不可选择该服务
 *
 * @param {{ serviceId: string, active: boolean }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const serviceId = String(event.serviceId || '').trim();
    if (!serviceId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务项目 ID 不能为空');
    }

    if (typeof event.active !== 'boolean') {
      return error(AdminErrorCode.VALIDATION_ERROR, 'active 必须为布尔值');
    }

    // 仅更新 active 字段，不影响已有预约
    await db.collection('services').doc(serviceId).update({
      data: {
        active: event.active,
        updatedAt: new Date(),
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminToggleServiceStatus error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '更新服务状态失败，请稍后重试');
  }
};
