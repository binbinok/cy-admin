'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 消费记录列表（分页，支持日期范围和技师筛选）
 *
 * 入参：{ startDate?, endDate?, technicianId?, manualEntry?, page, pageSize }
 *
 * 返回：{ list, total }
 *
 * 需求：6.4
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    // 构建查询条件
    const conditions = [];

    if (event.startDate && event.endDate) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      conditions.push({
        createdAt: _.gte(start).and(_.lt(endExclusive)),
      });
    }

    if (event.technicianId) {
      conditions.push({ technicianId: String(event.technicianId).trim() });
    }
    if (event.manualEntry !== undefined) {
      const manualEntryValue = typeof event.manualEntry === 'boolean'
        ? event.manualEntry
        : String(event.manualEntry).trim() === 'true';
      conditions.push({ manualEntry: manualEntryValue });
    }

    let query;
    if (conditions.length > 1) {
      query = db.collection('consumption_records').where(_.and(conditions));
    } else if (conditions.length === 1) {
      query = db.collection('consumption_records').where(conditions[0]);
    } else {
      query = db.collection('consumption_records');
    }

    // 查询总数
    const countResult = await query.count();
    const total = countResult.total;

    // 分页查询
    const skip = (page - 1) * pageSize;
    const { data: list } = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return success({ list, total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetConsumptionList error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取消费记录失败，请稍后重试');
  }
};
