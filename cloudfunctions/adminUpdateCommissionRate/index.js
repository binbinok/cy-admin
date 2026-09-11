'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');
const { ensureCommissionConfigCollection } = require('./_shared/commissionConfig');

const RATE_FIELDS = ['manualRate', 'cardOpenRate', 'cardRenewRate'];
const RATE_LABELS = {
  manualRate: '手工提成',
  cardOpenRate: '开卡提成',
  cardRenewRate: '续卡提成',
};

function isValidRate(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

/**
 * 设置全局提成比例（手工 / 开卡 / 续卡三类，全员生效）
 *
 * 入参：{ manualRate, cardOpenRate, cardRenewRate }
 *   - 三项均为 0–100 的整数
 *
 * 行为：upsert commission_config 单文档全局配置，并记录操作日志
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    for (const field of RATE_FIELDS) {
      if (!isValidRate(event[field])) {
        return error(
          AdminErrorCode.INVALID_COMMISSION_RATE,
          `${RATE_LABELS[field]}比例必须为 0%–100% 的整数`
        );
      }
    }

    const now = new Date();
    const configData = {
      manualRate: event.manualRate,
      cardOpenRate: event.cardOpenRate,
      cardRenewRate: event.cardRenewRate,
      updatedBy: adminInfo.adminId,
      updatedAt: now,
    };

    await ensureCommissionConfigCollection();
    let existing = [];
    try {
      const res = await db.collection('commission_config').limit(1).get();
      existing = res.data || [];
    } catch (_e) {
      existing = [];
    }
    if (existing.length > 0) {
      await db.collection('commission_config').doc(existing[0]._id).update({ data: configData });
    } else {
      await db.collection('commission_config').add({ data: { ...configData, createdAt: now } });
    }

    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'update_commission_rate',
        targetType: 'commission_config',
        targetId: 'global',
        targetName: '全局提成配置',
        detail: `设置全局提成比例：手工 ${configData.manualRate}%，开卡 ${configData.cardOpenRate}%，续卡 ${configData.cardRenewRate}%`,
        createdAt: now,
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUpdateCommissionRate error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '更新提成比例失败，请稍后重试');
  }
};
