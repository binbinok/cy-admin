'use strict';

const { _, paginate } = require('./_shared/db');
const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');

/**
 * 获取操作日志列表
 *
 * 入参：{ adminId?, action?, dateFrom?, dateTo?, page?, pageSize? }
 *
 * 支持按操作人、操作类型、日期范围筛选，分页返回
 *
 * 需求：11.5
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    const where = {};

    if (event.adminId) {
      where.adminId = event.adminId;
    }

    if (event.action) {
      where.action = event.action;
    }

    if (event.dateFrom && event.dateTo) {
      where.createdAt = _.gte(new Date(event.dateFrom)).and(_.lte(new Date(event.dateTo)));
    }

    const result = await paginate('operation_logs', {
      where,
      page,
      pageSize,
      orderBy: { field: 'createdAt', order: 'desc' },
    });

    return success({ list: result.list, total: result.total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetOperationLogs error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取操作日志失败，请稍后重试');
  }
};
