'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');
/**
 * 解除会员与会员卡关联。
 * @param {{ memberId: string, cardId?: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }
    const memberId = String(event.memberId || '').trim();
    const cardId = String(event.cardId || '').trim();
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }
    if (!cardId) {
      const { data: cardList } = await db.collection('member_cards').where({ memberId }).limit(1).get();
      const card = cardList[0];
      if (!card) {
        return error(AdminErrorCode.NOT_FOUND, '该会员暂无关联会员卡');
      }
      const now = new Date();
      await db.collection('member_cards').doc(card._id).update({
        data: {
          memberId: '',
          updatedAt: now,
        },
      });
      await db.collection('operation_logs').add({
        data: {
          adminId: adminInfo.adminId,
          adminName: adminInfo.username || '',
          action: 'unbind_member_card',
          targetType: 'member_card',
          targetId: card._id,
          detail: `解除会员 ${memberId} 与会员卡 ${card._id} 的关联`,
          createdAt: now,
        },
      });
      return success({ ...card, memberId: '' });
    }
    let cardDoc;
    try {
      const cardRes = await db.collection('member_cards').doc(cardId).get();
      cardDoc = cardRes.data;
    } catch (_e) {
      return error(AdminErrorCode.NOT_FOUND, '会员卡不存在');
    }
    if (!cardDoc) {
      return error(AdminErrorCode.NOT_FOUND, '会员卡不存在');
    }
    if (cardDoc.memberId !== memberId) {
      return error(AdminErrorCode.CONFLICT, '会员卡未关联到该会员');
    }
    const now = new Date();
    await db.collection('member_cards').doc(cardId).update({
      data: {
        memberId: '',
        updatedAt: now,
      },
    });
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'unbind_member_card',
        targetType: 'member_card',
        targetId: cardId,
        detail: `解除会员 ${memberId} 与会员卡 ${cardId} 的关联`,
        createdAt: now,
      },
    });
    const { data: updatedCard } = await db.collection('member_cards').doc(cardId).get();
    return success(updatedCard);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUnbindMemberCard error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '解除关联失败，请稍后重试');
  }
};
