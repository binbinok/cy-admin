'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');
/**
 * 解析服务时间入参，无法解析时返回 null。
 * @param {unknown} rawServiceTime
 * @returns {Date|null}
 */
function parseServiceTime(rawServiceTime) {
  const parsed = new Date(rawServiceTime);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 将数据库返回的时间值转为 Date，无法解析时返回 null。
 * @param {unknown} rawValue
 * @returns {Date|null}
 */
function toSafeDate(rawValue) {
  if (!rawValue) {
    return null;
  }
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 同步会员档案的最近消费时间：仅当被修改记录原为该会员最近一条消费时更新。
 * @param {{ memberId: string, serviceTime: Date }} recordDoc
 * @param {Date} newServiceTime
 * @param {Date} now
 * @returns {Promise<void>}
 */
async function syncMemberLastConsumption(recordDoc, newServiceTime, now) {
  if (!recordDoc.memberId) {
    return;
  }
  const { data: memberList } = await db.collection('members').where({ memberId: recordDoc.memberId }).limit(1).get();
  const memberDoc = memberList[0];
  if (!memberDoc) {
    return;
  }
  const memberLast = toSafeDate(memberDoc.lastConsumptionAt);
  const recordOldTime = toSafeDate(recordDoc.serviceTime);
  const isLatestRecord = memberLast && recordOldTime && memberLast.getTime() === recordOldTime.getTime();
  if (!isLatestRecord) {
    return;
  }
  await db.collection('members').doc(memberDoc._id).update({
    data: {
      lastConsumptionAt: newServiceTime,
      updatedAt: now,
    },
  });
}

/**
 * 修改消费记录（仅服务时间与备注）。
 *
 * @param {{
 *   recordId: string,
 *   serviceTime: string,
 *   note?: string
 * }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }
    const recordId = String(event.recordId || '').trim();
    if (!recordId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '记录 ID 不能为空');
    }
    const serviceTime = parseServiceTime(event.serviceTime);
    if (!serviceTime) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务时间格式不正确');
    }
    const { data: recordDoc } = await db.collection('consumption_records').doc(recordId).get();
    if (!recordDoc) {
      return error(AdminErrorCode.VALIDATION_ERROR, '消费记录不存在');
    }
    const now = new Date();
    const updateData = {
      serviceTime,
      updatedAt: now,
    };
    if (event.note !== undefined) {
      updateData.note = String(event.note).trim();
    }
    await db.collection('consumption_records').doc(recordId).update({
      data: updateData,
    });
    await syncMemberLastConsumption(recordDoc, serviceTime, now);
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'update_consumption_record',
        targetType: 'consumption_record',
        targetId: recordId,
        targetName: recordDoc.serviceName || '',
        detail: `修改消费记录：服务时间改为 ${serviceTime.toISOString()}${event.note !== undefined ? '，备注已更新' : ''}`,
        createdAt: now,
      },
    });
    return success({ recordId });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUpdateConsumptionRecord error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '消费记录修改失败，请稍后重试');
  }
};
