'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');
const DEFAULT_CATEGORIES = [
  { code: 'nail', name: '美甲', aliases: ['nail', '美甲'], sort: 10 },
  { code: 'foot-nail', name: '美足', aliases: ['foot-nail', '美足'], sort: 20 },
  { code: 'remove-nail', name: '卸甲', aliases: ['remove-nail', '卸甲'], sort: 30 },
  { code: 'hand-care', name: '手护', aliases: ['hand-care', '手护'], sort: 40 },
  { code: 'foot-care', name: '脚护', aliases: ['foot-care', '脚护'], sort: 50 },
  { code: 'pre-treatment', name: '前置处理', aliases: ['pre-treatment', '前置处理'], sort: 60 },
  { code: 'lash', name: '美睫', aliases: ['lash', 'eyelash', '美睫'], sort: 70 },
  { code: 'remove-lash', name: '卸睫', aliases: ['remove-lash', '卸睫'], sort: 80 },
  { code: 'brow-shaping', name: '修眉', aliases: ['brow-shaping', '修眉'], sort: 90 },
  { code: 'brow-tattoo', name: '纹眉', aliases: ['brow-tattoo', '纹眉'], sort: 100 },
  { code: 'lip-tattoo', name: '纹唇', aliases: ['lip-tattoo', '纹唇'], sort: 110 },
  { code: 'eyeliner', name: '美瞳线', aliases: ['eyeliner', '美瞳线'], sort: 120 },
  { code: 'medical-beauty', name: '医美', aliases: ['medical-beauty', '医美'], sort: 130 },
];
/**
 * 初始化默认服务分类配置（幂等同步）。
 * - 按 code 匹配：存在则更新 name/aliases/sort 并确保 active=true
 * - 不存在则新增
 * - 将不在 DEFAULT_CATEGORIES 中的旧分类 active 置为 false
 * @returns {Promise<void>}
 */
async function ensureDefaultCategories() {
  const now = new Date();
  const { data: existingList } = await db.collection('service_categories').get();
  const existingMap = new Map();
  for (const item of existingList) {
    existingMap.set(item.code, item);
  }
  const defaultCodes = new Set(DEFAULT_CATEGORIES.map((item) => item.code));
  const upsertTasks = [];
  for (const item of DEFAULT_CATEGORIES) {
    const existing = existingMap.get(item.code);
    if (existing) {
      upsertTasks.push(
        db.collection('service_categories').doc(existing._id).update({
          data: {
            name: item.name,
            aliases: item.aliases,
            sort: item.sort,
            active: true,
            updatedAt: now,
          },
        }),
      );
    } else {
      upsertTasks.push(
        db.collection('service_categories').add({
          data: {
            ...item,
            active: true,
            createdAt: now,
            updatedAt: now,
          },
        }),
      );
    }
  }
  for (const item of existingList) {
    if (!defaultCodes.has(item.code)) {
      upsertTasks.push(
        db.collection('service_categories').doc(item._id).update({
          data: {
            active: false,
            updatedAt: now,
          },
        }),
      );
    }
  }
  await Promise.all(upsertTasks);
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
