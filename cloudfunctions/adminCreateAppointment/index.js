'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');
const crypto = require('crypto');

/** 编号字符集：去除易混淆字符 0/O/1/I/L，共 32 个 */
const ID_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ID_LENGTH = 6;
const ID_MAX_RETRY = 5;

/**
 * 生成 6 位随机预约编号（字母+数字）
 * @returns {string}
 */
function generateAppointmentId() {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i += 1) {
    id += ID_CHARSET[crypto.randomInt(ID_CHARSET.length)];
  }
  return id;
}

/**
 * 生成全局唯一预约编号：查重冲突时自动重试
 * @returns {Promise<string>}
 */
async function generateUniqueAppointmentId() {
  for (let attempt = 0; attempt < ID_MAX_RETRY; attempt += 1) {
    const candidate = generateAppointmentId();
    const { total } = await db
      .collection('appointments')
      .where({ appointmentId: candidate })
      .count();
    if (total === 0) {
      return candidate;
    }
  }
  throw new Error('预约编号生成冲突，请重试');
}

/**
 * 解析时间字符串为分钟数
 * @param {string} timeStr - HH:mm 格式
 * @returns {number} 从00:00开始的分钟数
 */
function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 加载服务大类与启用模板，解析占用时长（默认取模板，允许手动覆盖）
 * @param {string} categoryId
 * @param {number | undefined} durationInput
 * @returns {Promise<{ category: object, duration: number }>}
 */
async function resolveCategoryAndDuration(categoryId, durationInput) {
  const { data: categoryList } = await db
    .collection('service_categories')
    .where({ _id: categoryId, active: true })
    .limit(1)
    .get();
  const category = categoryList[0];
  if (!category) {
    throw Object.assign(new Error('服务大类不存在或已停用'), { code: AdminErrorCode.VALIDATION_ERROR });
  }
  const { data: templateList } = await db
    .collection('service_templates')
    .where({ categoryId, active: true })
    .limit(1)
    .get();
  const template = templateList[0];
  if (!template) {
    throw Object.assign(new Error('该服务大类未配置服务模板或模板已停用'), { code: AdminErrorCode.VALIDATION_ERROR });
  }
  if (durationInput === undefined || durationInput === null || durationInput === '') {
    return { category, duration: Number(template.defaultDuration) || 60 };
  }
  const duration = Number(durationInput);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw Object.assign(new Error('时长必须为大于 0 的整数'), { code: AdminErrorCode.VALIDATION_ERROR });
  }
  return { category, duration };
}

