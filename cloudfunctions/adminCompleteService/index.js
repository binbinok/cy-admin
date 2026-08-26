'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { executeSettlement } = require('./_shared/settlement');

/**
 * 完成服务（薄封装）：预约完成 = 统一结算 + 预约状态联动
 *
 * 入参与 adminCreateSettlement 一致，但 appointmentId 必填：
 * {
 *   appointmentId,               // 必填，仅"服务中"状态可结算
 *   memberId? / guestName?,      // 缺省时从预约记录带出
 *   technicianId, serviceTime, categoryId,
 *   baseItemId, baseItemPrice,
 *   addons?, customAddons?,
 *   adjustAmount?, adjustReason?,
 *   paymentDetails,
 *   note?
 * }
 *
 * 金额相关逻辑全部委托共享结算模块（_shared/settlement.js）。
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const appointmentId = String(event.appointmentId || '').trim();
    if (!appointmentId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '预约 ID 不能为空');
    }

    const result = await executeSettlement({ event: { ...event, appointmentId }, adminInfo });
    return success(result);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCompleteService error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '完成服务失败，请稍后重试');
  }
};
