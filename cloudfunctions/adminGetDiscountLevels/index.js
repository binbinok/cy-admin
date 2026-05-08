'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 获取所有折扣等级列表
 *
 * 入参：{}
 *
 * 返回：{ list }
 *   - 每条记录附带 memberCount（关联会员卡数量）
 *
 * 需求：10.1
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    // 查询所有折扣等级
    const { data: levels } = await db.collection('card_discount_levels').get();

    // 查询所有会员卡，统计每个等级的关联数量
    const { data: cards } = await db.collection('member_cards').get();
    const countMap = new Map();
    for (const card of cards) {
      const key = card.discountLevelId;
      if (key) {
        countMap.set(key, (countMap.get(key) || 0) + 1);
      }
    }

    const list = levels.map((level) => ({
      ...level,
      memberCount: countMap.get(level._id) || 0,
    }));

    return success({ list });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetDiscountLevels error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取折扣等级列表失败，请稍后重试');
  }
};
