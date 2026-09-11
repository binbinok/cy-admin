'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 管理员手动调整会员卡折扣等级
 *
 * 入参：{ memberId, targetLevelId, reason }
 *   - memberId：会员 ID
 *   - targetLevelId：目标折扣等级 ID（须存在且与当前等级不同）
 *   - reason：调整原因（必填）
 *
 * 行为：
 *   1. 仅超级管理员可调用
 *   2. 校验会员持有使用中（active）的会员卡
 *   3. 更新 discountLevelId（允许上调与下调），写入 levelHistory（trigger='manual'）
 *   4. 记录操作日志
 *
 * 返回：{ card }
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '仅超级管理员可调整会员卡等级');
    }

    const { memberId, targetLevelId, reason } = event;

    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }
    if (!targetLevelId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '目标等级不能为空');
    }
    if (!reason || !String(reason).trim()) {
      return error(AdminErrorCode.VALIDATION_ERROR, '调整原因不能为空');
    }

    // 校验目标等级存在
    let targetLevel;
    try {
      const levelRes = await db.collection('card_discount_levels').doc(targetLevelId).get();
      targetLevel = levelRes.data;
    } catch (_e) {
      targetLevel = null;
    }
    if (!targetLevel || !targetLevel._id) {
      return error(AdminErrorCode.NOT_FOUND, '目标折扣等级不存在');
    }

    // 查找该会员使用中的会员卡
    const { data: existingCards } = await db
      .collection('member_cards')
      .where({ memberId, status: 'active' })
      .get();

    if (existingCards.length === 0) {
      return error(AdminErrorCode.NOT_FOUND, '该会员暂无使用中的会员卡');
    }

    const card = existingCards[0];
    if (card.discountLevelId === targetLevelId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '目标等级与当前等级相同，无需调整');
    }

    // 读取当前等级名称用于留痕（缺失时按未设置处理）
    let fromLevelName = '未设置';
    if (card.discountLevelId) {
      try {
        const fromRes = await db.collection('card_discount_levels').doc(card.discountLevelId).get();
        if (fromRes.data && fromRes.data.name) {
          fromLevelName = fromRes.data.name;
        }
      } catch (_e) {
        // 等级文档缺失时按未设置留痕
      }
    }

    const now = new Date();
    const historyEntry = {
      fromLevelId: card.discountLevelId || '',
      fromLevelName,
      toLevelId: targetLevel._id,
      toLevelName: targetLevel.name,
      trigger: 'manual',
      reason: String(reason).trim(),
      operatorAdminId: adminInfo.adminId,
      createdAt: now,
    };

    await db
      .collection('member_cards')
      .doc(card._id)
      .update({
        data: {
          discountLevelId: targetLevel._id,
          levelHistory: _.push([historyEntry]),
          updatedAt: now,
        },
      });

    // 记录操作日志
    const { data: memberList } = await db
      .collection('members')
      .where({ memberId })
      .limit(1)
      .get();
    const memberDoc = (memberList || [])[0];
    const memberName = memberDoc ? memberDoc.nickName || memberDoc.name || '' : '';
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'update_card_level',
        targetType: 'member_card',
        targetId: card._id,
        targetName: targetLevel.name,
        detail: `手动调整会员 ${memberName} 的会员卡等级：「${fromLevelName}」→「${targetLevel.name}」，原因：${historyEntry.reason}`,
        ipAddress: event.ipAddress || '',
        createdAt: now,
      },
    });

    const { data: updatedCard } = await db.collection('member_cards').doc(card._id).get();

    return success({ card: updatedCard });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUpdateCardLevel error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '调整会员卡等级失败，请稍后重试');
  }
};
