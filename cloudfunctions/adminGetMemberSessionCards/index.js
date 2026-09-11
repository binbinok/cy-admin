'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 查询会员的次卡列表与核销记录
 *
 * 入参：{ memberId }
 *
 * 返回：{ cards, redemptions }
 *   - cards：按当前时间惰性计算过期状态（active 且已过期时展示为 expired）
 *   - redemptions：该会员次卡的核销流水（按时间倒序，最多 100 条）
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const memberId = String(event.memberId || '').trim();
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }

    const { data: cards } = await db
      .collection('member_session_cards')
      .where({ memberId })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const now = new Date();
    const normalizedCards = cards.map((card) => ({
      ...card,
      status:
        card.status === 'active' && card.expiresAt && new Date(card.expiresAt) <= now
          ? 'expired'
          : card.status,
    }));

    const cardIds = cards.map((card) => card._id);
    let redemptions = [];
    if (cardIds.length > 0) {
      const { data: records } = await db
        .collection('session_card_redemptions')
        .where({ cardId: db.command.in(cardIds) })
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      redemptions = records;
    }

    return success({ cards: normalizedCards, redemptions });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetMemberSessionCards error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取会员次卡失败，请稍后重试');
  }
};
