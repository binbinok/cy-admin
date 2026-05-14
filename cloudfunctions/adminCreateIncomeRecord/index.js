'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db, _ } = require('./_shared/db');
/**
 * 读取服务分类映射，支持 code/name/alias 三类值。
 * @returns {Promise<Map<string, { code: string, name: string }>>}
 */
async function getCategoryAliasMap() {
  const { data: categoryList } = await db.collection('service_categories').where({ active: true }).get();
  const map = new Map();
  categoryList.forEach((item) => {
    map.set(String(item.code || '').trim().toLowerCase(), item);
    map.set(String(item.name || '').trim().toLowerCase(), item);
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    aliases.forEach((alias) => {
      map.set(String(alias || '').trim().toLowerCase(), item);
    });
  });
  return map;
}
/**
 * 根据会员编号查询会员及权益信息。
 * @param {string} memberId
 * @returns {Promise<{ memberDoc: Record<string, unknown> | null, discountRate: number }>}
 */
async function getMemberBenefit(memberId) {
  if (!memberId) {
    return { memberDoc: null, discountRate: 100 };
  }
  const { data: memberList } = await db.collection('members').where({ memberId }).limit(1).get();
  const memberDoc = memberList[0] || null;
  if (!memberDoc) {
    throw new Error('会员不存在');
  }
  const { data: cardList } = await db.collection('member_cards').where({ memberId, status: 'active' }).limit(1).get();
  const cardDoc = cardList[0];
  if (!cardDoc || !cardDoc.discountLevelId) {
    return { memberDoc, discountRate: 100 };
  }
  const { data: levelDoc } = await db.collection('card_discount_levels').doc(cardDoc.discountLevelId).get();
  const rate = Number(levelDoc && levelDoc.discountRate);
  if (!Number.isInteger(rate) || rate < 1 || rate > 100) {
    return { memberDoc, discountRate: 100 };
  }
  return { memberDoc, discountRate: rate };
}

/**
 * 验证支付方式明细
 * @param {Array<{paymentType: string, amount: number}>} paymentDetails
 * @returns {{valid: boolean, error?: string, totalFee?: number}}
 */
function validatePaymentDetails(paymentDetails) {
  if (!Array.isArray(paymentDetails) || paymentDetails.length === 0) {
    return { valid: false, error: '至少填写一组支付方式' };
  }

  if (paymentDetails.length > 3) {
    return { valid: false, error: '支付方式最多3组' };
  }

  const validPaymentTypes = ['member_card', 'cash', 'meituan'];
  const usedTypes = new Set();
  let totalFee = 0;

  for (const detail of paymentDetails) {
    const type = String(detail.paymentType || '').trim();
    const amount = Number(detail.amount);

    if (!validPaymentTypes.includes(type)) {
      return { valid: false, error: `无效的金额类型: ${type}` };
    }

    if (usedTypes.has(type)) {
      return { valid: false, error: `金额类型 ${type} 重复` };
    }
    usedTypes.add(type);

    if (!Number.isInteger(amount) || amount <= 0) {
      return { valid: false, error: '费用金额必须大于0' };
    }

    totalFee += amount;
  }

  return { valid: true, totalFee };
}

