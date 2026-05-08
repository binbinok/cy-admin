'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 财务汇总（今日/本周/本月）
 *
 * 入参：{ period: 'today' | 'week' | 'month' }
 *
 * 返回：{ totalRevenue, orderCount }
 *   - totalRevenue：已完成预约的 actualAmount 之和
 *   - orderCount：已完成预约数量
 *
 * 需求：6.1
 */

function getDateRange(period) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  // end = 明天 00:00（不含）
  const end = new Date(year, month, date + 1);

  if (period === 'week') {
    const day = now.getDay() || 7; // 周日=7
    const start = new Date(year, month, date - day + 1);
    return { start, end };
  }

  if (period === 'month') {
    const start = new Date(year, month, 1);
    return { start, end };
  }

  // 默认 today
  const start = new Date(year, month, date);
  return { start, end };
}
/**
 * 读取时间范围内消费记录。
 * @param {{ start: Date, end: Date }} range
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function getRecordsByRange(range) {
  const { data: list } = await db.collection('consumption_records')
    .where({
      createdAt: _.gte(range.start).and(_.lt(range.end)),
    })
    .get();
  return list;
}

exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const period = event.period || 'today';
    if (!['today', 'week', 'month'].includes(period)) {
      return error(AdminErrorCode.VALIDATION_ERROR, 'period 参数无效，可选值：today / week / month');
    }

    const { start, end } = getDateRange(period);

    const list = await getRecordsByRange({ start, end });
    const totalRevenue = list.reduce((sum, item) => sum + (item.amount || 0), 0);

    return success({
      totalRevenue,
      orderCount: list.length,
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetFinanceSummary error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取财务汇总失败，请稍后重试');
  }
};
