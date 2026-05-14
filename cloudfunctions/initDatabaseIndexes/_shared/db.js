'use strict';

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.DYNAMIC_CURRENT_ENV });

const db = app.database();
const _ = db.command;
const $ = db.command.aggregate;

/**
 * 分页查询
 * @param {string} collectionName - 集合名称
 * @param {object} options - 查询选项
 * @param {object} [options.where] - 查询条件
 * @param {object} [options.orderBy] - 排序 { field, order }
 * @param {number} [options.page=1] - 页码（从 1 开始）
 * @param {number} [options.pageSize=20] - 每页条数
 * @returns {Promise<{ list: Array, total: number }>}
 */
async function paginate(collectionName, options = {}) {
  const { where = {}, orderBy, page = 1, pageSize = 20 } = options;

  let query = db.collection(collectionName).where(where);

  const countResult = await query.count();
  const total = countResult.total;

  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.order || 'desc');
  }

  const skip = (page - 1) * pageSize;
  const { data: list } = await query.skip(skip).limit(pageSize).get();

  return { list, total };
}

module.exports = {
  cloudbase,
  db,
  _,
  $,
  paginate,
};
