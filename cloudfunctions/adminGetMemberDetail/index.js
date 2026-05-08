'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 获取会员详情
 * - 返回会员基本信息
 * - 返回持卡信息（member_cards）
 * - 返回近期消费记录（最近 10 条）
 *
 * @param {{ memberId: string }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const memberId = String(event.memberId || '').trim();
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }

    // 查询会员信息
    const { data: members } = await db
      .collection('members')
      .where({ memberId })
      .limit(1)
      .get();

    const member = (members || [])[0];
    if (!member) {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
    }

    // 查询持卡信息
    const { data: cards } = await db
      .collection('member_cards')
      .where({ memberId })
      .limit(1)
      .get();

    const card = (cards || [])[0] || null;

    // 查询近期消费记录（最近 10 条）
    const { data: consumptions } = await db
      .collection('consumption_records')
      .where({ memberId })
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    return success({ member, card, consumptions });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetMemberDetail error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
