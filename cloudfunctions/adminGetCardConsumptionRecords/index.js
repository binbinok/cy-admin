'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 查询会员卡扣款消费流水
 *
 * 入参：{ cardId?, memberId? }（至少传一个）
 * 返回：{ records } 按时间倒序，最多 100 条
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const cardId = String(event.cardId || '').trim();
    const memberId = String(event.memberId || '').trim();
    if (!cardId && !memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员卡 ID 或会员 ID 至少传一个');
    }

    const condition = cardId ? { cardId } : { memberId };
    const { data: records } = await db
      .collection('card_consumption_records')
      .where(condition)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    return success({ records });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetCardConsumptionRecords error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取卡扣消费记录失败，请稍后重试');
  }
};
