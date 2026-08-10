'use strict';
// 定时任务：pending 预约超过预约时间 10 分钟自动确认到店（无 JWT，由 timer 触发器调用）
const { db } = require('./_shared/db');
const GRACE_MINUTES = 10;
const BATCH_SIZE = 100;
exports.main = async () => {
  const { data: list } = await db.collection('appointments').where({ status: 'pending' }).limit(BATCH_SIZE).get();
  const now = Date.now();
  let updated = 0;
  for (const appt of list || []) {
    const at = new Date(`${appt.appointmentDate}T${appt.appointmentTime}:00`).getTime();
    if (Number.isNaN(at) || at + GRACE_MINUTES * 60 * 1000 >= now) continue;
    await db.collection('appointments').doc(appt._id).update({
      data: { status: 'in_service', arrivedAt: new Date(), updatedAt: new Date() },
    });
    updated += 1;
  }
  console.log(`autoConfirmArrivalAppointments: scanned=${(list || []).length} updated=${updated}`);
  return { updated };
};
