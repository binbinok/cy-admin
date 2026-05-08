'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

const DEFAULT_COMMISSION_RATE = 30;

/**
 * 获取所有技师提成配置
 *
 * 入参：{}
 *
 * 返回：[{ technicianId, technicianName, commissionRate }]
 *   - 未配置自定义比例的技师默认 30%
 *
 * 需求：7.2、7.3
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    // 查询所有技师
    const { data: technicians } = await db.collection('technicians').get();

    // 查询所有提成配置
    const { data: configs } = await db.collection('technician_commission_config').get();
    const configMap = new Map(configs.map((c) => [c.technicianId, c.commissionRate]));

    // 左连接：每位技师关联其提成配置，无配置则默认 30
    const result = technicians.map((t) => ({
      technicianId: t._id,
      technicianName: t.name,
      commissionRate: configMap.get(t._id) ?? DEFAULT_COMMISSION_RATE,
    }));

    return success(result);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetCommissionConfig error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取提成配置失败，请稍后重试');
  }
};
