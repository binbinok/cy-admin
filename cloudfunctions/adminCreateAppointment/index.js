'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');

/**
 * 生成预约编号
 * @returns {string}
 */
function generateAppointmentId() {
  const now = new Date();
  const timestamp = now.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `APT${timestamp}${random}`;
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
 * 管理员创建预约
 *
 * @param {{
 *   memberId?: string,
 *   guestName?: string,
 *   guestPhone?: string,
 *   serviceId: string,
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
    const serviceId = String(event.serviceId || '').trim();
    const technicianId = String(event.technicianId || '').trim();
    const appointmentDate = String(event.appointmentDate || '').trim();
    const appointmentTime = String(event.appointmentTime || '').trim();
    const note = String(event.note || '').trim();

    if (!memberId && !guestName) {
      return error(AdminErrorCode.VALIDATION_ERROR, '请选择会员或输入散客姓名');
    }
    if (guestPhone && !/^1[3-9]\d{9}$/.test(guestPhone)) {
      return error(AdminErrorCode.VALIDATION_ERROR, '散客手机号格式不正确');
    }
    if (!serviceId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务项目不能为空');
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

    // 3. 验证服务项目是否存在且上架
    const { data: serviceDoc } = await db.collection('services').doc(serviceId).get();
    if (!serviceDoc) {
      return error(AdminErrorCode.NOT_FOUND, '服务项目不存在');
    }
    if (serviceDoc.active === false) {
      return error(AdminErrorCode.VALIDATION_ERROR, '该服务项目已下架');
    }

    // 4. 验证技师是否存在且在职
    const { data: technicianDoc } = await db.collection('technicians').doc(technicianId).get();
    if (!technicianDoc) {
      return error(AdminErrorCode.NOT_FOUND, '技师不存在');
    }
    if (technicianDoc.status === 'rest') {
      return error(AdminErrorCode.VALIDATION_ERROR, '该技师当前休息中，无法预约');
    }

    // 5. 时间冲突校验
    const serviceDuration = Number(serviceDoc.duration) || 60; // 默认60分钟
    const newStartMinutes = parseTimeToMinutes(appointmentTime);
    const newEndMinutes = newStartMinutes + serviceDuration;

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
      const existServiceDuration = Number(apt.serviceDuration) || 60;
      const existEndMinutes = existStartMinutes + existServiceDuration;

      // 重叠判断：(StartA < EndB) && (EndA > StartB)
      if (newStartMinutes < existEndMinutes && newEndMinutes > existStartMinutes) {
        return error(AdminErrorCode.CONFLICT, '该时间段技师已被预约');
      }
    }

    // 6. 创建预约记录
    const now = new Date();
    const appointmentId = generateAppointmentId();

    const appointmentData = {
      appointmentId,
      memberId: memberId || '',
      memberName: member ? (member.nickName || member.name || '未知会员') : '',
      memberPhone: member ? (member.phone || '') : '',
      guestName: memberId ? '' : guestName,
      guestPhone: memberId ? '' : guestPhone,
      serviceId,
      serviceName: serviceDoc.name || '',
      serviceDuration,
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

    const addResult = await db.collection('appointments').add({
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
          ? `创建预约 ${appointmentId}，会员 ${member.nickName || ''}，技师 ${technicianDoc.name || ''}，时间 ${appointmentDate} ${appointmentTime}`
          : `创建预约 ${appointmentId}，散客 ${guestName}${guestPhone ? `（${guestPhone}）` : ''}，技师 ${technicianDoc.name || ''}，时间 ${appointmentDate} ${appointmentTime}`,
        createdAt: now,
      },
    });

    return success({
      appointmentId,
      status: 'pending',
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
