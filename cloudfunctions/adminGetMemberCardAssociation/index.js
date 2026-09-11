'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');
/**
 * 查询会员卡关联状态。
 * @param {{ memberId: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const memberId = String(event.memberId || '').trim();
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }

    const { data: memberList } = await db.collection('members').where({ memberId }).limit(1).get();
    if (!memberList[0]) {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
    }
    const { data: cards } = await db
      .collection('member_cards')
      .where({ memberId, status: 'active' })
      .limit(1)
      .get();
    const card = (cards || [])[0] || null;
    return success({
      memberId,
      hasAssociation: !!card,
      card,
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetMemberCardAssociation error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '查询会员卡关联状态失败，请稍后重试');
  }
};
