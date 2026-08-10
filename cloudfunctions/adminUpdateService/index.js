'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');
/**
 * 归一化服务分类值，按数据库配置转换为标准中文分类。
 * @param {string} category
 * @returns {Promise<string>}
 */
async function normalizeServiceCategory(category) {
  const categoryKey = String(category || '').trim().toLowerCase();
  if (!categoryKey) {
    return '';
  }
  const { data: categoryList } = await db.collection('service_categories').where({ active: true }).get();
  for (const item of categoryList) {
    const code = String(item.code || '').trim().toLowerCase();
    const name = String(item.name || '').trim().toLowerCase();
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    if (categoryKey === code || categoryKey === name) {
      return item.name;
    }
    if (aliases.some((alias) => String(alias || '').trim().toLowerCase() === categoryKey)) {
      return item.name;
    }
  }
  return '';
}

/**
 * 编辑服务项目
 * - 仅更新传入的字段
 * - 验证规则同创建：名称 2–30 字符、价格 > 0、时长 > 0 整数
 *
 * @param {{ serviceId: string, name?: string, category?: string, price?: number, duration?: number, description?: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const serviceId = String(event.serviceId || '').trim();
    if (!serviceId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务项目 ID 不能为空');
    }

    // 构建更新字段
    const updateData = {};

    if (event.name !== undefined) {
      const name = String(event.name).trim();
      if (name.length < 2 || name.length > 30) {
        return error(AdminErrorCode.VALIDATION_ERROR, '服务名称长度必须为 2–30 字符');
      }
      updateData.name = name;
    }

    if (event.category !== undefined) {
      const category = await normalizeServiceCategory(event.category);
      if (!category) {
        return error(AdminErrorCode.VALIDATION_ERROR, '分类必须为美甲、美足、卸甲、手护、脚护、前置处理、美睫、卸睫、修眉、纹眉、纹唇、美瞳线或医美');
      }
      updateData.category = category;
    }

    if (event.price !== undefined) {
      const price = Number(event.price);
      if (!Number.isFinite(price) || price <= 0) {
        return error(AdminErrorCode.VALIDATION_ERROR, '价格必须大于 0');
      }
      updateData.price = price;
    }

    if (event.duration !== undefined) {
      const duration = Number(event.duration);
      if (!Number.isInteger(duration) || duration <= 0) {
        return error(AdminErrorCode.VALIDATION_ERROR, '时长必须为大于 0 的整数');
      }
      updateData.duration = duration;
    }

    if (event.description !== undefined) {
      updateData.description = String(event.description).trim();
    }

    // 至少需要一个更新字段
    if (Object.keys(updateData).length === 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '至少需要提供一个更新字段');
    }

    updateData.updatedAt = new Date();

    await db.collection('services').doc(serviceId).update({ data: updateData });

    // 返回更新后的服务项目
    const { data: service } = await db.collection('services').doc(serviceId).get();

    return success({ service });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUpdateService error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '更新服务项目失败，请稍后重试');
  }
};
