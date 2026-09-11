'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');
const { getGlobalCommissionConfig } = require('./_shared/commissionConfig');

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
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const { startDate, endDate } = event;
    if (!startDate || !endDate) {
      return error(AdminErrorCode.VALIDATION_ERROR, 'startDate 和 endDate 不能为空');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000);

    // 查询时间范围内消费记录（按服务时间归属）
    const { data: records } = await db.collection('consumption_records')
      .where({
        serviceTime: _.gte(start).and(_.lt(endExclusive)),
      })
      .get();

    // 查询时间范围内提成记录（按记录时间归属），与提成报表同口径
    const { data: commissionRecords } = await db.collection('commission_records')
      .where({
        createdAt: _.gte(start).and(_.lte(endExclusive)),
      })
      .get();

    const config = await getGlobalCommissionConfig();

    // 按技师聚合
    const statMap = new Map();
    for (const record of records) {
      const tid = record.technicianId || 'unknown';
      const current = statMap.get(tid) || {
        technicianId: tid,
        technicianName: record.technicianName || '未知技师',
        orderCount: 0,
        totalAmount: 0,
        commissionAmount: 0,
      };
      current.orderCount += 1;
      current.totalAmount += record.amount || 0;
      statMap.set(tid, current);
    }

    // 聚合提成金额（手工/开卡/续卡三类，按当前全局比例实时重算）
    for (const record of commissionRecords) {
      const tid = record.technicianId || 'unknown';
      const current = statMap.get(tid) || {
        technicianId: tid,
        technicianName: record.technicianName || '未知技师',
        orderCount: 0,
        totalAmount: 0,
        commissionAmount: 0,
      };
      const type = ['manual', 'card_open', 'card_renew'].includes(record.type) ? record.type : 'manual';
      const rate = type === 'card_open' ? config.cardOpenRate : type === 'card_renew' ? config.cardRenewRate : config.manualRate;
      current.commissionAmount += Math.floor(((record.serviceAmount || 0) * rate) / 100);
      statMap.set(tid, current);
    }

    return success(Array.from(statMap.values()));
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetTechnicianPerformance error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取技师业绩统计失败，请稍后重试');
  }
};
