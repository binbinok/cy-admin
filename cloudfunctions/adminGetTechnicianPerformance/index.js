'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 技师业绩统计：按技师聚合消费记录
 *
 * 入参：{ startDate, endDate }
 *
 * 返回：[{ technicianId, technicianName, orderCount, totalAmount }]
 *
 * 需求：6.6
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

    // 查询时间范围内消费记录
    const { data: records } = await db.collection('consumption_records')
      .where({
        createdAt: _.gte(start).and(_.lt(endExclusive)),
      })
      .get();

    // 查询技师信息（获取提成比例）
    const technicianIds = [...new Set(records.map((r) => r.technicianId).filter(Boolean))];
    const technicianMap = new Map();

    if (technicianIds.length > 0) {
      const { data: technicians } = await db.collection('technicians')
        .where({ _id: _.in(technicianIds) })
        .get();

      for (const tech of technicians) {
        technicianMap.set(tech._id, tech);
      }
    }

    // 按技师聚合
    const statMap = new Map();
    for (const record of records) {
      const tid = record.technicianId || 'unknown';
      const current = statMap.get(tid) || {
        technicianId: tid,
        technicianName: record.technicianName || '未知技师',
        orderCount: 0,
        totalAmount: 0,
      };
      current.orderCount += 1;
      current.totalAmount += record.amount || 0;
      statMap.set(tid, current);
    }

    // 计算提成金额
    const results = Array.from(statMap.values()).map((item) => {
      const tech = technicianMap.get(item.technicianId);
      const commissionRate = tech ? (Number(tech.commissionRate) || 30) : 30;
      const commissionAmount = Math.floor(item.totalAmount * commissionRate / 100);

      return {
        ...item,
        commissionRate,
        commissionAmount,
      };
    });

    return success(results);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetTechnicianPerformance error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取技师业绩统计失败，请稍后重试');
  }
};
