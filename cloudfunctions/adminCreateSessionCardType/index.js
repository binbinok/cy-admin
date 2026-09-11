'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminError, AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

const VALID_VALIDITY_TYPES = ['permanent', 'days', 'fixed_date'];
const VALID_REFUND_POLICIES = ['none', 'prorated'];

/**
 * 校验并规范化卡种规则字段，返回可直接落库的规则对象
 * @param {Record<string, unknown>} event
 * @returns {Record<string, unknown>}
 */
function normalizeCardTypeRules(event) {
  const name = String(event.name || '').trim();
  if (!name) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '卡种名称不能为空');
  }
  const price = Number(event.price);
  if (!Number.isInteger(price) || price <= 0) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '售价必须为大于 0 的整数（分）');
  }
  const totalSessions = Number(event.totalSessions);
  if (!Number.isInteger(totalSessions) || totalSessions <= 0) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '总次数必须为大于 0 的整数');
  }
  const baseItemScope = String(event.baseItemScope || 'all');
  if (!['all', 'selected'].includes(baseItemScope)) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '基础项目覆盖范围无效');
  }
  const baseItemIds = Array.isArray(event.baseItemIds)
    ? event.baseItemIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  if (baseItemScope === 'selected' && baseItemIds.length === 0) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '指定基础项目时清单不能为空');
  }
  const coveredAddonIds = Array.isArray(event.coveredAddonIds)
    ? event.coveredAddonIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const validityType = String(event.validityType || 'permanent');
  if (!VALID_VALIDITY_TYPES.includes(validityType)) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '有效期规则无效');
  }
  const validityDays = Number(event.validityDays) || 0;
  if (validityType === 'days' && (!Number.isInteger(validityDays) || validityDays <= 0)) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '有效天数必须为大于 0 的整数');
  }
  const fixedExpireDate = String(event.fixedExpireDate || '').trim();
  if (validityType === 'fixed_date' && !/^\d{4}-\d{2}-\d{2}$/.test(fixedExpireDate)) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '固定截止日期格式应为 YYYY-MM-DD');
  }
  const refundPolicy = String(event.refundPolicy || 'none');
  if (!VALID_REFUND_POLICIES.includes(refundPolicy)) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '退卡规则无效');
  }
  return {
    name,
    price,
    totalSessions,
    baseItemScope,
    baseItemIds: baseItemScope === 'selected' ? baseItemIds : [],
    coveredAddonIds,
    validityType,
    validityDays: validityType === 'days' ? validityDays : 0,
    fixedExpireDate: validityType === 'fixed_date' ? fixedExpireDate : '',
    refundPolicy,
  };
}

/**
 * 创建次卡卡种
 *
 * 入参：{ name, price, totalSessions, categoryId, baseItemScope, baseItemIds?,
 *        coveredAddonIds?, validityType, validityDays?, fixedExpireDate?, refundPolicy }
 *
 * 返回：{ cardTypeId }
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const categoryId = String(event.categoryId || '').trim();
    if (!categoryId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '适用服务大类不能为空');
    }

    let rules;
    try {
      rules = normalizeCardTypeRules(event);
    } catch (err) {
      if (err.code) {
        return error(err.code, err.message);
      }
      throw err;
    }

    const { data: categoryList } = await db
      .collection('service_categories')
      .where({ _id: categoryId })
      .limit(1)
      .get();
    const category = categoryList[0];
    if (!category) {
      return error(AdminErrorCode.VALIDATION_ERROR, '适用服务大类不存在');
    }

    const now = new Date();
    const cardTypeData = {
      ...rules,
      categoryId,
      categoryName: category.name || '',
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    const addResult = await db.collection('session_card_types').add({ data: cardTypeData });

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'create_session_card_type',
        targetType: 'session_card_type',
        targetId: addResult._id,
        targetName: rules.name || '',
        detail: `创建次卡卡种「${rules.name}」，售价 ${rules.price} 分，${rules.totalSessions} 次，适用大类 ${category.name || categoryId}`,
        createdAt: now,
      },
    });

    return success({ cardTypeId: addResult._id });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCreateSessionCardType error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '创建次卡卡种失败，请稍后重试');
  }
};
