'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 确认到店：待服务 → 服务中
 *
 * 入参：{ appointmentId }
 * 需求：5.6
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

    // 验证状态转换合法性：只有 pending 才能转为 in_service
    if (appointment.status !== 'pending') {
      return error(
        AdminErrorCode.INVALID_STATUS_TRANSITION,
        `当前状态为"${appointment.status}"，无法确认到店，仅"待服务"状态可操作`
      );
    }

    await db.collection('appointments').doc(appointmentId).update({
      data: {
        status: 'in_service',
        arrivedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminConfirmArrival error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '确认到店失败，请稍后重试');
  }
};
