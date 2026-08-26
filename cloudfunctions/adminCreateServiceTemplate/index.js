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
 * 校验并规范化模板项目列表
 * @param {Array} items
 * @param {string} fieldLabel - 字段名（用于错误提示）
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
 * 创建服务模板
 *
 * 入参：{ categoryId, defaultDuration, baseItems?, addonItems?, sort? }
 *   - categoryId：服务分类 _id，同一分类仅允许一条模板
 *   - defaultDuration：默认预约时长（分钟，>0 整数）
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const categoryId = String(event.categoryId || '').trim();
    if (!categoryId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务大类不能为空');
    }
    const defaultDuration = Number(event.defaultDuration);
    if (!Number.isInteger(defaultDuration) || defaultDuration <= 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '默认预约时长必须为大于 0 的整数（分钟）');
    }

    const { data: categoryList } = await db.collection('service_categories').where({ _id: categoryId }).limit(1).get();
    const category = categoryList[0];
    if (!category) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务大类不存在');
    }

    const { data: existingList } = await db.collection('service_templates').where({ categoryId }).limit(1).get();
    if (existingList.length > 0) {
      return error(AdminErrorCode.CONFLICT, '该服务大类已存在模板，请直接编辑');
    }

    let baseItems;
    let addonItems;
    try {
      baseItems = normalizeTemplateItems(event.baseItems, '基础项目');
      addonItems = normalizeTemplateItems(event.addonItems, '附加项目');
    } catch (err) {
      if (err.code) {
        return error(err.code, err.message);
      }
      throw err;
    }
    if (baseItems.length === 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '至少配置 1 个基础项目');
    }

    const now = new Date();
    const templateData = {
      categoryId,
      categoryName: category.name || '',
      defaultDuration,
      baseItems,
      addonItems,
      active: true,
      sort: Number(event.sort) || category.sort || 0,
      createdAt: now,
      updatedAt: now,
    };
    const addResult = await db.collection('service_templates').add({ data: templateData });

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'create_service_template',
        targetType: 'service_template',
        targetId: addResult._id,
        detail: `创建服务模板，分类 ${category.name || categoryId}，默认时长 ${defaultDuration} 分钟，基础项目 ${baseItems.length} 个，附加项目 ${addonItems.length} 个`,
        createdAt: now,
      },
    });

    return success({ templateId: addResult._id, message: '服务模板创建成功' });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCreateServiceTemplate error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '服务模板创建失败，请稍后重试');
  }
};
