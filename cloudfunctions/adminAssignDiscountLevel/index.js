'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 为会员卡指定折扣等级
 *
 * 入参：{ cardId, discountLevelId }
 *
 * 行为：
 *   1. 验证参数
 *   2. 更新 member_cards.discountLevelId
 *
 * 需求：10.5
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const cardId = String(event.cardId || '').trim();
    const discountLevelId = String(event.discountLevelId || '').trim();

    if (!cardId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员卡 ID 不能为空');
    }
    if (!discountLevelId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '折扣等级 ID 不能为空');
    }

    // 验证折扣等级存在
    try {
      await db.collection('card_discount_levels').doc(discountLevelId).get();
    } catch (_e) {
      return error(AdminErrorCode.NOT_FOUND, '折扣等级不存在');
    }

    // 更新会员卡的折扣等级
    await db.collection('member_cards').doc(cardId).update({
      data: {
        discountLevelId,
        updatedAt: new Date(),
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminAssignDiscountLevel error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '指定折扣等级失败，请稍后重试');
  }
};
