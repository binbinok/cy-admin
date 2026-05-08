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
 * 新增服务项目
 * - 验证名称 2–30 字符
 * - 验证价格 > 0
 * - 验证时长 > 0 整数
 * - 分类：美甲/美睫/指甲护理/套餐
 * - 创建时 active = true
 *
 * @param {{ name: string, category: string, price: number, duration: number, description?: string }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const name = String(event.name || '').trim();
    const category = await normalizeServiceCategory(event.category);
    const price = Number(event.price);
    const duration = Number(event.duration);
    const description = String(event.description || '').trim();

    // 验证名称
    if (name.length < 2 || name.length > 30) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务名称长度必须为 2–30 字符');
    }

    // 验证分类
    if (!category) {
      return error(AdminErrorCode.VALIDATION_ERROR, '分类必须为美甲、美睫、指甲护理或套餐');
    }

    // 验证价格
    if (!Number.isFinite(price) || price <= 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '价格必须大于 0');
    }

    // 验证时长
    if (!Number.isInteger(duration) || duration <= 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '时长必须为大于 0 的整数');
    }

    const now = new Date();
    const serviceData = {
      name,
      category,
      price,
      duration,
      description,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const addResult = await db.collection('services').add({ data: serviceData });

    return success({
      service: { _id: addResult._id, ...serviceData },
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCreateService error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '创建服务项目失败，请稍后重试');
  }
};