/**
 * 手工收入录入。
 *
 * @param {{
 *   serviceCategory: string,
 *   serviceName: string,
 *   serviceFee?: number,
 *   paymentDetails?: Array<{paymentType: string, amount: number}>,
 *   serviceTime: string,
 *   technicianId: string,
 *   memberId?: string,
 *   note?: string
 * }} event
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    const serviceCategoryInput = String(event.serviceCategory || '').trim();
    const serviceName = String(event.serviceName || '').trim();
    const serviceTime = new Date(event.serviceTime);
    const technicianId = String(event.technicianId || '').trim();
    const memberId = String(event.memberId || '').trim();
    const note = String(event.note || '').trim();

    if (!serviceCategoryInput) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务分类不能为空');
    }
    if (serviceName.length < 2 || serviceName.length > 30) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务内容长度需为 2-30 个字符');
    }
    if (Number.isNaN(serviceTime.getTime())) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务时间格式不正确');
    }
    if (!technicianId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师不能为空');
    }

    // 处理支付方式（新逻辑：paymentDetails / 旧逻辑：serviceFee）
    let serviceFee;
    let paymentDetails;

    if (event.paymentDetails) {
      // 新逻辑：多支付方式
      const validation = validatePaymentDetails(event.paymentDetails);
      if (!validation.valid) {
        return error(AdminErrorCode.VALIDATION_ERROR, validation.error);
      }
      serviceFee = validation.totalFee;
      paymentDetails = event.paymentDetails.map(d => ({
        paymentType: d.paymentType,
        amount: d.amount,
      }));
    } else {
      // 旧逻辑：单支付方式（兼容）
      serviceFee = Number(event.serviceFee);
      if (!Number.isInteger(serviceFee) || serviceFee <= 0) {
        return error(AdminErrorCode.VALIDATION_ERROR, '服务费用必须为大于 0 的整数（单位：分）');
      }
      paymentDetails = [{ paymentType: 'cash', amount: serviceFee }];
    }
    const categoryAliasMap = await getCategoryAliasMap();
    const category = categoryAliasMap.get(serviceCategoryInput.toLowerCase());
    if (!category) {
      return error(AdminErrorCode.VALIDATION_ERROR, '服务分类不存在');
    }
    const { data: technicianDoc } = await db.collection('technicians').doc(technicianId).get();
    if (!technicianDoc) {
      return error(AdminErrorCode.VALIDATION_ERROR, '技师不存在');
    }
    const { memberDoc, discountRate } = await getMemberBenefit(memberId);
    const originalAmount = serviceFee;
    const amount = Math.floor(serviceFee * discountRate / 100);
    const discountAmount = originalAmount - amount;
    const pointsEarned = amount === 0 ? 0 : Math.floor(amount / 10);
    const now = new Date();
    const consumptionRecord = {
      memberId: memberId || '',
      amount,
      originalAmount,
      discountAmount,
      pointsEarned,
      serviceCategory: category.name,
      serviceName,
      technicianId,
      technicianName: technicianDoc.name || '',
      serviceTime,
      note,
      source: 'manual',
      paymentDetails: paymentDetails.map(d => ({
        paymentType: d.paymentType,
        amount: d.amount,
        createdAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };
    const addResult = await db.collection('consumption_records').add({
      data: consumptionRecord,
    });
    if (memberDoc) {
      const memberUpdateData = {
        totalConsumption: _.inc(amount),
        consumptionCount: _.inc(1),
        lastConsumptionAt: serviceTime,
        updatedAt: now,
      };
      if (pointsEarned > 0) {
        memberUpdateData.points = _.inc(pointsEarned);
      }
      await db.collection('members').doc(memberDoc._id).update({
        data: memberUpdateData,
      });
    }
    if (memberDoc && pointsEarned > 0) {
      await db.collection('points_records').add({
        data: {
          memberId,
          consumptionId: addResult._id,
          type: 'earn',
          amount: pointsEarned,
          reason: 'manual_income',
          createdAt: now,
        },
      });
    }
    await db.collection('operation_logs').add({
      data: {
        adminId: adminInfo.adminId,
        adminName: adminInfo.username || '',
        action: 'create_income_record',
        targetType: 'consumption_record',
        targetId: addResult._id,
        detail: `录入收入 ${amount} 分，服务 ${serviceName}，技师 ${technicianDoc.name || ''}`,
        createdAt: now,
      },
    });
    return success({
      consumptionId: addResult._id,
      amount,
      originalAmount,
      discountAmount,
      pointsEarned,
    });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    if (err.message === '会员不存在') {
      return error(AdminErrorCode.MEMBER_NOT_FOUND, err.message);
    }
    console.error('adminCreateIncomeRecord error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '收入录入失败，请稍后重试');
  }
};
