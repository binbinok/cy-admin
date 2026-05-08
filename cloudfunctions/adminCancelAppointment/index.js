'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 取消预约：待服务 / 服务中 → 已取消
 *
 * 入参：{ appointmentId }
 *
 * 业务逻辑：
 *   1. 验证当前状态为 pending 或 in_service
 *   2. 更新状态为 cancelled（释放时间段）
 *
 * 需求：5.9
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const appointmentId = String(event.appointmentId || '').trim();
    if (!appointmentId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '预约 ID 不能为空');
    }

    // 查询预约
    const { data: appointment } = await db
      .collection('appointments')
      .doc(appointmentId)
      .get();

    if (!appointment) {
      return error(AdminErrorCode.APPOINTMENT_NOT_FOUND, '预约不存在');
    }

    // 验证状态转换合法性：只有 pending / in_service 可以取消
    if (appointment.status !== 'pending' && appointment.status !== 'in_service') {
      return error(
        AdminErrorCode.INVALID_STATUS_TRANSITION,
        `当前状态为"${appointment.status}"，无法取消预约，仅"待服务"或"服务中"状态可操作`
      );
    }

    await db.collection('appointments').doc(appointmentId).update({
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCancelAppointment error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '取消预约失败，请稍后重试');
  }
};
