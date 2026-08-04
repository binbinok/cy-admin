'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 删除折扣等级
 *
 * 入参：{ levelId }
 *
 * 行为：
 *   1. 检查是否有会员卡关联该等级
 *   2. 有关联则拒绝删除，返回 DISCOUNT_LEVEL_IN_USE 及关联数量
 *   3. 无关联则删除
 *
 * 需求：10.4
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const levelId = String(event.levelId || event.discountLevelId || '').trim();
    if (!levelId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '折扣等级 ID 不能为空');
    }

    // 检查是否有会员卡关联该折扣等级
    const countRes = await db
      .collection('member_cards')
      .where({ discountLevelId: levelId })
      .count();

    const associatedCount = countRes.total || 0;
    if (associatedCount > 0) {
      return error(
        AdminErrorCode.DISCOUNT_LEVEL_IN_USE,
        `该折扣等级已关联 ${associatedCount} 张会员卡，无法删除`
      );
    }

    // 删除折扣等级
    await db.collection('card_discount_levels').doc(levelId).remove();

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminDeleteDiscountLevel error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '删除折扣等级失败，请稍后重试');
  }
};
