'use strict';

const { db } = require('./_shared/db');

/**
 * 一次性只读探针（用后即删）：核查提成配置与技师 ID 对应关系
 * 不执行任何写操作
 */
exports.main = async () => {
  try {
    const { data: configs } = await db
      .collection('technician_commission_config')
      .limit(100)
      .get();
    const { data: technicians } = await db
      .collection('technicians')
      .limit(100)
      .get();
    const { data: commissions } = await db
      .collection('commission_records')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    return {
      success: true,
      configs: (configs || []).map((c) => ({
        _id: c._id,
        technicianId: c.technicianId,
        commissionRate: c.commissionRate,
        updatedAt: c.updatedAt,
      })),
      technicians: (technicians || []).map((t) => ({
        _id: t._id,
        technicianId: t.technicianId,
        name: t.name,
      })),
      recentCommissions: (commissions || []).map((r) => ({
        technicianId: r.technicianId,
        technicianName: r.technicianName,
        commissionRate: r.commissionRate,
        commissionAmount: r.commissionAmount,
        serviceAmount: r.serviceAmount,
        createdAt: r.createdAt,
      })),
    };
  } catch (err) {
    console.error('adminProbeCommission error:', err);
    return { success: false, message: err.message };
  }
};
