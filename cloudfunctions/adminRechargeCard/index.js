'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');
const { getGlobalCommissionConfig, addCardCommissionRecord } = require('./_shared/commissionConfig');

/**
 * 会员卡充值
 *
 * 入参：{ memberId, amount, commissionTechnicianId（提成员工，必填） }
 *   - amount：充值金额（单位：分），必须 > 0
 *
 * 行为：
 *   1. 查找该会员使用中的会员卡（无卡时报错，引导先开通）
 *   2. 按当前等级校验最低充值门槛；充值金额达到更高等级门槛时自动升级到满足门槛的最高等级（只升不降）
 *   3. 更新余额（increment）和累计充值（increment），升级时同步写入 discountLevelId 与 levelHistory
 *   4. 生成充值流水记录（升级时携带 levelUpgrade），升级时额外记录 upgrade_card_level 操作日志
 *
 * 返回：{ card, rechargeRecord, levelUpgraded? }
 *
 * 需求：2.10、10.8
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const { memberId, amount } = event;
    const commissionTechnicianId = String(event.commissionTechnicianId || '').trim();

    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }

    if (!commissionTechnicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请选择提成员工');
    }

    const rechargeAmount = Number(amount);
    if (isNaN(rechargeAmount) || !Number.isInteger(rechargeAmount) || rechargeAmount <= 0) {
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

    const now = new Date();

    // 查找该会员使用中的会员卡
    const { data: existingCards } = await db
      .collection('member_cards')
      .where({ memberId, status: 'active' })
      .get();

    if (existingCards.length === 0) {
      return error(AdminErrorCode.NOT_FOUND, '该会员暂无使用中的会员卡，请先开通会员卡');
    }

    // 已有会员卡，加载全部折扣等级并按门槛升序排序（门槛相同按折扣率小者为高）
    const card = existingCards[0];
    const { data: memberList } = await db
      .collection('members')
      .where({ memberId })
      .limit(1)
      .get();
    const memberDoc = (memberList || [])[0];
    const memberName = memberDoc ? memberDoc.nickName || memberDoc.name || '' : '';
    const { data: allLevels } = await db.collection('card_discount_levels').get();
    const sortedLevels = (allLevels || [])
      .slice()
      .sort((a, b) => {
        const ma = Number(a.minRechargeAmount) || 0;
        const mb = Number(b.minRechargeAmount) || 0;
        if (ma !== mb) {
          return ma - mb;
        }
        return (Number(b.discountRate) || 0) - (Number(a.discountRate) || 0);
      });
    const currentLevel = sortedLevels.find((l) => l._id === card.discountLevelId);

    // 按当前等级校验最低充值门槛（等级文档缺失时不阻断充值）
    if (card.discountLevelId && currentLevel) {
      const minRecharge = Number(currentLevel.minRechargeAmount) || 0;
      if (minRecharge > 0 && rechargeAmount < minRecharge) {
        return error(
          AdminErrorCode.VALIDATION_ERROR,
          `该卡折扣等级最低充值 ${minRecharge} 分，当前金额不满足门槛`
        );
      }
    }

    // 升级判定：满足门槛且排序高于当前等级的最高者（只升不降，支持跨级）
    const currentRank = currentLevel ? sortedLevels.indexOf(currentLevel) : -1;
    const targetLevel = sortedLevels.reduce((best, level, idx) => {
      const min = Number(level.minRechargeAmount) || 0;
      if (min <= 0 || min > rechargeAmount || idx <= currentRank) {
        return best;
      }
      return level;
    }, null);

    const cardId = card._id;
    const balanceAfter = (card.balance || 0) + rechargeAmount;

    const updateData = {
      balance: _.inc(rechargeAmount),
      totalRecharge: _.inc(rechargeAmount),
      updatedAt: now,
    };
    let levelUpgraded = null;
    if (targetLevel) {
      levelUpgraded = {
        fromLevelId: currentLevel ? currentLevel._id : card.discountLevelId || '',
        fromLevelName: currentLevel ? currentLevel.name : '未设置',
        toLevelId: targetLevel._id,
        toLevelName: targetLevel.name,
      };
      updateData.discountLevelId = targetLevel._id;
      updateData.levelHistory = _.push([
        {
          fromLevelId: levelUpgraded.fromLevelId,
          fromLevelName: levelUpgraded.fromLevelName,
          toLevelId: levelUpgraded.toLevelId,
          toLevelName: levelUpgraded.toLevelName,
          trigger: 'recharge',
          rechargeAmount,
          operatorAdminId: adminInfo.adminId,
          createdAt: now,
        },
      ]);
    }

    await db.collection('member_cards').doc(cardId).update({ data: updateData });

    // 生成充值流水记录（升级时携带等级变更信息）
    const rechargeRecord = {
      cardId,
      memberId,
      amount: rechargeAmount,
      balanceAfter,
      operatorAdminId: adminInfo.adminId,
      createdAt: now,
    };
    if (levelUpgraded) {
      rechargeRecord.levelUpgrade = {
        fromLevelId: levelUpgraded.fromLevelId,
        toLevelId: levelUpgraded.toLevelId,
      };
    }
    const recordRes = await db.collection('card_recharge_records').add({ data: rechargeRecord });
    rechargeRecord._id = recordRes._id;

    const config = await getGlobalCommissionConfig();
    const { commissionAmount } = await addCardCommissionRecord({
      type: 'card_renew',
      technicianId: commissionTechnicianId,
      serviceAmount: rechargeAmount,
      commissionRate: config.cardRenewRate,
      cardId,
      memberId,
      createdAt: now,
    });

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'recharge_card',
        targetType: 'member_card',
        targetId: cardId,
        targetName: targetLevel ? targetLevel.name : currentLevel ? currentLevel.name : '',
        detail: `为会员 ${memberName} 充值 ${rechargeAmount} 分，充值后余额 ${balanceAfter} 分，续卡提成 ${commissionAmount} 分（${config.cardRenewRate}%，员工 ${commissionTechnicianDoc.name || ''}）`,
        ipAddress: event.ipAddress || '',
        createdAt: now,
      },
    });
    if (levelUpgraded) {
      await db.collection('operation_logs').add({
        data: {
          adminId: adminInfo.adminId,
          adminName: adminInfo.adminId,
          action: 'upgrade_card_level',
          targetType: 'member_card',
          targetId: cardId,
          targetName: levelUpgraded.toLevelName,
          detail: `会员 ${memberName} 充值达标，会员卡等级由「${levelUpgraded.fromLevelName}」升级为「${levelUpgraded.toLevelName}」（充值 ${rechargeAmount} 分）`,
          ipAddress: event.ipAddress || '',
          createdAt: now,
        },
      });
    }

    // 读取最新的卡信息返回
    const { data: updatedCard } = await db.collection('member_cards').doc(cardId).get();

    return success({
      card: updatedCard,
      rechargeRecord,
      ...(levelUpgraded ? { levelUpgraded } : {}),
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminRechargeCard error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '会员卡充值失败，请稍后重试');
  }
};
