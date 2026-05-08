'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 新增技师
 * - 验证姓名 2–10 字符
 * - 验证擅长项目至少 1 项
 * - 创建技师记录，初始状态默认 idle
 *
 * @param {{ name: string, specialties: string[], status?: string, avatarUrl?: string }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const name = String(event.name || '').trim();
    if (name.length < 2 || name.length > 10) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师姓名长度需为 2–10 个字符');
    }

    const specialties = Array.isArray(event.specialties) ? event.specialties : [];
    if (specialties.length === 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '至少选择一个擅长项目');
    }

    const status = event.status || 'idle';
    const now = new Date();

    const data = {
      name,
      avatarUrl: event.avatarUrl || '',
      specialties,
      status,
      schedule: [],
      createdAt: now,
      updatedAt: now,
    };

    const addRes = await db.collection('technicians').add({ data });

    return success({ technician: { _id: addRes._id, ...data } });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    if (err.errCode === -502005) {
      return error(AdminErrorCode.NOT_FOUND, '技师数据集合不存在，请先初始化 technicians 集合');
    }
    console.error('adminCreateTechnician error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '创建技师失败，请稍后重试');
  }
};
