'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 次卡退卡（仅超级管理员）
 *
 * 入参：{ sessionCardId, reason, refundAmount? }
 *   - reason：退卡原因（必填）
 *   - refundAmount：实退金额（分），缺省按 剩余次数 × 单次折算价
 *
 * 行为：按卡种快照退卡规则执行（none 拒绝 / prorated 折算）；
 *       退款走线下，系统只留痕：卡置 refunded、剩余次数清零、写操作日志
 *
 * 返回：{ card, refundAmount }
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '仅超级管理员可退次卡');
    }

    const sessionCardId = String(event.sessionCardId || '').trim();
    const reason = String(event.reason || '').trim();
    if (!sessionCardId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '次卡 ID 不能为空');
    }
    if (!reason) {
      return error(AdminErrorCode.VALIDATION_ERROR, '退卡原因不能为空');
    }

    let card;
    try {
      const res = await db.collection('member_session_cards').doc(sessionCardId).get();
      card = res.data;
    } catch (_e) {
      card = null;
    }
    if (!card || !card._id) {
      return error(AdminErrorCode.NOT_FOUND, '次卡不存在');
    }
    if (card.status !== 'active') {
      return error(AdminErrorCode.VALIDATION_ERROR, '仅使用中的次卡可退');
    }

    const snapshot = card.snapshot || {};
    if ((snapshot.refundPolicy || 'none') !== 'prorated') {
      return error(AdminErrorCode.VALIDATION_ERROR, '该卡种不支持退卡');
    }

    const remaining = Number(card.remainingSessions) || 0;
    const sessionValue = Number(snapshot.sessionValue) || 0;
    const defaultRefund = remaining * sessionValue;
    const refundAmount = event.refundAmount === undefined ? defaultRefund : Number(event.refundAmount);
    if (!Number.isInteger(refundAmount) || refundAmount < 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '退款金额必须为非负整数（分）');
    }

    const now = new Date();
    await db.collection('member_session_cards').doc(card._id).update({
      data: {
        status: 'refunded',
        remainingSessions: 0,
        refundAmount,
        refundReason: reason,
        refundedAt: now,
        refundedBy: adminInfo.adminId,
        updatedAt: now,
      },
    });

    const { data: memberList } = await db
      .collection('members')
      .where({ memberId: card.memberId })
      .limit(1)
      .get();
    const memberDoc = (memberList || [])[0];
    const memberName = memberDoc ? memberDoc.nickName || memberDoc.name || '' : '';
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'refund_session_card',
        targetType: 'member_session_card',
        targetId: card._id,
        targetName: snapshot.name || card.cardTypeName || '',
        detail: `退次卡「${snapshot.name || card.cardTypeName || ''}」（会员 ${memberName}），剩余 ${remaining} 次，退款 ${refundAmount} 分（折算额 ${defaultRefund} 分），原因：${reason}`,
        createdAt: now,
      },
    });

    return success({ card: { ...card, status: 'refunded', remainingSessions: 0 }, refundAmount });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminRefundSessionCard error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '次卡退卡失败，请稍后重试');
  }
};
