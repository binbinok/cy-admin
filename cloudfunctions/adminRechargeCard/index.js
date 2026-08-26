'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 会员卡充值
 *
 * 入参：{ memberId, amount }
 *   - amount：充值金额（单位：分），必须 > 0
 *
 * 行为：
 *   1. 查找该会员已关联的会员卡（无卡时报错，引导先关联或开通）
 *   2. 更新余额（increment）和累计充值（increment）
 *   3. 生成充值流水记录
 *   4. 记录操作日志
 *
 * 返回：{ card, rechargeRecord }
 *
 * 需求：2.10、10.8
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const { memberId, amount } = event;

    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }

    const rechargeAmount = Number(amount);
    if (isNaN(rechargeAmount) || !Number.isInteger(rechargeAmount) || rechargeAmount <= 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '充值金额必须为大于 0 的整数（单位：分）');
    }

    const now = new Date();

    // 查找该会员使用中的会员卡
    const { data: existingCards } = await db
      .collection('member_cards')
      .where({ memberId, status: 'active' })
      .get();

    if (existingCards.length === 0) {
      return error(AdminErrorCode.NOT_FOUND, '该会员暂无使用中的会员卡，请先开通会员卡');
    }

    // 已有会员卡，按卡的折扣等级校验最低充值门槛
    const card = existingCards[0];
    if (card.discountLevelId) {
      try {
        const levelRes = await db.collection('card_discount_levels').doc(card.discountLevelId).get();
        const minRecharge = Number(levelRes.data && levelRes.data.minRechargeAmount) || 0;
        if (minRecharge > 0 && rechargeAmount < minRecharge) {
          return error(
            AdminErrorCode.VALIDATION_ERROR,
            `该卡折扣等级最低充值 ${minRecharge} 分，当前金额不满足门槛`
          );
        }
      } catch (_e) {
        // 等级文档缺失时不阻断充值
      }
    }

    const cardId = card._id;
    const balanceAfter = (card.balance || 0) + rechargeAmount;

    await db.collection('member_cards').doc(cardId).update({
      data: {
        balance: _.inc(rechargeAmount),
        totalRecharge: _.inc(rechargeAmount),
        updatedAt: now,
      },
    });

    // 生成充值流水记录
    const rechargeRecord = {
      cardId,
      memberId,
      amount: rechargeAmount,
      balanceAfter,
      operatorAdminId: adminInfo.adminId,
      createdAt: now,
    };
    const recordRes = await db.collection('card_recharge_records').add({ data: rechargeRecord });
    rechargeRecord._id = recordRes._id;

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'recharge_card',
        targetType: 'member_card',
        targetId: cardId,
        detail: `为会员 ${memberId} 充值 ${rechargeAmount} 分，充值后余额 ${balanceAfter} 分`,
        ipAddress: event.ipAddress || '',
        createdAt: now,
      },
    });

    // 读取最新的卡信息返回
    const { data: updatedCard } = await db.collection('member_cards').doc(cardId).get();

    return success({ card: updatedCard, rechargeRecord });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminRechargeCard error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '会员卡充值失败，请稍后重试');
  }
};
