'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 获取技师列表
 * - 查询所有技师，按创建时间倒序
 *
 * @param {{}} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const { data: list } = await db
      .collection('technicians')
      .orderBy('createdAt', 'desc')
      .limit(1000)
      .get();

    return success({ list: list || [] });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetTechnicianList error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取技师列表失败，请稍后重试');
  }
};
