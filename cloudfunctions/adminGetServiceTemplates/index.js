'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 获取服务模板列表（管理端模板管理页 / 预约与结算表单选项）
 *
 * 入参：{ activeOnly?: boolean }
 *   - activeOnly 为 true 时仅返回启用模板（默认 false 返回全部）
 *
 * 返回：模板数组，每个模板含 categoryId / categoryName / defaultDuration /
 *       baseItems / addonItems / active / sort
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const activeOnly = event.activeOnly === true || String(event.activeOnly || '') === 'true';
    const where = activeOnly ? { active: true } : {};

    const { data: list } = await db.collection('service_templates')
      .where(where)
      .orderBy('sort', 'asc')
      .limit(100)
      .get();

    return success(list);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetServiceTemplates error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取服务模板列表失败，请稍后重试');
  }
};
