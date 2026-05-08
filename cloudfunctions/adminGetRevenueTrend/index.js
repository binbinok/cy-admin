'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 收入趋势：按日期聚合收入
 *
 * 入参：{ startDate, endDate }
 *   - startDate / endDate 为日期字符串（YYYY-MM-DD）
 *
 * 返回：[{ date, amount }]  按日期升序
 *
 * 需求：6.2
 */

function toDateKey(value) {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
/**
 * 解析查询时间范围（结束日期按闭区间日处理）。
 * @param {{ startDate: string, endDate: string }} event
 * @returns {{ start: Date, endExclusive: Date }}
 */
function parseDateRange(event) {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return { start, endExclusive };
}

exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const { startDate, endDate } = event;
    if (!startDate || !endDate) {
      return error(AdminErrorCode.VALIDATION_ERROR, 'startDate 和 endDate 不能为空');
    }

    const { start, endExclusive } = parseDateRange({ startDate, endDate });

    const { data: list } = await db.collection('consumption_records')
      .where({
        createdAt: _.gte(start).and(_.lt(endExclusive)),
      })
      .get();

    const map = new Map();
    for (const item of list) {
      const key = toDateKey(item.createdAt);
      map.set(key, (map.get(key) || 0) + (item.amount || 0));
    }

    const data = Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return success(data);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetRevenueTrend error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取收入趋势失败，请稍后重试');
  }
};
