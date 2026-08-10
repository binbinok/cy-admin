'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 设置技师提成比例
 *
 * 入参：{ technicianId, commissionRate }
 *   - commissionRate 必须为 1–100 的整数
 *
 * 行为：
 *   1. 验证 commissionRate 范围
 *   2. upsert technician_commission_config
 *   3. 记录操作日志
 *
 * 需求：7.3、7.4、11.5
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const { technicianId, commissionRate } = event;

    // 验证提成比例：必须为 1–100 的整数
    if (
      commissionRate === undefined ||
      commissionRate === null ||
      !Number.isInteger(commissionRate) ||
      commissionRate < 1 ||
      commissionRate > 100
    ) {
      return error(
        AdminErrorCode.INVALID_COMMISSION_RATE,
        '提成比例必须为 1%–100% 的整数'
      );
    }

    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, 'technicianId 不能为空');
    }

    const now = new Date();

    // 检查是否已有配置记录
    const { data: existing } = await db.collection('technician_commission_config')
      .where({ technicianId })
      .get();

    if (existing.length > 0) {
      // 更新已有配置
      await db.collection('technician_commission_config')
        .where({ technicianId })
        .update({
          data: {
            commissionRate,
            updatedBy: adminInfo.adminId,
            updatedAt: now,
          },
        });
    } else {
      // 新增配置
      await db.collection('technician_commission_config').add({
        data: {
          technicianId,
          commissionRate,
          updatedBy: adminInfo.adminId,
          updatedAt: now,
        },
      });
    }

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'update_commission_rate',
        targetType: 'technician_commission_config',
        targetId: technicianId,
        detail: `设置技师提成比例为 ${commissionRate}%`,
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
