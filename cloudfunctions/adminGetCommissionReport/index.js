'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 提成报表：按技师聚合提成记录
 *
 * 入参：{ startDate, endDate }
 *
 * 返回：[{ technicianId, technicianName, completedCount, totalAmount, commissionAmount }]
 *
 * 需求：7.1
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

    // 查询时间范围内的提成记录
    const { data: records } = await db.collection('commission_records')
      .where({
        createdAt: _.gte(start).and(_.lte(end)),
      })
      .get();

    // 查询所有技师以获取名称
    const { data: technicians } = await db.collection('technicians').get();
    const techMap = new Map(technicians.map((t) => [t._id, t.name]));

    // 按技师聚合
    const statMap = new Map();
    for (const record of records) {
      const tid = record.technicianId;
      const current = statMap.get(tid) || {
        technicianId: tid,
        technicianName: techMap.get(tid) || '未知技师',
        completedCount: 0,
        totalAmount: 0,
        commissionAmount: 0,
      };
      current.completedCount += 1;
      current.totalAmount += record.serviceAmount || 0;
      current.commissionAmount += record.commissionAmount || 0;
      statMap.set(tid, current);
    }

    return success(Array.from(statMap.values()));
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetCommissionReport error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取提成报表失败，请稍后重试');
  }
};
