'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { getGlobalCommissionConfig } = require('./_shared/commissionConfig');

/**
 * 获取全局提成配置（手工 / 开卡 / 续卡三类比例，全员生效）
 *
 * 入参：{}
 *
 * 返回：{ manualRate, cardOpenRate, cardRenewRate }
 *   - 无配置时返回默认值 20 / 10 / 5
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const config = await getGlobalCommissionConfig();
    return success(config);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetCommissionConfig error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取提成配置失败，请稍后重试');
  }
};
