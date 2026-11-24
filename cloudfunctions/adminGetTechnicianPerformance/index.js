'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');
const { getGlobalCommissionConfig } = require('./_shared/commissionConfig');

/**
 * 分页拉取集合内符合条件的全部记录（wx-server-sdk 单次 get 默认上限 100 条）
 * @param {string} name
 * @param {Record<string, unknown>} where
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function fetchAllRecords(name, where) {
  const pageSize = 1000;
  let all = [];
  let skip = 0;
  for (;;) {
    const { data } = await db.collection(name).where(where).skip(skip).limit(pageSize).get();
    all = all.concat(data || []);
    if (!data || data.length < pageSize) {
      return all;
    }
    skip += pageSize;
  }
}

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
    const records = await fetchAllRecords('consumption_records', {
      serviceTime: _.gte(start).and(_.lt(endExclusive)),
    });

    // 查询时间范围内提成记录（按业务归属时间 serviceTime，历史记录回退 createdAt）
    const commissionRecords = await fetchAllRecords('commission_records', _.or([
      { serviceTime: _.gte(start).and(_.lt(endExclusive)) },
      { serviceTime: _.exists(false), createdAt: _.gte(start).and(_.lt(endExclusive)) },
    ]));

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
        commissionBase: 0,
        serviceCommission: 0,
        cardSaleAmount: 0,
        cardCommission: 0,
        totalCommission: 0,
      };
      current.orderCount += 1;
      current.totalAmount += (record.amount || 0) + (record.sessionCoveredAmount || 0);
      statMap.set(tid, current);
    }

    // 聚合提成金额（服务/开卡/续卡分列，按当前全局比例实时重算）
    for (const record of commissionRecords) {
      const tid = record.technicianId || 'unknown';
      const current = statMap.get(tid) || {
        technicianId: tid,
        technicianName: record.technicianName || '未知技师',
        orderCount: 0,
        totalAmount: 0,
        commissionBase: 0,
        serviceCommission: 0,
        cardSaleAmount: 0,
        cardCommission: 0,
        totalCommission: 0,
      };
      const type = ['manual', 'card_open', 'card_renew'].includes(record.type) ? record.type : 'manual';
      const rate = type === 'card_open' ? config.cardOpenRate : type === 'card_renew' ? config.cardRenewRate : config.manualRate;
      const commission = Math.floor(((record.serviceAmount || 0) * rate) / 100);
      if (type === 'manual') {
        current.commissionBase += record.serviceAmount || 0;
        current.serviceCommission += commission;
      } else {
        current.cardSaleAmount += record.serviceAmount || 0;
        current.cardCommission += commission;
      }
      current.totalCommission += commission;
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
