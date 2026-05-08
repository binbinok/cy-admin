'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { paginate } = require('./_shared/db');

/**
 * 获取管理员列表
 * - 验证身份
 * - 分页查询 admin_accounts（排除 passwordHash）
 *
 * @param {{ page?: number, pageSize?: number }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    const result = await paginate('admin_accounts', {
      page,
      pageSize,
      orderBy: { field: 'createdAt', order: 'desc' },
    });

    // 排除 passwordHash 字段
    const list = (result.list || []).map((item) => {
      const { passwordHash, ...rest } = item;
      return rest;
    });

    return success({ list, total: result.total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('getAdminList error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
