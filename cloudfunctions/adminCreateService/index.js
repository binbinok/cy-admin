'use strict';

const { verifyAuth } = require('./_shared/auth');
const { error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');

/**
 * 【已废弃】新增服务项目
 *
 * services 集合的服务项体系已由服务模板（service_templates）替代。
 * 本函数不再写入 services 集合，请改用 adminCreateServiceTemplate。
 * services 集合保留只读，供历史预约与统计数据兜底展示。
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);
    return error(
      AdminErrorCode.VALIDATION_ERROR,
      '服务项目体系已升级为服务模板，请在模板管理中配置（adminCreateServiceTemplate）'
    );
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
