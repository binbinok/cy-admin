'use strict';

const bcrypt = require('bcryptjs');
const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

const BCRYPT_HASH_PREFIX_PATTERN = /^\$2[aby]\$/;
const VALID_BALANCE_ACTIONS = ['refunded_offline', 'cleared'];

/**
 * 兼容历史明文密码的管理员密码校验。
 * @param {string} password
 * @param {{ passwordHash?: string, password?: string }} admin
 */
async function verifyPasswordWithLegacySupport(password, admin) {
  const passwordHash = String(admin.passwordHash || '');
  const legacyPassword = String(admin.password || '');
  if (BCRYPT_HASH_PREFIX_PATTERN.test(passwordHash)) {
    return bcrypt.compare(password, passwordHash);
  }
  return passwordHash === password || legacyPassword === password;
}

/**
 * 注销会员卡（卡留档在原会员名下，status → cancelled，不流通）。
 * 校验：仅超级管理员 + 必填注销原因 + 会员手机号后 4 位 + 当前管理员密码。
 * 余额 > 0 时必填 balanceAction：refunded_offline（已线下退款，余额留档）/ cleared（余额清零）。
 * 留痕：operation_logs 记录原因与余额处理；member_cards 记录 cancelReason/cancelledAt/cancelledBy。
 *
 * @param {{ memberId: string, reason: string, phoneLast4: string, password: string, balanceAction?: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const memberId = String(event.memberId || '').trim();
    const reason = String(event.reason || '').trim();
    const phoneLast4 = String(event.phoneLast4 || '').trim();
    const password = String(event.password || '');
    const balanceAction = String(event.balanceAction || '').trim();

    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }
    if (!reason) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请填写注销原因');
    }
    if (!/^\d{4}$/.test(phoneLast4)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请输入会员手机号后 4 位');
    }
    if (!password) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请输入管理员密码');
    }

    const { data: memberList } = await db
      .collection('members')
      .where({ memberId })
      .limit(1)
      .get();
    const member = (memberList || [])[0];
    if (!member) {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
    }
    const memberPhone = String(member.phone || '');
    if (!memberPhone || memberPhone.slice(-4) !== phoneLast4) {
      return error(AdminErrorCode.VALIDATION_ERROR, '手机号后 4 位不匹配，请确认会员身份');
    }

    const { data: accounts } = await db
      .collection('admin_accounts')
      .where({ adminId: adminInfo.adminId })
      .limit(1)
      .get();
    const admin = (accounts || [])[0];
    if (!admin) {
      return error(AdminErrorCode.NOT_FOUND, '管理员不存在');
    }
    const passwordMatched = await verifyPasswordWithLegacySupport(password, admin);
    if (!passwordMatched) {
      return error(AdminErrorCode.AUTH_FAILED, '管理员密码错误');
    }

    const { data: cardList } = await db
      .collection('member_cards')
      .where({ memberId, status: 'active' })
      .limit(1)
      .get();
    const cardDoc = cardList[0];
    if (!cardDoc) {
      return error(AdminErrorCode.NOT_FOUND, '该会员暂无使用中的会员卡');
    }

    const currentBalance = Number(cardDoc.balance) || 0;
    if (currentBalance > 0 && !VALID_BALANCE_ACTIONS.includes(balanceAction)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '卡内存在余额，请选择余额处理方式');
    }

    const now = new Date();
    const updateData = {
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: now,
      cancelledBy: adminInfo.adminId,
      updatedAt: now,
    };
    if (currentBalance > 0) {
      updateData.balanceAction = balanceAction;
      if (balanceAction === 'cleared') {
        updateData.balance = 0;
      }
    }
    await db.collection('member_cards').doc(cardDoc._id).update({ data: updateData });

    const balanceText = currentBalance > 0
      ? `，余额 ${currentBalance} 分处理方式：${balanceAction === 'cleared' ? '清零' : '已线下退款'}`
      : '';
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'cancel_member_card',
        targetType: 'member_card',
        targetId: cardDoc._id,
        detail: `注销会员 ${memberId} 的会员卡 ${cardDoc._id}，原因：${reason}${balanceText}`,
        createdAt: now,
      },
    });

    const { data: updatedCard } = await db.collection('member_cards').doc(cardDoc._id).get();
    return success(updatedCard);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCancelMemberCard error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '注销会员卡失败，请稍后重试');
  }
};
