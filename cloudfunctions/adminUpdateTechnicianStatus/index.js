'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 修改技师状态
 * - 修改为休息时检查未完成预约数量，返回 pendingCount 供前端确认
 * - 前端确认后可带 force=true 强制执行
 *
 * @param {{ technicianId: string, status: 'idle'|'busy'|'rest', force?: boolean }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const technicianId = String(event.technicianId || '').trim();
    const status = String(event.status || '').trim();

    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师 ID 不能为空');
    }

    const validStatuses = ['idle', 'busy', 'rest'];
    if (!validStatuses.includes(status)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '无效的技师状态');
    }

    // 修改为休息时，检查未完成预约数量
    if (status === 'rest') {
      const countRes = await db
        .collection('appointments')
        .where({
          technicianId,
          status: _.in(['pending', 'in_service']),
        })
        .count();

      const pendingCount = countRes.total || 0;

      // 有未完成预约且未强制确认，返回 pendingCount 让前端展示确认弹窗
      if (pendingCount > 0 && !event.force) {
        return success({ pendingCount });
      }
    }

    await db.collection('technicians').doc(technicianId).update({
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUpdateTechnicianStatus error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '更新技师状态失败，请稍后重试');
  }
};
