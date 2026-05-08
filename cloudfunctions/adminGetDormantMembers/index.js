'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 获取沉睡会员（60 天未消费）
 * - lastConsumptionAt 距今超过 60 天
 * - 按 lastConsumptionAt 升序排列（最久未到店的排在最前）
 * - 分页
 *
 * @param {{ page?: number, pageSize?: number }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const query = db.collection('members').where({
      lastConsumptionAt: _.lt(sixtyDaysAgo),
    });

    // 获取总数
    const countResult = await query.count();
    const total = countResult.total;

    // 分页查询，按 lastConsumptionAt 升序
    const skip = (page - 1) * pageSize;
    const { data: list } = await query
      .orderBy('lastConsumptionAt', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return success({ list, total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetDormantMembers error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
