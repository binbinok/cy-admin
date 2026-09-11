'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 获取次卡卡种列表
 *
 * 入参：{ activeOnly?: boolean }
 *
 * 返回：{ list }，每条记录附带 soldCount（已售出的会员次卡数量）
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const activeOnly = event.activeOnly === true || String(event.activeOnly || '') === 'true';
    const where = activeOnly ? { active: true } : {};

    const { data: types } = await db.collection('session_card_types').where(where).limit(100).get();

    const { data: cards } = await db.collection('member_session_cards').limit(1000).get();
    const countMap = new Map();
    for (const card of cards) {
      const key = card.cardTypeId;
      if (key) {
        countMap.set(key, (countMap.get(key) || 0) + 1);
      }
    }

    const list = types.map((item) => ({
      ...item,
      soldCount: countMap.get(item._id) || 0,
    }));

    return success({ list });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetSessionCardTypes error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取次卡卡种列表失败，请稍后重试');
  }
};
