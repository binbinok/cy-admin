'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { paginate } = require('./_shared/db');

/**
 * 获取会员消费记录
 * - 按 memberId 查询 consumption_records
 * - 按 createdAt 倒序
 * - 分页
 *
 * @param {{ memberId: string, page?: number, pageSize?: number }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const memberId = String(event.memberId || '').trim();
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }

    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    const result = await paginate('consumption_records', {
      where: { memberId },
      orderBy: { field: 'createdAt', order: 'desc' },
      page,
      pageSize,
    });

    return success({ list: result.list, total: result.total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetMemberConsumptions error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
