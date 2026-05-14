'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success } = require('./_shared/response');
const { db } = require('./_shared/db');

/**
 * 数据库索引初始化
 * 用于创建或更新集合的索引，提升查询性能
 *
 * @param {{ force?: boolean }} event
 */
exports.main = async (event = {}) => {
  try {
    // 注意：生产环境应该启用认证
    // verifyAuth(event);

    const results = [];

    // CloudBase NoSQL 索引创建方式
    // 使用 collection().where().orderBy() 等查询时，系统会自动优化
    // 对于复合查询，建议在 CloudBase 控制台手动创建索引

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
        collection: 'members',
        name: 'phone_1',
        fields: { phone: 1 },
        unique: true,
        sparse: true,
      },
      {
        collection: 'operation_logs',
        name: 'adminId_1_createdAt_-1',
        fields: { adminId: 1, createdAt: -1 },
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
      });
    }

    return success({
      message: '索引配置已记录，请在 CloudBase 控制台手动创建以下索引',
      results,
    });
  } catch (err) {
    return success({
      message: '索引初始化完成（部分操作需手动在控制台完成）',
      error: err.message,
    });
  }
};
