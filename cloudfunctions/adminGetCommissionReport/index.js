'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');
const { getGlobalCommissionConfig } = require('./_shared/commissionConfig');

const VALID_TYPES = ['manual', 'card_open', 'card_renew'];

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

function resolveRate(type, config) {
  if (type === 'card_open') {
    return config.cardOpenRate;
  }
  if (type === 'card_renew') {
    return config.cardRenewRate;
  }
  return config.manualRate;
}

/**
 * 提成报表：按技师 × 提成类型聚合提成记录
 *
 * 入参：{ startDate, endDate }
 *
 * 返回：[{ technicianId, technicianName, completedCount, totalAmount, manualAmount, cardOpenAmount, cardRenewAmount, totalCommission }]
 *   - completedCount / totalAmount 仅统计手工提成（服务结算）记录
 *   - 历史无 type 字段的记录归入手工提成
 *   - 各类提成金额按当前全局比例对记录基数（serviceAmount）实时重算
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

    const records = await fetchAllRecords('commission_records', _.or([
      { serviceTime: _.gte(start).and(_.lt(endExclusive)) },
      { serviceTime: _.exists(false), createdAt: _.gte(start).and(_.lt(endExclusive)) },
    ]));

    const { data: technicians } = await db.collection('technicians').get();
    const techMap = new Map(technicians.map((t) => [t._id, t.name]));
    const config = await getGlobalCommissionConfig();

    const statMap = new Map();
    for (const record of records) {
      const tid = record.technicianId;
      const current = statMap.get(tid) || {
        technicianId: tid,
        technicianName: techMap.get(tid) || record.technicianName || '未知技师',
        completedCount: 0,
        totalAmount: 0,
        manualAmount: 0,
        cardOpenAmount: 0,
        cardRenewAmount: 0,
        totalCommission: 0,
      };
      const type = VALID_TYPES.includes(record.type) ? record.type : 'manual';
      const commissionAmount = Math.floor(((record.serviceAmount || 0) * resolveRate(type, config)) / 100);
      if (type === 'manual') {
        current.completedCount += 1;
        current.totalAmount += record.serviceAmount || 0;
        current.manualAmount += commissionAmount;
      } else if (type === 'card_open') {
        current.cardOpenAmount += commissionAmount;
      } else {
        current.cardRenewAmount += commissionAmount;
      }
      current.totalCommission += commissionAmount;
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
