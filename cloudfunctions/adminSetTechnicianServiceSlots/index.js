'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 配置技师时间段服务项目
 * - 先删除该技师已有的 technician_service_slots 记录
 * - 再批量插入新的时段配置
 *
 * @param {{ technicianId: string, slots: Array<{ dayOfWeek: number, startTime: string, endTime: string, serviceIds: string[] }> }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const technicianId = String(event.technicianId || '').trim();
    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师 ID 不能为空');
    }

    const slots = Array.isArray(event.slots) ? event.slots : [];

    // 删除该技师已有的时段配置
    await db
      .collection('technician_service_slots')
      .where({ technicianId })
      .remove();

    // 批量插入新的时段配置
    const now = new Date();
    const tasks = slots.map((slot) =>
      db.collection('technician_service_slots').add({
        data: {
          technicianId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          serviceIds: Array.isArray(slot.serviceIds) ? slot.serviceIds : [],
          createdAt: now,
          updatedAt: now,
        },
      })
    );

    await Promise.all(tasks);

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminSetTechnicianServiceSlots error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '配置技师服务时段失败，请稍后重试');
  }
};
