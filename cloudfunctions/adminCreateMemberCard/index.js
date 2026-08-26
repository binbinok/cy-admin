'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 为会员开通新会员卡（选择折扣等级 + 首充金额，直接归属该会员）。
 *
 * 入参：{ memberId, discountLevelId, amount（首充金额，单位：分，必填且 > 0） }
 *
 * @param {object} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const memberId = String(event.memberId || '').trim();
    const discountLevelId = String(event.discountLevelId || '').trim();
    const amount = Number(event.amount);
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }
    if (!discountLevelId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请选择折扣等级');
    }
    if (isNaN(amount) || !Number.isInteger(amount) || amount <= 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '充值金额必须为大于 0 的整数（单位：分）');
    }

    const { data: memberList } = await db
      .collection('members')
      .where({ memberId })
      .limit(1)
      .get();
    if (!(memberList || [])[0]) {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
    }

    let levelDoc;
    try {
      const levelRes = await db.collection('card_discount_levels').doc(discountLevelId).get();
      levelDoc = levelRes.data;
    } catch (_e) {
      return error(AdminErrorCode.NOT_FOUND, '折扣等级不存在');
    }
    if (!levelDoc) {
      return error(AdminErrorCode.NOT_FOUND, '折扣等级不存在');
    }
    const minRecharge = Number(levelDoc.minRechargeAmount) || 0;
    if (minRecharge > 0 && amount < minRecharge) {
      return error(
        AdminErrorCode.VALIDATION_ERROR,
        `该折扣等级最低充值 ${minRecharge} 分，当前金额不满足门槛`
      );
    }

    const { data: existingCards } = await db
      .collection('member_cards')
      .where({ memberId, status: 'active' })
      .limit(1)
      .get();
    if ((existingCards || []).length > 0) {
      return error(AdminErrorCode.CONFLICT, '该会员已持有使用中的会员卡，请勿重复开通');
    }

    const now = new Date();
    const cardData = {
      memberId,
      discountLevelId,
      balance: amount,
      totalRecharge: amount,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    const addRes = await db.collection('member_cards').add({ data: cardData });
    const cardId = addRes._id;

    await db.collection('card_recharge_records').add({
      data: {
        cardId,
        memberId,
        amount,
        balanceAfter: amount,
        operatorAdminId: adminInfo.adminId,
        createdAt: now,
      },
    });

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'create_member_card',
        targetType: 'member_card',
        targetId: cardId,
        detail: `为会员 ${memberId} 开通会员卡 ${cardId}，折扣等级：${levelDoc.name || discountLevelId}，首充 ${amount} 分`,
        createdAt: now,
      },
    });

    const { data: card } = await db.collection('member_cards').doc(cardId).get();
    return success(card);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCreateMemberCard error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '开通会员卡失败，请稍后重试');
  }
};
