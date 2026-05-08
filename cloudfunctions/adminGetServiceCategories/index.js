'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');
const DEFAULT_CATEGORIES = [
  { code: 'nail', name: '美甲', aliases: ['nail', '美甲'], sort: 10 },
  { code: 'lash', name: '美睫', aliases: ['lash', 'eyelash', '美睫'], sort: 20 },
  { code: 'care', name: '指甲护理', aliases: ['care', 'nail-care', '指甲护理'], sort: 30 },
  { code: 'package', name: '套餐', aliases: ['package', '套餐'], sort: 40 },
];
/**
 * 初始化默认服务分类配置。
 * @returns {Promise<void>}
 */
async function ensureDefaultCategories() {
  const { total } = await db.collection('service_categories').where({ active: true }).count();
  if (total > 0) {
    return;
  }
  const now = new Date();
  await Promise.all(
    DEFAULT_CATEGORIES.map((item) =>
      db.collection('service_categories').add({
        data: {
          ...item,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      }),
    ),
  );
}

/**
 * 获取服务分类配置列表。
 * @param {{}} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);
    await ensureDefaultCategories();
    const { data: list } = await db.collection('service_categories')
      .where({ active: true })
      .orderBy('sort', 'asc')
      .get();
    return success(list);
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetServiceCategories error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取服务分类失败，请稍后重试');
  }
};
