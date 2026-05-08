'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');
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
 * 获取服务项目列表
 * - 支持按分类筛选
 * - 支持按名称关键词模糊搜索（db.RegExp）
 * - 分页
 *
 * @param {{ category?: string, keyword?: string, page?: number, pageSize?: number }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const category = await normalizeServiceCategory(event.category);
    const keyword = String(event.keyword || '').trim();
    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    // 构建查询条件
    const conditions = [];
    if (category) {
      conditions.push({ category });
    }
    if (keyword) {
      const regex = db.RegExp({ regexp: keyword, options: 'i' });
      conditions.push({ name: regex });
    }

    let query;
    if (conditions.length > 1) {
      query = db.collection('services').where(_.and(conditions));
    } else if (conditions.length === 1) {
      query = db.collection('services').where(conditions[0]);
    } else {
      query = db.collection('services').where({});
    }

    // 获取总数
    const countResult = await query.count();
    const total = countResult.total;

    // 分页查询
    const skip = (page - 1) * pageSize;
    const { data: list } = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return success({ list, total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetServiceList error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取服务项目列表失败，请稍后重试');
  }
};
