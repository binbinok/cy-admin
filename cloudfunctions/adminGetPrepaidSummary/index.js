'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 预收统计：区分「已收款未核销」的预收部分
 *
 * 入参：{ period: 'today' | 'week' | 'month' }
 *
 * 返回：
 * {
 *   storedCardBalance,      // 使用中储值卡余额合计（分）
 *   sessionCardValue,       // 有效次卡未核销价值合计（剩余次数 × 单次折算价，分）
 *   prepaidOutstanding,     // 预收未核销总额 = 前两者之和
 *   periodNewPrepaid,       // 本期新增预收（期内充值 + 售卡实收，分）
 *   periodRechargeAmount,   // 本期储值卡充值（分）
 *   periodSessionCardSales  // 本期次卡售卡实收（分）
 * }
 */
function getDateRange(period) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const end = new Date(year, month, date + 1);
  if (period === 'week') {
    const day = now.getDay() || 7;
    return { start: new Date(year, month, date - day + 1), end };
  }
  if (period === 'month') {
    return { start: new Date(year, month, 1), end };
  }
  return { start: new Date(year, month, date), end };
}

exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const period = event.period || 'today';
    if (!['today', 'week', 'month'].includes(period)) {
      return error(AdminErrorCode.VALIDATION_ERROR, 'period 参数无效，可选值：today / week / month');
    }
    const { start, end } = getDateRange(period);
    const now = new Date();

    const { data: storedCards } = await db
      .collection('member_cards')
      .where({ status: 'active' })
      .limit(1000)
      .get();
    const storedCardBalance = storedCards.reduce((sum, card) => sum + (Number(card.balance) || 0), 0);

    const { data: sessionCards } = await db
      .collection('member_session_cards')
      .where({ status: 'active' })
      .limit(1000)
      .get();
    const sessionCardValue = sessionCards.reduce((sum, card) => {
      if (card.expiresAt && new Date(card.expiresAt) <= now) {
        return sum;
      }
      const remaining = Number(card.remainingSessions) || 0;
      const sessionValue = Number(card.snapshot && card.snapshot.sessionValue) || 0;
      return sum + remaining * sessionValue;
    }, 0);

    const { data: rechargeRecords } = await db
      .collection('card_recharge_records')
      .where({ createdAt: _.gte(start).and(_.lt(end)) })
      .limit(1000)
      .get();
    const periodRechargeAmount = rechargeRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const { data: salesRecords } = await db
      .collection('member_session_cards')
      .where({ createdAt: _.gte(start).and(_.lt(end)) })
      .limit(1000)
      .get();
    const periodSessionCardSales = salesRecords.reduce((sum, c) => sum + (Number(c.paidAmount) || 0), 0);

    return success({
      storedCardBalance,
      sessionCardValue,
      prepaidOutstanding: storedCardBalance + sessionCardValue,
      periodNewPrepaid: periodRechargeAmount + periodSessionCardSales,
      periodRechargeAmount,
      periodSessionCardSales,
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetPrepaidSummary error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取预收统计失败，请稍后重试');
  }
};
