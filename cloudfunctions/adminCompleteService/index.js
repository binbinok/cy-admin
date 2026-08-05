'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 完成服务：服务中 → 已完成
 *
 * 入参：{ appointmentId, actualAmount }
 *   - actualAmount 单位：分，>= 0（0 表示免费）
 *
 * 业务逻辑：
 *   1. 验证当前状态为 in_service
 *   2. 更新预约状态为 completed，写入 actualAmount
 *   3. 生成 consumption_record
 *   4. 计算积分 Math.floor(actualAmount / 10)，0 元不产生积分
 *   5. 更新 member：累加 points 和 totalConsumption
 *   6. 积分 > 0 时生成 points_record
 *   7. 查询 technician_commission_config 获取提成比例（默认 30）
 *   8. 生成 commission_record
 *   9. 记录 operation_log
 *
 * 需求：5.7、5.8、7.2
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const appointmentId = String(event.appointmentId || '').trim();
    const actualAmount = Number(event.actualAmount);

    if (!appointmentId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '预约 ID 不能为空');
    }
    if (Number.isNaN(actualAmount) || actualAmount < 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '实际消费金额必须 >= 0');
    }

    // 1. 查询预约
    const { data: appointment } = await db
      .collection('appointments')
      .doc(appointmentId)
      .get();

    if (!appointment) {
      return error(AdminErrorCode.APPOINTMENT_NOT_FOUND, '预约不存在');
    }

    // 2. 验证状态
    if (appointment.status !== 'in_service') {
      return error(
        AdminErrorCode.INVALID_STATUS_TRANSITION,
        `当前状态为"${appointment.status}"，无法完成服务，仅"服务中"状态可操作`
      );
    }

    // 3. 计算积分
    const pointsEarned = actualAmount === 0 ? 0 : Math.floor(actualAmount / 10);

    const now = new Date();

    // 4. 更新预约状态
    await db.collection('appointments').doc(appointmentId).update({
      data: {
        status: 'completed',
        actualAmount,
        pointsEarned,
        completedAt: now,
        updatedAt: now,
      },
    });

    // 5. 生成消费记录
    await db.collection('consumption_records').add({
      data: {
        memberId: appointment.memberId,
        guestName: appointment.guestName || '',
        appointmentId,
        amount: actualAmount,
        pointsEarned,
        createdAt: now,
      },
    });

    // 6. 更新会员积分和累计消费
    if (appointment.memberId) {
      const memberUpdate = {
        totalConsumption: _.inc(actualAmount),
        updatedAt: now,
      };
      if (pointsEarned > 0) {
        memberUpdate.points = _.inc(pointsEarned);
      }
      await db
        .collection('members')
        .doc(appointment.memberId)
        .update({ data: memberUpdate });
    }

    // 7. 积分 > 0 时生成积分记录
    if (pointsEarned > 0) {
      await db.collection('points_records').add({
        data: {
          memberId: appointment.memberId,
          appointmentId,
          type: 'earn',
          amount: pointsEarned,
          reason: 'service_complete',
          createdAt: now,
        },
      });
    }

    // 8. 查询提成配置 & 生成提成记录
    const { data: configList } = await db
      .collection('technician_commission_config')
      .where({ technicianId: appointment.technicianId })
      .limit(1)
      .get();

    const commissionRate = (configList && configList[0] && configList[0].commissionRate) || 30;
    const commissionAmount = Math.floor(actualAmount * commissionRate / 100);

    await db.collection('commission_records').add({
      data: {
        technicianId: appointment.technicianId,
        appointmentId,
        serviceAmount: actualAmount,
        commissionRate,
        commissionAmount,
        createdAt: now,
      },
    });

    // 9. 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'complete_service',
        targetType: 'appointment',
        targetId: appointmentId,
        detail: `完成服务，实际金额 ${actualAmount} 分，积分 +${pointsEarned}，提成 ${commissionAmount} 分（${commissionRate}%）`,
        createdAt: now,
      },
    });

    return success({ pointsEarned });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCompleteService error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '完成服务失败，请稍后重试');
  }
};
