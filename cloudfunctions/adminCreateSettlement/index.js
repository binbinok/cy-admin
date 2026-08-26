'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { executeSettlement } = require('./_shared/settlement');

/**
 * 统一结算入口：手工收入录入与预约完成共用的收入确认入口
 *
 * 入参：
 * {
 *   appointmentId?,        // 可选；存在则要求预约状态为 in_service，结算后联动为 completed
 *   memberId? / guestName?,
 *   technicianId, serviceTime, categoryId,
 *   baseItemId, baseItemPrice,        // 恰好 1 个基础项目，价格以提交时确认为准（分）
 *   addons?: [{ itemId, inputValue?, price }],
 *   customAddons?: [{ name, price, reason }],   // 模板外兜底，默认不折扣不提成
 *   adjustAmount?, adjustReason?,     // 改价（分），非 0 时原因必填
 *   paymentDetails: [{ paymentType, amount }],  // 合计必须等于实收
 *   note?
 * }
 *
 * 返回：{ consumptionId, originalAmount, discountAmount, receivableAmount, adjustAmount, amount, pointsEarned, commissionAmount }
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    const result = await executeSettlement({ event, adminInfo });
    return success(result);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCreateSettlement error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '结算失败，请稍后重试');
  }
};
