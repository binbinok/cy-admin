'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 编辑会员信息
 * - 验证手机号格式
 * - 验证手机号唯一性（排除当前会员）
 * - 更新会员信息
 * - 记录操作日志
 *
 * @param {{ memberId: string, nickName?: string, phone?: string, birthday?: string }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    const memberId = String(event.memberId || '').trim();
    if (!memberId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '会员 ID 不能为空');
    }

    // 查询当前会员
    const { data: members } = await db
      .collection('members')
      .where({ memberId })
      .limit(1)
      .get();

    const member = (members || [])[0];
    if (!member) {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
    }

    // 构建更新数据
    const updateData = {};
    const now = new Date();

    if (event.nickName !== undefined) {
      const nickName = String(event.nickName || '').trim();
      if (nickName.length < 2 || nickName.length > 20) {
        return error(AdminErrorCode.VALIDATION_ERROR, '昵称长度需为 2–20 个字符');
      }
      updateData.nickName = nickName;
    }

    if (event.phone !== undefined) {
      const phone = String(event.phone || '').trim();
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return error(AdminErrorCode.VALIDATION_ERROR, '手机号格式不正确');
      }

      // 检查手机号唯一性（排除当前会员）
      const { data: existing } = await db
        .collection('members')
        .where({
          phone,
          memberId: db.command.neq(memberId),
        })
        .limit(1)
        .get();

      if (existing && existing.length > 0) {
        return error(AdminErrorCode.PHONE_ALREADY_BOUND, '该手机号已被其他会员使用');
      }

      updateData.phone = phone;
    }

    if (event.birthday !== undefined) {
      updateData.birthday = event.birthday;
    }

    if (Object.keys(updateData).length === 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '没有需要更新的字段');
    }

    updateData.updatedAt = now;

    // 更新会员信息
    await db.collection('members').doc(member._id).update({ data: updateData });

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminId,
        action: 'update_member',
        targetType: 'member',
        targetId: memberId,
        detail: `编辑会员信息：${Object.keys(updateData).filter((k) => k !== 'updatedAt').join('、')}`,
        ipAddress: event.ipAddress || '',
        createdAt: now,
      },
    });

    // 返回更新后的会员信息
    const { data: updatedMembers } = await db
      .collection('members')
      .where({ memberId })
      .limit(1)
      .get();

    return success({ member: (updatedMembers || [])[0] });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUpdateMember error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '操作失败，请稍后重试');
  }
};
