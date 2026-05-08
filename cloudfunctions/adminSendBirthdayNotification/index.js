'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 发送生日祝福通知
 * - 检查会员是否存在
 * - 检查同一自然月内是否已发送过
 * - 记录发送日志
 *
 * @param {{ memberId: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const memberId = String(event.memberId || '').trim();
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }

    // 查询会员
    const { data: members } = await db
      .collection('members')
      .where({ memberId })
      .limit(1)
      .get();

    const member = (members || [])[0];
    if (!member) {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
    }

    // 检查同一自然月内是否已发送过生日祝福
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: existingLogs } = await db
      .collection('operation_logs')
      .where({
        action: 'birthday_notification',
        targetType: 'member',
        targetId: memberId,
        createdAt: _.gte(monthStart).and(_.lt(monthEnd)),
      })
      .limit(1)
      .get();

    if (existingLogs && existingLogs.length > 0) {
      return error(
        AdminErrorCode.BIRTHDAY_NOTIFICATION_ALREADY_SENT,
        '本月已发送过生日祝福'
      );
    }

    // 记录生日祝福发送日志
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'birthday_notification',
        targetType: 'member',
        targetId: memberId,
        detail: `向会员 ${member.nickName || memberId} 发送生日祝福`,
        ipAddress: event.ipAddress || '',
        createdAt: now,
      },
    });

    return success({});
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminSendBirthdayNotification error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
