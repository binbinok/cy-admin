'use strict';

const { _ } = require('./_shared/db');
const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { paginate } = require('./_shared/db');
const { mapLoginLog } = require('./mapLoginLog');

/**
 * 获取登录日志
 * - 验证身份
 * - 分页查询 operation_logs（action 为 login 或 logout）
 * - 映射为前端 LoginLog 契约：username / loginTime / ipAddress / result / failReason
 *
 * @param {{ page?: number, pageSize?: number }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    const result = await paginate('operation_logs', {
      where: {
        action: _.in(['login', 'logout']),
      },
      page,
      pageSize,
      orderBy: { field: 'createdAt', order: 'desc' },
    });

    const list = (result.list || []).map(mapLoginLog);

    return success({ list, total: result.total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('getLoginLogs error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
