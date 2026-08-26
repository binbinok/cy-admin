'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 服务分类收入分布：按服务大类聚合收入
 *
 * 统计口径：
 *   - 含结算明细的新记录：按结算明细的 categoryId / categoryName 归属
 *   - 历史记录（无结算明细）：按旧 serviceCategory / services 集合兜底归入大类
 *
 * 入参：{ startDate, endDate }
 *
 * 返回：[{ category, amount }]
 *
 * 需求：6.3
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const { startDate, endDate } = event;
    if (!startDate || !endDate) {
      return error(AdminErrorCode.VALIDATION_ERROR, 'startDate 和 endDate 不能为空');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000);

    // 查询时间范围内的消费记录
    const { data: records } = await db.collection('consumption_records')
      .where({
        createdAt: _.gte(start).and(_.lt(endExclusive)),
      })
      .get();

    // 历史兜底：查询所有服务项目以获取分类信息
    const { data: services } = await db.collection('services').get();
    const serviceMap = new Map(services.map((s) => [s._id, s]));

    // 按分类聚合
    const categoryMap = new Map();
    for (const record of records) {
      // 新记录优先按结算明细归属的服务大类统计
      let category = '';
      if (record.categoryId || record.categoryName) {
        category = record.categoryName || record.categoryId;
      } else {
        // 历史记录按旧字段兜底
        const service = serviceMap.get(record.serviceId);
        category = record.serviceCategory || (service && service.category) || '未分类';
      }
      categoryMap.set(category, (categoryMap.get(category) || 0) + (record.amount || 0));
    }

    const data = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }));

    return success(data);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetServiceRevenue error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取服务分类收入失败，请稍后重试');
  }
};
