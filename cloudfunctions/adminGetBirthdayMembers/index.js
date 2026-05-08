'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 获取近期生日会员
 * - days=0：今天生日
 * - days=3：今天到未来 3 天内生日
 * - days=7：今天到未来 7 天内生日
 *
 * 匹配逻辑：比较 birthday 的月-日部分
 *
 * @param {{ days?: number }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const days = Number(event.days);
    if (![0, 3, 7].includes(days)) {
      return error(AdminErrorCode.VALIDATION_ERROR, 'days 参数必须为 0、3 或 7');
    }

    const today = new Date();

    // 生成需要匹配的 MM-DD 列表
    const mmddList = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      mmddList.push(`${mm}-${dd}`);
    }

    // 查询所有有 birthday 字段的会员
    // 由于云数据库不支持对字符串子串直接查询，
    // 我们使用 RegExp 匹配 birthday 中的 MM-DD 部分
    // birthday 格式为 YYYY-MM-DD
    const regexPattern = mmddList.map((md) => md.replace('-', '-')).join('|');
    const regex = db.RegExp({ regexp: `-(${regexPattern})$`, options: '' });

    const { data: list } = await db
      .collection('members')
      .where({ birthday: regex })
      .get();

    return success({ list });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetBirthdayMembers error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
