'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');
const { getGlobalCommissionConfig, addCardCommissionRecord } = require('./_shared/commissionConfig');

const PAYMENT_METHODS = ['cash', 'wechat', 'alipay', 'meituan'];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 按卡种有效期规则计算次卡截止时间
 * @param {Record<string, unknown>} cardType
 * @param {Date} now
 * @returns {Date | null}
 */
function computeExpiresAt(cardType, now) {
  if (cardType.validityType === 'days') {
    return new Date(now.getTime() + cardType.validityDays * DAY_MS);
  }
  if (cardType.validityType === 'fixed_date') {
    return new Date(`${cardType.fixedExpireDate}T23:59:59.999`);
  }
  return null;
}

/**
 * 次卡销售（为会员开次卡）
 *
 * 入参：{ memberId, cardTypeId, paidAmount?, paymentMethod, commissionTechnicianId（提成员工，必填） }
 *   - paidAmount：实收金额（分），缺省按卡种售价；提供时必须等于卡种售价（一口价）
 *   - paymentMethod：cash / wechat / alipay / meituan
 *
 * 行为：售卡金额计预收款，不生成消费记录、不产生积分；按实收金额 × 全局开卡提成比例
 *       为指定员工计提开卡提成；开卡时快照卡种规则（含单次折算价 floor(售价/总次数)）
 *
 * 返回：{ card }
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const memberId = String(event.memberId || '').trim();
    const cardTypeId = String(event.cardTypeId || '').trim();
    if (!memberId || !cardTypeId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员与卡种不能为空');
    }
    const paymentMethod = String(event.paymentMethod || '').trim();
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '支付方式无效');
    }
    const commissionTechnicianId = String(event.commissionTechnicianId || '').trim();
    if (!commissionTechnicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请选择提成员工');
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

    const { data: memberList } = await db.collection('members').where({ memberId }).limit(1).get();
    if (memberList.length === 0) {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
    }
    const memberName = memberList[0].nickName || memberList[0].name || '';

    let cardType;
    try {
      const res = await db.collection('session_card_types').doc(cardTypeId).get();
      cardType = res.data;
    } catch (_e) {
      cardType = null;
    }
    if (!cardType || !cardType._id) {
      return error(AdminErrorCode.NOT_FOUND, '次卡卡种不存在');
    }
    if (cardType.active === false) {
      return error(AdminErrorCode.VALIDATION_ERROR, '该卡种已停用，不可新开卡');
    }

    const paidAmount = event.paidAmount === undefined ? cardType.price : Number(event.paidAmount);
    if (!Number.isInteger(paidAmount) || paidAmount < 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '实收金额必须为非负整数（分）');
    }
    if (paidAmount !== cardType.price) {
      return error(AdminErrorCode.VALIDATION_ERROR, '实收金额必须等于卡种售价');
    }

    const now = new Date();
    const sessionValue = Math.floor(cardType.price / cardType.totalSessions);
    const cardData = {
      memberId,
      cardTypeId,
      cardTypeName: cardType.name,
      snapshot: {
        name: cardType.name,
        price: cardType.price,
        totalSessions: cardType.totalSessions,
        sessionValue,
        categoryId: cardType.categoryId,
        categoryName: cardType.categoryName || '',
        baseItemScope: cardType.baseItemScope,
        baseItemIds: cardType.baseItemIds || [],
        coveredAddonIds: cardType.coveredAddonIds || [],
        refundPolicy: cardType.refundPolicy || 'none',
      },
      paidAmount,
      paymentMethod,
      totalSessions: cardType.totalSessions,
      remainingSessions: cardType.totalSessions,
      expiresAt: computeExpiresAt(cardType, now),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    const addResult = await db.collection('member_session_cards').add({ data: cardData });

    const config = await getGlobalCommissionConfig();
    const { commissionAmount } = await addCardCommissionRecord({
      type: 'card_open',
      technicianId: commissionTechnicianId,
      serviceAmount: paidAmount,
      commissionRate: config.cardOpenRate,
      cardId: addResult._id,
      memberId,
      createdAt: now,
    });

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'issue_session_card',
        targetType: 'member_session_card',
        targetId: addResult._id,
        targetName: cardType.name || '',
        detail: `为会员 ${memberName} 售出次卡「${cardType.name}」，实收 ${paidAmount} 分（计预收），${cardType.totalSessions} 次，开卡提成 ${commissionAmount} 分（${config.cardOpenRate}%，员工 ${commissionTechnicianDoc.name || ''}）`,
        createdAt: now,
      },
    });

    return success({ card: { _id: addResult._id, ...cardData } });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminIssueSessionCard error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '次卡销售失败，请稍后重试');
  }
};
