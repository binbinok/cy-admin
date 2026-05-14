'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 获取技师业绩明细
 *
 * @param {{
 *   technicianId: string,
 *   startDate?: string,
 *   endDate?: string,
 *   page?: number,
 *   pageSize?: number
 * }} event
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const technicianId = String(event.technicianId || '').trim();
    const page = Math.max(Number(event.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize) || 20, 1), 100);

    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师ID不能为空');
    }

    // 设置默认日期范围（当月）
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let startDate;
    let endDate;

    if (event.startDate && event.endDate) {
      startDate = new Date(event.startDate);
      endDate = new Date(event.endDate);
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // 包含结束日期当天
    } else {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 1);
    }

    // 构建查询条件
    const conditions = [
      { technicianId },
      { createdAt: _.gte(startDate).and(_.lt(endDate)) },
    ];

    const query = db.collection('consumption_records').where(_.and(conditions));

    // 查询总数
    const countResult = await query.count();
    const total = countResult.total;

    // 分页查询
    const skip = (page - 1) * pageSize;
    const { data: list } = await query
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    // 关联会员信息
    const memberIds = [...new Set(list.filter((item) => item.memberId).map((item) => item.memberId))];
    const memberMap = new Map();

    if (memberIds.length > 0) {
      const { data: members } = await db.collection('members')
        .where({ memberId: _.in(memberIds) })
        .get();

      for (const member of members) {
        memberMap.set(member.memberId, member);
      }
    }

    // 组装返回数据
    const formattedList = list.map((item) => {
      const member = memberMap.get(item.memberId);
      return {
        _id: item._id,
        serviceTime: item.serviceTime,
        serviceName: item.serviceName,
        paymentDetails: item.paymentDetails || [],
        totalAmount: item.amount || 0,
        memberName: member ? (member.nickName || member.name || '未知会员') : '散客',
        note: item.note || '',
      };
    });

    // 计算汇总数据
    const summary = {
      totalAmount: list.reduce((sum, item) => sum + (item.amount || 0), 0),
      orderCount: list.length,
    };

    return success({
      list: formattedList,
      total,
      summary,
      page,
      pageSize,
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminGetTechnicianIncomeDetail error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '获取技师业绩明细失败，请稍后重试');
  }
};
