'use strict';

const crypto = require('crypto');
const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 生成模板项目 ID
 * @returns {string}
 */
function generateItemId() {
  return `item_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * 构造基础项目种子
 * @param {string} name
 * @param {number} defaultDuration
 * @returns {object}
 */
function baseItemSeed(name, defaultDuration) {
  return {
    itemId: generateItemId(),
    name,
    inputType: 'single_select',
    options: [name],
    defaultPrice: 0,
    defaultDuration,
    discountable: true,
    commissionable: true,
    enabled: true,
  };
}

/**
 * 构造附加项目种子
 * @param {string} name
 * @returns {object}
 */
function addonItemSeed(name) {
  return {
    itemId: generateItemId(),
    name,
    inputType: 'single_select',
    options: [name],
    defaultPrice: 0,
    defaultDuration: 0,
    discountable: true,
    commissionable: false,
    enabled: true,
  };
}

/** 美甲 / 美足通用款式与附加项 */
const NAIL_STYLES = ['基础款式', '简约款式', '轻奢款式', '高定款式'];
const NAIL_ADDONS = ['卸甲', '前置处理', '加固', '加钻', '跳色', '手绘'];
/** 美睫款式 */
const LASH_STYLES = [
  '日式美睫编织款',
  '仙女-妈生自然款',
  '私人定制穿插空气感系列',
  '国风-动物-动漫系列',
  '下睫毛',
  '其他',
];

/**
 * 六大类模板种子定义（按 service_categories.code 关联）
 */
const TEMPLATE_SEEDS = [
  {
    categoryCode: 'nail',
    defaultDuration: 120,
    baseItems: NAIL_STYLES.map((name) => baseItemSeed(name, 120)),
    addonItems: NAIL_ADDONS.map(addonItemSeed),
  },
  {
    categoryCode: 'foot-nail',
    defaultDuration: 120,
    baseItems: NAIL_STYLES.map((name) => baseItemSeed(name, 120)),
    addonItems: NAIL_ADDONS.map(addonItemSeed),
  },
  {
    categoryCode: 'lash',
    defaultDuration: 90,
    baseItems: LASH_STYLES.map((name) => baseItemSeed(name, 90)),
    addonItems: [],
  },
  {
    categoryCode: 'hand-care',
    defaultDuration: 60,
    baseItems: [baseItemSeed('手护', 60)],
    addonItems: [],
  },
  {
    categoryCode: 'foot-care',
    defaultDuration: 60,
    baseItems: [baseItemSeed('脚护', 60)],
    addonItems: [],
  },
  {
    categoryCode: 'brow-shaping',
    defaultDuration: 30,
    baseItems: [baseItemSeed('修眉', 30)],
    addonItems: [],
  },
];

/**
 * 服务模板种子初始化（幂等：已存在模板的分类跳过，不覆盖已有配置）
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const created = [];
    const skipped = [];
    const missing = [];
    const now = new Date();

    for (const seed of TEMPLATE_SEEDS) {
      const { data: categoryList } = await db
        .collection('service_categories')
        .where({ code: seed.categoryCode })
        .limit(1)
        .get();
      const category = categoryList[0];
      if (!category) {
        missing.push(seed.categoryCode);
        continue;
      }
      const { data: existingList } = await db
        .collection('service_templates')
        .where({ categoryId: category._id })
        .limit(1)
        .get();
      if (existingList.length > 0) {
        skipped.push(category.name || seed.categoryCode);
        continue;
      }
      await db.collection('service_templates').add({
        data: {
          categoryId: category._id,
          categoryName: category.name || '',
          defaultDuration: seed.defaultDuration,
          baseItems: seed.baseItems,
          addonItems: seed.addonItems,
          active: true,
          sort: Number(category.sort) || 0,
          createdAt: now,
          updatedAt: now,
        },
      });
      created.push(category.name || seed.categoryCode);
    }

    return success({
      created,
      skipped,
      missing,
      message: `模板初始化完成：新增 ${created.length} 个，跳过 ${skipped.length} 个`,
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('initServiceTemplates error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '服务模板初始化失败，请稍后重试');
  }
};
