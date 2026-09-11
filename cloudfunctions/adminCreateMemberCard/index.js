'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');
const { getGlobalCommissionConfig, addCardCommissionRecord } = require('./_shared/commissionConfig');

/**
 * 为会员开通新会员卡（选择折扣等级 + 首充金额 + 提成员工，直接归属该会员）。
 *
 * 入参：{ memberId, discountLevelId, amount（首充金额，单位：分，必填且 > 0）, commissionTechnicianId（提成员工，必填） }
 *
 * @param {object} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const memberId = String(event.memberId || '').trim();
    const discountLevelId = String(event.discountLevelId || '').trim();
    const commissionTechnicianId = String(event.commissionTechnicianId || '').trim();
    const amount = Number(event.amount);
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }
    if (!discountLevelId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请选择折扣等级');
    }
    if (!commissionTechnicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请选择提成员工');
    }
    if (isNaN(amount) || !Number.isInteger(amount) || amount <= 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '充值金额必须为大于 0 的整数（单位：分）');
    }

    let commissionTechnicianDoc;
    try {
      const techRes = await db.collection('technicians').doc(commissionTechnicianId).get();
      commissionTechnicianDoc = techRes.data;
    } catch (_e) {
      commissionTechnicianDoc = null;
    }
    if (!commissionTechnicianDoc || !commissionTechnicianDoc._id) {
      return error(AdminErrorCode.VALIDATION_ERROR, '提成员工不存在');
    }

    const { data: memberList } = await db
      .collection('members')
      .where({ memberId })
      .limit(1)
      .get();
    if (!(memberList || [])[0]) {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
    }

    const memberDoc = memberList[0];
    const memberName = memberDoc.nickName || memberDoc.name || '';

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

    const config = await getGlobalCommissionConfig();
    const { commissionAmount } = await addCardCommissionRecord({
      type: 'card_open',
      technicianId: commissionTechnicianId,
      serviceAmount: amount,
      commissionRate: config.cardOpenRate,
      cardId,
      memberId,
      createdAt: now,
    });

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'create_member_card',
        targetType: 'member_card',
        targetId: cardId,
        targetName: levelDoc.name || '',
        detail: `为会员 ${memberName} 开通「${levelDoc.name || ''}」会员卡，首充 ${amount} 分，开卡提成 ${commissionAmount} 分（${config.cardOpenRate}%，员工 ${commissionTechnicianDoc.name || ''}）`,
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
