'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 会员卡消费扣款
 *
 * 入参：{ cardId, originalAmount }
 *   - originalAmount：原始消费金额（单位：分）
 *
 * 行为：
 *   1. 查询会员卡及其关联的折扣等级
 *   2. 计算折后金额 = Math.floor(originalAmount * discountRate / 100)
 *   3. 余额不足则返回 CARD_BALANCE_INSUFFICIENT
 *   4. 扣减余额
 *
 * 返回：{ discountedAmount, balanceAfter }
 *
 * 需求：10.6、10.7
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const cardId = String(event.cardId || '').trim();
    const originalAmount = Number(event.originalAmount);

    if (!cardId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员卡 ID 不能为空');
    }
    if (isNaN(originalAmount) || originalAmount <= 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '消费金额必须大于 0');
    }

    // 查询会员卡
    let card;
    try {
      const cardRes = await db.collection('member_cards').doc(cardId).get();
      card = cardRes.data;
    } catch (_e) {
      return error(AdminErrorCode.NOT_FOUND, '会员卡不存在');
    }

    // 获取折扣比例
    let discountRate = 100; // 默认无折扣
    if (card.discountLevelId) {
      try {
        const levelRes = await db
          .collection('card_discount_levels')
          .doc(card.discountLevelId)
          .get();
        discountRate = levelRes.data.discountRate || 100;
      } catch (_e) {
        // 折扣等级不存在，按原价计算
      }
    }

    // 计算折后金额
    const discountedAmount = Math.floor(originalAmount * discountRate / 100);

    // 检查余额是否充足
    const currentBalance = card.balance || 0;
    if (currentBalance < discountedAmount) {
      return error(
        AdminErrorCode.CARD_BALANCE_INSUFFICIENT,
        `余额不足，当前余额 ${currentBalance} 分，需扣减 ${discountedAmount} 分`
      );
    }

    // 扣减余额
    const balanceAfter = currentBalance - discountedAmount;
    await db.collection('member_cards').doc(cardId).update({
      data: {
        balance: _.inc(-discountedAmount),
        updatedAt: new Date(),
      },
    });

    return success({ discountedAmount, balanceAfter });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminDeductCardBalance error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '会员卡扣款失败，请稍后重试');
  }
};