/**
 * 管理员创建预约（预约层：仅排班，不绑定具体服务项）
 *
 * @param {{
 *   memberId?: string,
 *   guestName?: string,
 *   guestPhone?: string,
 *   categoryId: string,
 *   duration?: number,
 *   technicianId: string,
 *   appointmentDate: string,
 *   appointmentTime: string,
 *   note?: string
 * }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);

    // 1. 验证必填字段
    const rawMemberId = event.memberId;
    const memberId = rawMemberId ? String(rawMemberId).trim() : '';
    const guestName = String(event.guestName || '').trim();
    const guestPhone = String(event.guestPhone || '').trim();
    const categoryId = String(event.categoryId || '').trim();
    const technicianId = String(event.technicianId || '').trim();
    const appointmentDate = String(event.appointmentDate || '').trim();
    const appointmentTime = String(event.appointmentTime || '').trim();
    const note = String(event.note || '').trim();

    if (!memberId && !guestName) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请选择会员或填写散客姓名');
    }
    if (guestPhone && !/^1[3-9]\d{9}$/.test(guestPhone)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '散客手机号格式不正确');
    }
    if (!categoryId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务大类不能为空');
    }
    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师不能为空');
    }
    if (!appointmentDate) {
      return error(AdminErrorCode.VALIDATION_ERROR, '预约日期不能为空');
    }
    if (!appointmentTime) {
      return error(AdminErrorCode.VALIDATION_ERROR, '预约时间不能为空');
    }

    // 验证日期格式 YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointmentDate)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '预约日期格式不正确，应为 YYYY-MM-DD');
    }

    // 验证时间格式 HH:mm
    const timeRegex = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(appointmentTime)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '预约时间格式不正确，应为 HH:mm');
    }

    // 2. 验证会员是否存在
    let member = null;
    if (memberId) {
      const { data: members } = await db.collection('members').where({ memberId }).limit(1).get();
      member = (members || [])[0];
      if (!member) {
        return error(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
      }
    }

    // 3. 验证服务大类与模板，解析占用时长
    let category;
    let duration;
    try {
      ({ category, duration } = await resolveCategoryAndDuration(categoryId, event.duration));
    } catch (err) {
      return error(err.code || AdminErrorCode.VALIDATION_ERROR, err.message);
    }

    // 4. 验证技师是否存在且在职
    const { data: technicianDoc } = await db.collection('technicians').doc(technicianId).get();
    if (!technicianDoc) {
      return error(AdminErrorCode.NOT_FOUND, '技师不存在');
    }
    if (technicianDoc.status === 'rest') {
      return error(AdminErrorCode.VALIDATION_ERROR, '该技师当前休息中，无法预约');
    }

    // 5. 时段冲突校验：按 [appointmentTime, appointmentTime + duration) 区间计算
    const newStartMinutes = parseTimeToMinutes(appointmentTime);
    const newEndMinutes = newStartMinutes + duration;

    // 查询该技师在预约日期的所有未取消预约
    const { data: existingAppointments } = await db.collection('appointments')
      .where({
        technicianId,
        appointmentDate,
        status: _.nin(['cancelled']),
      })
      .get();

    for (const apt of existingAppointments) {
      const existStartMinutes = parseTimeToMinutes(apt.appointmentTime);
      // 历史数据兜底：优先取 duration，其次旧字段 serviceDuration，默认 60 分钟
      const existDuration = Number(apt.duration) || Number(apt.serviceDuration) || 60;
      const existEndMinutes = existStartMinutes + existDuration;

      // 重叠判断：(StartA < EndB) && (EndA > StartB)
      if (newStartMinutes < existEndMinutes && newEndMinutes > existStartMinutes) {
        return error(AdminErrorCode.CONFLICT, '该时间段技师已被预约');
      }
    }

    // 6. 创建预约记录（仅排班信息：顾客 / 技师 / 服务大类 / 日期时间 / 时长 / 备注）
    const now = new Date();
    const appointmentId = await generateUniqueAppointmentId();

    const appointmentData = {
      appointmentId,
      memberId: memberId || '',
      memberName: member ? (member.nickName || member.name || '未知会员') : '',
      memberPhone: member ? (member.phone || '') : '',
      guestName: memberId ? '' : guestName,
      guestPhone: memberId ? '' : guestPhone,
      categoryId,
      categoryName: category.name || '',
      duration,
      technicianId,
      technicianName: technicianDoc.name || '',
      appointmentDate,
      appointmentTime,
      status: 'pending',
      note,
      source: 'admin',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('appointments').add({
      data: appointmentData,
    });

    // 7. 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'create_appointment',
        targetType: 'appointment',
        targetId: appointmentId,
        detail: memberId
          ? `创建预约 ${appointmentId}，会员 ${member.nickName || ''}，大类 ${category.name || ''}，技师 ${technicianDoc.name || ''}，时间 ${appointmentDate} ${appointmentTime}，时长 ${duration} 分钟`
          : `创建预约 ${appointmentId}，散客 ${guestName}${guestPhone ? `（${guestPhone}）` : ''}，大类 ${category.name || ''}，技师 ${technicianDoc.name || ''}，时间 ${appointmentDate} ${appointmentTime}，时长 ${duration} 分钟`,
        createdAt: now,
      },
    });

    return success({
      appointmentId,
      status: 'pending',
      duration,
      message: '预约创建成功',
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCreateAppointment error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '预约创建失败，请稍后重试');
  }
};
