'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 启用/停用次卡卡种
 *
 * 入参：{ cardTypeId, active }
 *   - 停用后不可新开卡，已售卡照常核销
 *
 * 返回：{ cardTypeId, active }
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const cardTypeId = String(event.cardTypeId || '').trim();
    if (!cardTypeId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '卡种 ID 不能为空');
    }
    if (typeof event.active !== 'boolean') {
      return error(AdminErrorCode.VALIDATION_ERROR, 'active 必须为布尔值');
    }

    let existing;
    try {
      const res = await db.collection('session_card_types').doc(cardTypeId).get();
      existing = res.data;
    } catch (_e) {
      existing = null;
    }
    if (!existing || !existing._id) {
      return error(AdminErrorCode.NOT_FOUND, '次卡卡种不存在');
    }

    await db
      .collection('session_card_types')
      .doc(cardTypeId)
      .update({ data: { active: event.active, updatedAt: new Date() } });

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'toggle_session_card_type',
        targetType: 'session_card_type',
        targetId: cardTypeId,
        targetName: existing.name || '',
        detail: `${event.active ? '启用' : '停用'}次卡卡种「${existing.name || cardTypeId}」`,
        createdAt: new Date(),
      },
    });

    return success({ cardTypeId, active: event.active });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminToggleSessionCardType error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '更新卡种状态失败，请稍后重试');
  }
};
