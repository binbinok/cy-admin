'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 获取预约列表（多条件筛选 + 分页）
 *
 * 入参：
 *   dateFrom / dateTo  — 日期范围（字符串 YYYY-MM-DD），未传参默认当天；显式传空字符串表示不限制，查询全部；兼容 startDate / endDate
 *   technicianId       — 技师 ID
 *   status             — 预约状态
 *   keyword            — 会员关键词（模糊匹配昵称/手机号/会员编号）
 *   page / pageSize    — 分页
 *
 * 需求：5.1–5.5
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    // ---------- 构建查询条件 ----------
    const conditions = [];

    // 日期范围（未传参默认当天；显式传空字符串表示不限制，查询全部）
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const rawFrom = event.dateFrom ?? event.startDate;
    const rawTo = event.dateTo ?? event.endDate;
    if (rawFrom !== '' || rawTo !== '') {
      const dateFrom = String(rawFrom || todayStr).trim();
      const dateTo = String(rawTo || todayStr).trim();
      conditions.push({ appointmentDate: _.gte(dateFrom).and(_.lte(dateTo + '\uffff')) });
    }

    // 技师筛选
    if (event.technicianId) {
      conditions.push({ technicianId: String(event.technicianId).trim() });
    }

    // 状态筛选
    if (event.status) {
      conditions.push({ status: String(event.status).trim() });
    }

    // 会员关键词模糊匹配
    const keyword = String(event.keyword || '').trim();
    if (keyword) {
      const regex = db.RegExp({ regexp: keyword, options: 'i' });
      conditions.push(
        _.or([
          { memberName: regex },
          { memberPhone: regex },
          { memberId: regex },
        ])
      );
    }

    // 组合条件
    let query;
    if (conditions.length > 1) {
      query = db.collection('appointments').where(_.and(conditions));
    } else if (conditions.length === 1) {
      query = db.collection('appointments').where(conditions[0]);
    } else {
      query = db.collection('appointments');
    }

    // ---------- 查询 ----------
    const countResult = await query.count();
    const total = countResult.total;

    const skip = (page - 1) * pageSize;
    const { data: list } = await query
      .orderBy('appointmentDate', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return success({ list, total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetAppointmentList error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取预约列表失败，请稍后重试');
  }
};
