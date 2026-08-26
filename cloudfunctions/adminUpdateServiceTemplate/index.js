'use strict';

const crypto = require('crypto');
const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminError, AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

const VALID_INPUT_TYPES = ['single_select', 'multi_select', 'number', 'text'];

/**
 * 生成模板项目 ID
 * @returns {string}
 */
function generateItemId() {
  return `item_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * 校验并规范化模板项目列表（保留已有 itemId 以维持结算快照关联）
 * @param {Array} items
 * @param {string} fieldLabel
 * @returns {Array}
 */
function normalizeTemplateItems(items, fieldLabel) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((raw) => {
    const name = String(raw.name || '').trim();
    if (!name) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, `${fieldLabel}名称不能为空`);
    }
    const inputType = String(raw.inputType || 'single_select').trim();
    if (!VALID_INPUT_TYPES.includes(inputType)) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, `${fieldLabel}「${name}」录入格式无效`);
    }
    const defaultPrice = Number(raw.defaultPrice) || 0;
    if (!Number.isInteger(defaultPrice) || defaultPrice < 0) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, `${fieldLabel}「${name}」默认价格必须为非负整数（分）`);
    }
    const defaultDuration = Number(raw.defaultDuration) || 0;
    if (!Number.isInteger(defaultDuration) || defaultDuration < 0) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, `${fieldLabel}「${name}」默认时长必须为非负整数（分钟）`);
    }
    const options = Array.isArray(raw.options) ? raw.options.map((o) => String(o).trim()).filter(Boolean) : [];
    if ((inputType === 'single_select' || inputType === 'multi_select') && options.length === 0) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, `${fieldLabel}「${name}」为选择类格式时必须配置候选项`);
    }
    return {
      itemId: String(raw.itemId || '').trim() || generateItemId(),
      name,
      inputType,
      options,
      defaultPrice,
      defaultDuration,
      discountable: raw.discountable !== false,
      commissionable: raw.commissionable !== false,
      enabled: raw.enabled !== false,
    };
  });
}

/**
 * 更新服务模板
 *
 * 入参：{ templateId, defaultDuration?, baseItems?, addonItems?, sort? }
 * 仅更新传入的字段；模板编辑不影响已生成结算记录中的项目快照。
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const templateId = String(event.templateId || '').trim();
    if (!templateId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '模板 ID 不能为空');
    }

    const { data: template } = await db.collection('service_templates').doc(templateId).get();
    if (!template) {
      return error(AdminErrorCode.NOT_FOUND, '服务模板不存在');
    }

    const updateData = { updatedAt: new Date() };
    if (event.defaultDuration !== undefined) {
      const defaultDuration = Number(event.defaultDuration);
      if (!Number.isInteger(defaultDuration) || defaultDuration <= 0) {
        return error(AdminErrorCode.VALIDATION_ERROR, '默认预约时长必须为大于 0 的整数（分钟）');
      }
      updateData.defaultDuration = defaultDuration;
    }
    if (event.sort !== undefined) {
      updateData.sort = Number(event.sort) || 0;
    }
    try {
      if (event.baseItems !== undefined) {
        updateData.baseItems = normalizeTemplateItems(event.baseItems, '基础项目');
        if (updateData.baseItems.length === 0) {
          return error(AdminErrorCode.VALIDATION_ERROR, '至少保留 1 个基础项目');
        }
      }
      if (event.addonItems !== undefined) {
        updateData.addonItems = normalizeTemplateItems(event.addonItems, '附加项目');
      }
    } catch (err) {
      if (err.code) {
        return error(err.code, err.message);
      }
      throw err;
    }

    await db.collection('service_templates').doc(templateId).update({ data: updateData });

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'update_service_template',
        targetType: 'service_template',
        targetId: templateId,
        detail: `更新服务模板，分类 ${template.categoryName || template.categoryId}，更新字段：${Object.keys(updateData).filter((k) => k !== 'updatedAt').join('、') || '无'}`,
        createdAt: new Date(),
      },
    });

    return success({ templateId, message: '服务模板更新成功' });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUpdateServiceTemplate error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '服务模板更新失败，请稍后重试');
  }
};
