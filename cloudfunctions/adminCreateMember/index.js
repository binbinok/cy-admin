'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 生成会员编号
 * @returns {string}
 */
function generateMemberId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `M${timestamp}${random}`;
}

/**
 * 创建会员
 *
 * @param {{
 *   nickName?: string,
 *   phone?: string,
 *   birthday?: string,
 *   wechatId?: string,
 *   cardId?: string
 * }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const rawNickName = event.nickName ? String(event.nickName).trim() : '';
    const rawPhone = event.phone ? String(event.phone).trim() : '';
    const rawWechatId = event.wechatId ? String(event.wechatId).trim() : '';
    const birthday = event.birthday ? String(event.birthday).trim() : undefined;
    const cardId = event.cardId ? String(event.cardId).trim() : undefined;

    const nickName = rawNickName || undefined;
    const phone = rawPhone || undefined;
    const wechatId = rawWechatId || undefined;

    if (!nickName && !phone && !wechatId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '昵称、手机号、微信号至少填写一项');
    }

    if (nickName && (nickName.length < 2 || nickName.length > 20)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '昵称长度需为 2–20 个字符');
    }

    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '手机号格式不正确');
    }

    if (wechatId && wechatId.length > 50) {
      return error(AdminErrorCode.VALIDATION_ERROR, '微信号长度不能超过 50 个字符');
    }

    if (phone) {
      const { data: existing } = await db
        .collection('members')
        .where({ phone })
        .limit(1)
        .get();

      if (existing && existing.length > 0) {
        return error(AdminErrorCode.PHONE_ALREADY_BOUND, '该手机号已被其他会员使用');
      }
    }

    if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '生日格式不正确，应为 YYYY-MM-DD');
    }

    const now = new Date();
    const memberId = generateMemberId();

    const memberData = {
      memberId,
      openId: '',
      nickName: nickName || '',
      phone: phone || '',
      wechatId: wechatId || '',
      level: 'normal',
      points: 0,
      totalConsumption: 0,
      consumptionCount: 0,
      birthday: birthday || '',
      source: 'admin',
      createdAt: now,
      updatedAt: now,
    };

    const addResult = await db.collection('members').add({
      data: memberData,
    });

    // 如果指定了会员卡，建立关联
    if (cardId) {
      const { data: cards } = await db
        .collection('member_cards')
        .where({ cardId })
        .limit(1)
        .get();

      if (cards && cards.length > 0) {
        await db.collection('member_cards').doc(cards[0]._id).update({
          data: {
            memberId,
            updatedAt: now,
          },
        });
      }
    }

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'create_member',
        targetType: 'member',
        targetId: memberId,
        detail: `创建会员 ${nickName || wechatId || phone || ''}`,
        createdAt: now,
      },
    });

    return success({
      member: { _id: addResult._id, ...memberData },
      message: '会员创建成功',
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCreateMember error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '会员创建失败，请稍后重试');
  }
};
