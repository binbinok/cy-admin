'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 查询会员卡充值流水
 *
 * 入参：{ memberId, page, pageSize }
 *
 * 返回：{ list, total }
 *   - 按 createdAt 倒序
 *
 * 需求：10.8
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const { memberId } = event;
    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }

    const where = { memberId };

    const countRes = await db
      .collection('card_recharge_records')
      .where(where)
      .count();
    const total = countRes.total || 0;

    const { data: list } = await db
      .collection('card_recharge_records')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return success({ list, total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetCardRechargeRecords error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取充值记录失败，请稍后重试');
  }
};
