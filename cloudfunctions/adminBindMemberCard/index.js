'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');
/**
 * 关联会员与会员卡。
 * @param {{ memberId: string, cardId: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    const memberId = String(event.memberId || '').trim();
    const cardId = String(event.cardId || '').trim();
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }
    if (!cardId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员卡 ID 不能为空');
    }
    const { data: memberList } = await db.collection('members').where({ memberId }).limit(1).get();
    const memberDoc = memberList[0];
    if (!memberDoc) {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
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
    if (cardDoc.memberId && cardDoc.memberId !== memberId) {
      return error(AdminErrorCode.CONFLICT, '会员卡已关联其他会员');
    }
    const now = new Date();
    await db.collection('member_cards').doc(cardId).update({
      data: {
        memberId,
        updatedAt: now,
      },
    });
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'bind_member_card',
        targetType: 'member_card',
        targetId: cardId,
        detail: `关联会员卡 ${cardId} 到会员 ${memberId}`,
        createdAt: now,
      },
    });
    const { data: updatedCard } = await db.collection('member_cards').doc(cardId).get();
    return success(updatedCard);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminBindMemberCard error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '关联会员卡失败，请稍后重试');
  }
};
