'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success } = require('./_shared/response');
const { db } = require('./_shared/db');

/**
 * 数据库初始化
 * 1. 创建缺失的集合（CloudBase 要求集合显式创建后才能读写）
 * 2. 记录建议创建的索引（需控制台手动创建）
 *
 * @param {{ force?: boolean }} event
 */
exports.main = async (event = {}) => {
  try {
    // 注意：生产环境应该启用认证
    // verifyAuth(event);

    const results = [];

    const collections = [
      'admin_accounts',
      'members',
      'technicians',
      'services',
      'service_templates',
      'appointments',
      'operation_logs',
      'discount_levels',
      'member_cards',
      'consumption_records',
      'commission_records',
      'card_recharge_records',
      'card_consumption_records',
      'session_card_types',
      'member_session_cards',
      'session_card_redemptions',
      'counters',
    ];

    for (const name of collections) {
      try {
        await db.createCollection(name);
        results.push({ collection: name, status: 'created' });
      } catch (err) {
        const message = String((err && err.message) || '');
        if (message.includes('exist') || message.includes('already')) {
          results.push({ collection: name, status: 'exists' });
        } else {
          results.push({ collection: name, status: 'failed', message });
        }
      }
    }

    // 记录需要创建的索引信息
    const indexes = [
      {
        collection: 'consumption_records',
        name: 'technicianId_1_createdAt_-1',
        fields: { technicianId: 1, createdAt: -1 },
      },
      {
        collection: 'consumption_records',
        name: 'paymentDetails.paymentType_1',
        fields: { 'paymentDetails.paymentType': 1 },
      },
      {
        collection: 'appointments',
        name: 'technicianId_1_appointmentDate_1',
        fields: { technicianId: 1, appointmentDate: 1 },
      },
      {
        collection: 'appointments',
        name: 'appointmentId_1',
        fields: { appointmentId: 1 },
        note: '编号每日重置、跨日重复属预期；若控制台存在旧版唯一索引 appointmentId_1 必须删除，否则写入会冲突',
      },
      {
        collection: 'members',
        name: 'phone_1',
        fields: { phone: 1 },
        unique: true,
        sparse: true,
      },
      {
        collection: 'members',
        name: 'memberId_1',
        fields: { memberId: 1 },
        unique: true,
      },
      {
        collection: 'operation_logs',
        name: 'adminId_1_createdAt_-1',
        fields: { adminId: 1, createdAt: -1 },
      },
      {
        collection: 'service_templates',
        name: 'categoryId_1',
        fields: { categoryId: 1 },
        unique: true,
      },
      {
        collection: 'consumption_records',
        name: 'categoryId_1_createdAt_-1',
        fields: { categoryId: 1, createdAt: -1 },
      },
      {
        collection: 'member_session_cards',
        name: 'memberId_1_status_1',
        fields: { memberId: 1, status: 1 },
      },
      {
        collection: 'session_card_redemptions',
        name: 'cardId_1_createdAt_-1',
        fields: { cardId: 1, createdAt: -1 },
      },
      {
        collection: 'card_consumption_records',
        name: 'cardId_1_createdAt_-1',
        fields: { cardId: 1, createdAt: -1 },
      },
      {
        collection: 'card_consumption_records',
        name: 'memberId_1_createdAt_-1',
        fields: { memberId: 1, createdAt: -1 },
      },
    ];

    // 由于 CloudBase Node SDK 不直接支持 createIndex
    // 这里记录索引信息，提示用户在控制台创建
    for (const idx of indexes) {
      results.push({
        collection: idx.collection,
        index: idx.name,
        fields: idx.fields,
        status: 'manual_required',
        message: '请在 CloudBase 控制台手动创建此索引',
        note: idx.note || '',
      });
    }

    return success({
      message: '数据库初始化完成：集合已创建，索引请在 CloudBase 控制台手动创建',
      results,
    });
  } catch (err) {
    return success({
      message: '索引初始化完成（部分操作需手动在控制台完成）',
      error: err.message,
    });
  }
};
