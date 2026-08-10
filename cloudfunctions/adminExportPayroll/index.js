'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 解析月份范围
 * @param {string} monthStr - YYYY-MM 格式
 * @returns {{start: Date, end: Date}}
 */
function parseMonthRange(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

/**
 * 生成 CSV 内容
 * @param {Array<Record<string, unknown>>} records
 * @returns {string}
 */
function generateCSV(records) {
  const headers = ['技师姓名', '统计月份', '完成订单数', '服务总金额(元)', '应得提成金额(元)'];
  const rows = records.map((record) => [
    record.technicianName,
    record.month,
    record.orderCount,
    (record.totalAmount / 100).toFixed(2),
    (record.commissionAmount / 100).toFixed(2),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // 添加 BOM 头解决中文乱码
  return '\uFEFF' + csvContent;
}

/**
 * 导出工资条（CSV）
 *
 * @param {{
 *   technicianId: string,
 *   month: string
 * }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const technicianId = String(event.technicianId || '').trim();
    const month = String(event.month || '').trim();

    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师不能为空');
    }
    if (!month) {
      return error(AdminErrorCode.VALIDATION_ERROR, '月份不能为空');
    }

    // 验证月份格式 YYYY-MM
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '月份格式不正确，应为 YYYY-MM');
    }

    // 查询技师信息
    const { data: technicianDoc } = await db.collection('technicians').doc(technicianId).get();
    if (!technicianDoc) {
      return error(AdminErrorCode.NOT_FOUND, '技师不存在');
    }

    // 解析月份范围
    const { start, end } = parseMonthRange(month);

    // 查询该技师在月份范围内的消费记录
    const { data: records } = await db.collection('consumption_records')
      .where({
        technicianId,
        createdAt: _.gte(start).and(_.lt(end)),
      })
      .get();

    // 计算统计指标
    const orderCount = records.length;
    const totalAmount = records.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 获取技师提成比例（默认30%）
    const commissionRate = Number(technicianDoc.commissionRate) || 30;
    const commissionAmount = Math.floor(totalAmount * commissionRate / 100);

    // 生成 CSV
    const csvRecords = [{
      technicianName: technicianDoc.name || '未知技师',
      month,
      orderCount,
      totalAmount,
      commissionAmount,
    }];

    const csvContent = generateCSV(csvRecords);
    const filename = `payroll_${technicianId}_${month}.csv`;

    return success({
      content: csvContent,
      filename,
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
