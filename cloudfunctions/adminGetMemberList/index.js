'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 手机号脱敏：中间 4 位以 * 展示（如 13812345678 → 138****5678）
 * @param {string} phone
 * @returns {string}
 */
function maskPhone(phone) {
  return String(phone).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

/**
 * 获取会员列表（含搜索/筛选）
 * - 支持关键词模糊匹配（昵称/手机号/会员编号）
 * - 支持按会员等级筛选
 * - 分页
 * - 手机号在接口层脱敏返回（关键词搜索仍基于原始数据）
 *
 * @param {{ keyword?: string, level?: string, page?: number, pageSize?: number }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const keyword = String(event.keyword || '').trim();
    const level = String(event.level || '').trim();
    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    // 构建查询
    let query;
    if (keyword && level) {
      const regex = db.RegExp({ regexp: keyword, options: 'i' });
      query = db.collection('members').where(
        _.and([
          _.or([
            { nickName: regex },
            { phone: regex },
            { memberId: regex },
          ]),
          { level },
        ])
      );
    } else if (keyword) {
      const regex = db.RegExp({ regexp: keyword, options: 'i' });
      query = db.collection('members').where(
        _.or([
          { nickName: regex },
          { phone: regex },
          { memberId: regex },
        ])
      );
    } else if (level) {
      query = db.collection('members').where({ level });
    } else {
      query = db.collection('members').where({});
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

    // 接口层脱敏：手机号中间 4 位以 * 展示
    const maskedList = (list || []).map((m) => ({
      ...m,
      phone: m.phone ? maskPhone(m.phone) : m.phone,
    }));

    return success({ list: maskedList, total });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetMemberList error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
