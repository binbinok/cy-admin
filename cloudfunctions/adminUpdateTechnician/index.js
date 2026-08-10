'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 编辑技师信息
 * - 可更新 name、avatarUrl、specialties
 *
 * @param {{ technicianId: string, name?: string, avatarUrl?: string, specialties?: string[] }} event
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

    const updateData = {};

    if (event.name !== undefined) {
      const name = String(event.name || '').trim();
      if (name.length < 2 || name.length > 10) {
        return error(AdminErrorCode.VALIDATION_ERROR, '技师姓名长度需为 2–10 个字符');
      }
      updateData.name = name;
    }

    if (event.avatarUrl !== undefined) {
      updateData.avatarUrl = event.avatarUrl;
    }

    if (event.specialties !== undefined) {
      const specialties = Array.isArray(event.specialties) ? event.specialties : [];
      if (specialties.length === 0) {
        return error(AdminErrorCode.VALIDATION_ERROR, '至少选择一个擅长项目');
      }
      updateData.specialties = specialties;
    }

    if (Object.keys(updateData).length === 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '没有需要更新的字段');
    }

    updateData.updatedAt = new Date();

    await db.collection('technicians').doc(technicianId).update({ data: updateData });

    // 返回更新后的技师信息
    const { data: techDoc } = await db
      .collection('technicians')
      .doc(technicianId)
      .get();

    return success({ technician: techDoc });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUpdateTechnician error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '更新技师信息失败，请稍后重试');
  }
};
