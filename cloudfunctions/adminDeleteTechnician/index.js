'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 删除技师
 * - 检查是否存在未完成预约（pending / in_service），有则拒绝
 * - 删除技师记录
 * - 记录操作日志
 *
 * @param {{ technicianId: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const technicianId = String(event.technicianId || '').trim();
    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师 ID 不能为空');
    }

    // 检查未完成预约
    const countRes = await db
      .collection('appointments')
      .where({
        technicianId,
        status: _.in(['pending', 'in_service']),
      })
      .count();

    const pendingCount = countRes.total || 0;
    if (pendingCount > 0) {
      return error(
        AdminErrorCode.TECHNICIAN_HAS_PENDING_APPOINTMENTS,
        `该技师存在 ${pendingCount} 个未完成预约，无法删除`
      );
    }

    // 获取技师信息用于日志
    let technicianName = '';
    try {
      const { data: techDoc } = await db
        .collection('technicians')
        .doc(technicianId)
        .get();
      technicianName = techDoc.name || '';
    } catch (_e) {
      // 技师不存在也允许继续删除
    }

    // 删除技师
    await db.collection('technicians').doc(technicianId).remove();

    // 删除关联的服务时段配置
    await db
      .collection('technician_service_slots')
      .where({ technicianId })
      .remove();

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'delete_technician',
        targetType: 'technician',
        targetId: technicianId,
        detail: `删除技师：${technicianName}`,
        ipAddress: event.ipAddress || '',
        createdAt: new Date(),
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminDeleteTechnician error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '删除技师失败，请稍后重试');
  }
};
