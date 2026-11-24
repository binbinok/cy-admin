'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');
const { getGlobalCommissionConfig } = require('./_shared/commissionConfig');

const VALID_TYPES = ['manual', 'card_open', 'card_renew'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

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
 * 解析统计区间：优先 startDate/endDate（YYYY-MM-DD），否则回退 month（YYYY-MM）
 * @param {{ startDate?: string, endDate?: string, periodLabel?: string, month?: string }} event
 * @returns {{start: Date, end: Date, label: string, fileTag: string}}
 */
function parseRange(event) {
  const startDate = String(event.startDate || '').trim();
  const endDate = String(event.endDate || '').trim();
  if (startDate || endDate) {
    if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate)) {
      throw Object.assign(new Error('时间范围格式不正确，应为 YYYY-MM-DD'), { code: AdminErrorCode.VALIDATION_ERROR });
    }
    const start = new Date(startDate);
    const end = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000);
    return {
      start,
      end,
      label: String(event.periodLabel || '').trim() || `${startDate}~${endDate}`,
      fileTag: `${startDate}_${endDate}`,
    };
  }
  const month = String(event.month || '').trim();
  if (!MONTH_REGEX.test(month)) {
    throw Object.assign(new Error('请提供时间范围或月份（YYYY-MM）'), { code: AdminErrorCode.VALIDATION_ERROR });
  }
  const [year, monthNum] = month.split('-').map(Number);
  return { start: new Date(year, monthNum - 1, 1), end: new Date(year, monthNum, 1), label: month, fileTag: month };
}

/**
 * 生成 CSV 内容（口径与技师业绩列表一致）
 * @param {Record<string, unknown>} row
 * @returns {string}
 */
function generateCSV(row) {
  const headers = ['技师姓名', '统计周期', '完成订单数', '服务总收入(元)', '提成基数(元)', '服务提成(元)', '会员卡开卡/续卡(元)', '会员卡提成(元)', '总提成(元)'];
  const cells = [
    row.technicianName,
    row.periodLabel,
    row.orderCount,
    (row.totalAmount / 100).toFixed(2),
    (row.commissionBase / 100).toFixed(2),
    (row.serviceCommission / 100).toFixed(2),
    (row.cardSaleAmount / 100).toFixed(2),
    (row.cardCommission / 100).toFixed(2),
    (row.totalCommission / 100).toFixed(2),
  ];
  return '\uFEFF' + [headers.join(','), cells.join(',')].join('\n');
}

/**
 * 导出工资条（CSV）
 *
 * @param {{
 *   technicianId: string,
 *   startDate?: string,
 *   endDate?: string,
 *   periodLabel?: string,
 *   month?: string
 * }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const technicianId = String(event.technicianId || '').trim();
    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师不能为空');
    }

    let range;
    try {
      range = parseRange(event);
    } catch (err) {
      return error(err.code || AdminErrorCode.VALIDATION_ERROR, err.message);
    }

    const { data: technicianDoc } = await db.collection('technicians').doc(technicianId).get();
    if (!technicianDoc) {
      return error(AdminErrorCode.NOT_FOUND, '技师不存在');
    }

    const records = await fetchAllRecords('consumption_records', {
      technicianId,
      serviceTime: _.gte(range.start).and(_.lt(range.end)),
    });
    const orderCount = records.length;
    const totalAmount = records.reduce((sum, item) => sum + (item.amount || 0), 0);

    const config = await getGlobalCommissionConfig();
    const commissionRecords = await fetchAllRecords('commission_records', _.and([
      { technicianId },
      _.or([
        { serviceTime: _.gte(range.start).and(_.lt(range.end)) },
        { serviceTime: _.exists(false), createdAt: _.gte(range.start).and(_.lt(range.end)) },
      ]),
    ]));
    let commissionBase = 0;
    let serviceCommission = 0;
    let cardSaleAmount = 0;
    let cardCommission = 0;
    for (const record of commissionRecords) {
      const type = VALID_TYPES.includes(record.type) ? record.type : 'manual';
      const commission = Math.floor(((record.serviceAmount || 0) * resolveRate(type, config)) / 100);
      if (type === 'manual') {
        commissionBase += record.serviceAmount || 0;
        serviceCommission += commission;
      } else {
        cardSaleAmount += record.serviceAmount || 0;
        cardCommission += commission;
      }
    }

    const csvContent = generateCSV({
      technicianName: technicianDoc.name || '未知技师',
      periodLabel: range.label,
      orderCount,
      totalAmount,
      commissionBase,
      serviceCommission,
      cardSaleAmount,
      cardCommission,
      totalCommission: serviceCommission + cardCommission,
    });

    return success({
      content: csvContent,
      filename: `payroll_${technicianId}_${range.fileTag}.csv`,
      contentType: 'text/csv;charset=utf-8;',
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminExportPayroll error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '工资条导出失败，请稍后重试');
  }
};
