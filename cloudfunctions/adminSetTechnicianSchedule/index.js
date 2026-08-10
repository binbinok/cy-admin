'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 设置技师排班
 * - 更新 technicians 集合的 schedule 字段
 * - schedule 为 { dayOfWeek, startTime, endTime } 数组
 *
 * @param {{ technicianId: string, schedule: Array<{ dayOfWeek: number, startTime: string, endTime: string }> }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const technicianId = String(event.technicianId || '').trim();
    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师 ID 不能为空');
    }

    const schedule = Array.isArray(event.schedule) ? event.schedule : [];

    await db.collection('technicians').doc(technicianId).update({
      data: {
        schedule,
        updatedAt: new Date(),
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminSetTechnicianSchedule error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '设置技师排班失败，请稍后重试');
  }
};
