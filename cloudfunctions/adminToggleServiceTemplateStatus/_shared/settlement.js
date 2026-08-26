'use strict';

const { db, _ } = require('./db');
const { AdminError, AdminErrorCode } = require('./errors');

/** 合法支付方式枚举（含美团） */
const VALID_PAYMENT_TYPES = ['member_card', 'cash', 'meituan', 'wechat', 'alipay'];
/** 支付明细最大组数 */
const MAX_PAYMENT_GROUPS = 3;
/** 默认技师提成比例（%） */
const DEFAULT_COMMISSION_RATE = 30;

/**
 * 校验支付明细：1-3 组、类型合法且不重复、金额为正整数
 * @param {Array<{paymentType: string, amount: number}>} paymentDetails
 * @returns {number} 支付总额（分）
 */
function validatePaymentDetails(paymentDetails) {
  if (!Array.isArray(paymentDetails) || paymentDetails.length === 0) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '至少填写一组支付方式');
  }
  if (paymentDetails.length > MAX_PAYMENT_GROUPS) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '支付方式最多3组');
  }
  const usedTypes = new Set();
  let totalFee = 0;
  for (const detail of paymentDetails) {
    const type = String(detail.paymentType || '').trim();
    const amount = Number(detail.amount);
    if (!VALID_PAYMENT_TYPES.includes(type)) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, `无效的金额类型: ${type}`);
    }
    if (usedTypes.has(type)) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, `金额类型 ${type} 重复`);
    }
    usedTypes.add(type);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '费用金额必须大于0');
    }
    totalFee += amount;
  }
  return totalFee;
}

/**
 * 查询会员及会员卡折扣率
 * @param {string} memberId
 * @returns {Promise<{ memberDoc: object | null, discountRate: number }>}
 */
async function getMemberBenefit(memberId) {
  if (!memberId) {
    return { memberDoc: null, discountRate: 100 };
  }
  const { data: memberList } = await db.collection('members').where({ memberId }).limit(1).get();
  const memberDoc = memberList[0] || null;
  if (!memberDoc) {
    throw new AdminError(AdminErrorCode.MEMBER_NOT_FOUND, '会员不存在');
  }
  const { data: cardList } = await db.collection('member_cards').where({ memberId, status: 'active' }).limit(1).get();
  const cardDoc = cardList[0];
  if (!cardDoc || !cardDoc.discountLevelId) {
    return { memberDoc, discountRate: 100 };
  }
  let rate = 100;
  try {
    const { data: levelDoc } = await db.collection('card_discount_levels').doc(cardDoc.discountLevelId).get();
    const parsed = Number(levelDoc && levelDoc.discountRate);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
      rate = parsed;
    }
  } catch (_e) {
    rate = 100;
  }
  return { memberDoc, discountRate: rate };
}

/**
 * 加载服务大类及其启用模板
 * @param {string} categoryId
 * @returns {Promise<{ category: object, template: object }>}
 */
async function loadCategoryTemplate(categoryId) {
  if (!categoryId) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '服务大类不能为空');
  }
  const { data: categoryList } = await db.collection('service_categories').where({ _id: categoryId, active: true }).limit(1).get();
  const category = categoryList[0];
  if (!category) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '服务大类不存在或已停用');
  }
  const { data: templateList } = await db.collection('service_templates').where({ categoryId, active: true }).limit(1).get();
  const template = templateList[0];
  if (!template) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '该服务大类未配置服务模板或模板已停用');
  }
  return { category, template };
}

/**
 * 解析基础项目：恰好 1 个，必须属于模板基础项目，价格以提交为准
 * @param {object} template
 * @param {object} event
 * @returns {{ itemId: string, name: string, price: number, duration: number, discountable: boolean, commissionable: boolean }}
 */
function resolveBaseItem(template, event) {
  const baseItemId = String(event.baseItemId || '').trim();
  if (!baseItemId) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '请选择 1 个基础项目');
  }
  const baseItemPrice = Number(event.baseItemPrice);
  if (!Number.isInteger(baseItemPrice) || baseItemPrice < 0) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '基础项目价格必须为非负整数（分）');
  }
  const baseItems = Array.isArray(template.baseItems) ? template.baseItems : [];
  const matched = baseItems.find((item) => item.itemId === baseItemId && item.enabled !== false);
  if (!matched) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '基础项目不存在或已停用');
  }
  return {
    itemId: matched.itemId,
    name: matched.name,
    price: baseItemPrice,
    duration: Number(matched.defaultDuration) || 0,
    discountable: matched.discountable !== false,
    commissionable: matched.commissionable !== false,
  };
}

/**
 * 解析模板附加项目：快照名称与折扣/提成标志，价格以提交为准
 * @param {object} template
 * @param {Array} addons
 * @returns {Array}
 */
function resolveAddons(template, addons) {
  if (!Array.isArray(addons)) {
    return [];
  }
  const addonItems = Array.isArray(template.addonItems) ? template.addonItems : [];
  return addons.map((addon) => {
    const itemId = String(addon.itemId || '').trim();
    const price = Number(addon.price);
    const matched = addonItems.find((item) => item.itemId === itemId && item.enabled !== false);
    if (!matched) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '附加项目不存在或已停用');
    }
    if (!Number.isInteger(price) || price < 0) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, `附加项目「${matched.name}」价格必须为非负整数（分）`);
    }
    return {
      itemId: matched.itemId,
      name: matched.name,
      inputType: matched.inputType,
      inputValue: addon.inputValue !== undefined ? String(addon.inputValue) : '',
      price,
      discountable: matched.discountable !== false,
      commissionable: matched.commissionable !== false,
    };
  });
}

/**
 * 校验自定义附加项：名称、金额、原因必填，默认不参与折扣与提成
 * @param {Array} customAddons
 * @returns {Array}
 */
function resolveCustomAddons(customAddons) {
  if (!Array.isArray(customAddons)) {
    return [];
  }
  return customAddons.map((addon) => {
    const name = String(addon.name || '').trim();
    const reason = String(addon.reason || '').trim();
    const price = Number(addon.price);
    if (!name) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '自定义附加项必须填写名称');
    }
    if (!Number.isInteger(price) || price <= 0) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '自定义附加项金额必须为大于 0 的整数（分）');
    }
    if (!reason) {
      throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '自定义附加项必须填写原因');
    }
    return { name, price, reason, discountable: false, commissionable: false };
  });
}

/**
 * 服务端金额重算（不信任前端合计）
 * @param {{ baseItem: object, addons: Array, customAddons: Array, discountRate: number, adjustAmount: number }} params
 * @returns {{ originalAmount: number, discountAmount: number, receivableAmount: number, actualAmount: number, commissionableAmount: number }}
 */
function computeAmounts({ baseItem, addons, customAddons, discountRate, adjustAmount }) {
  const addonTotal = addons.reduce((sum, item) => sum + item.price, 0);
  const customTotal = customAddons.reduce((sum, item) => sum + item.price, 0);
  const originalAmount = baseItem.price + addonTotal + customTotal;
  const discountableTotal =
    (baseItem.discountable ? baseItem.price : 0) +
    addons.filter((item) => item.discountable).reduce((sum, item) => sum + item.price, 0);
  const discountAmount = discountableTotal - Math.floor((discountableTotal * discountRate) / 100);
  const receivableAmount = originalAmount - discountAmount;
  const actualAmount = receivableAmount + adjustAmount;
  const commissionableAmount =
    (baseItem.commissionable ? baseItem.price : 0) +
    addons.filter((item) => item.commissionable).reduce((sum, item) => sum + item.price, 0);
  return { originalAmount, discountAmount, receivableAmount, actualAmount, commissionableAmount };
}

/**
 * 会员卡支付扣款：校验余额并扣减
 * @param {{ memberDoc: object | null, paymentDetails: Array, now: Date }} params
 */
async function deductMemberCardPayments({ memberDoc, paymentDetails, now }) {
  const cardPayment = paymentDetails.find((d) => d.paymentType === 'member_card');
  if (!cardPayment) {
    return;
  }
  if (!memberDoc) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '散客不可使用会员卡支付');
  }
  const { data: cardList } = await db.collection('member_cards').where({ memberId: memberDoc.memberId, status: 'active' }).limit(1).get();
  const cardDoc = cardList[0];
  if (!cardDoc) {
    throw new AdminError(AdminErrorCode.NOT_FOUND, '会员卡不存在或已冻结');
  }
  const currentBalance = Number(cardDoc.balance) || 0;
  if (currentBalance < cardPayment.amount) {
    throw new AdminError(
      AdminErrorCode.CARD_BALANCE_INSUFFICIENT,
      `会员卡余额不足，当前余额 ${currentBalance} 分，需支付 ${cardPayment.amount} 分`
    );
  }
  await db.collection('member_cards').doc(cardDoc._id).update({
    data: { balance: _.inc(-cardPayment.amount), updatedAt: now },
  });
}

/**
 * 查询技师提成比例
 * @param {string} technicianId
 * @returns {Promise<number>}
 */
async function getCommissionRate(technicianId) {
  const { data: configList } = await db
    .collection('technician_commission_config')
    .where({ technicianId })
    .limit(1)
    .get();
  return (configList && configList[0] && Number(configList[0].commissionRate)) || DEFAULT_COMMISSION_RATE;
}

/**
 * 统一结算入口（共享模块）
 *
 * 预约完成（adminCompleteService）与手工收入录入（adminCreateSettlement）共用。
 *
 * @param {{
 *   event: {
 *     appointmentId?: string,
 *     memberId?: string,
 *     guestName?: string,
 *     technicianId: string,
 *     serviceTime: string,
 *     categoryId: string,
 *     baseItemId: string,
 *     baseItemPrice: number,
 *     addons?: Array<{ itemId: string, inputValue?: string, price: number }>,
 *     customAddons?: Array<{ name: string, price: number, reason: string }>,
 *     adjustAmount?: number,
 *     adjustReason?: string,
 *     paymentDetails: Array<{ paymentType: string, amount: number }>,
 *     note?: string
 *   },
 *   adminInfo: { adminId: string, role: string, username?: string }
 * }} params
 * @returns {Promise<{ consumptionId: string, originalAmount: number, discountAmount: number, receivableAmount: number, adjustAmount: number, amount: number, pointsEarned: number, commissionAmount: number }>}
 */
async function executeSettlement({ event, adminInfo }) {
  const memberId = String(event.memberId || '').trim();
  const guestName = String(event.guestName || '').trim();
  const technicianId = String(event.technicianId || '').trim();
  const categoryId = String(event.categoryId || '').trim();
  const note = String(event.note || '').trim();
  const appointmentId = String(event.appointmentId || '').trim();
  const serviceTime = new Date(event.serviceTime);
  if (!memberId && !guestName) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '请选择会员或输入散客姓名');
  }
  if (!technicianId) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '技师不能为空');
  }
  if (Number.isNaN(serviceTime.getTime())) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '服务时间格式不正确');
  }
  const adjustAmount = Number(event.adjustAmount) || 0;
  if (!Number.isInteger(adjustAmount)) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '改价金额必须为整数（分）');
  }
  const adjustReason = String(event.adjustReason || '').trim();
  if (adjustAmount !== 0 && !adjustReason) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '改价必须填写原因');
  }
  const { data: technicianDoc } = await db.collection('technicians').doc(technicianId).get();
  if (!technicianDoc) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '技师不存在');
  }
  let appointment = null;
  if (appointmentId) {
    const { data: appointmentDoc } = await db.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc) {
      throw new AdminError(AdminErrorCode.APPOINTMENT_NOT_FOUND, '预约不存在');
    }
    if (appointmentDoc.status !== 'in_service') {
      throw new AdminError(
        AdminErrorCode.INVALID_STATUS_TRANSITION,
        `当前预约状态为"${appointmentDoc.status}"，仅"服务中"状态可结算`
      );
    }
    appointment = appointmentDoc;
  }
  const paymentTotal = validatePaymentDetails(event.paymentDetails);
  const { category, template } = await loadCategoryTemplate(categoryId);
  const baseItem = resolveBaseItem(template, event);
  const addons = resolveAddons(template, event.addons);
  const customAddons = resolveCustomAddons(event.customAddons);
  const { memberDoc, discountRate } = await getMemberBenefit(memberId);
  const amounts = computeAmounts({ baseItem, addons, customAddons, discountRate, adjustAmount });
  if (amounts.actualAmount < 0) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '实收金额不能小于 0');
  }
  if (paymentTotal !== amounts.actualAmount) {
    throw new AdminError(AdminErrorCode.VALIDATION_ERROR, '支付总额必须等于实收金额');
  }
  const now = new Date();
  await deductMemberCardPayments({ memberDoc, paymentDetails: event.paymentDetails, now });
  const pointsEarned = amounts.actualAmount === 0 ? 0 : Math.floor(amounts.actualAmount / 10);
  const consumptionData = {
    memberId: memberId || '',
    memberName: memberDoc ? memberDoc.nickName || memberDoc.name || '' : '',
    guestName: memberId ? '' : guestName,
    appointmentId: appointmentId || '',
    categoryId,
    categoryName: category.name || '',
    baseItem,
    addons,
    customAddons,
    originalAmount: amounts.originalAmount,
    discountAmount: amounts.discountAmount,
    receivableAmount: amounts.receivableAmount,
    adjustAmount,
    adjustReason,
    amount: amounts.actualAmount,
    pointsEarned,
    technicianId,
    technicianName: technicianDoc.name || '',
    serviceTime,
    serviceCategory: category.name || '',
    serviceName: baseItem.name,
    paymentDetails: event.paymentDetails.map((d) => ({
      paymentType: d.paymentType,
      amount: d.amount,
      createdAt: now,
    })),
    note,
    source: appointmentId ? 'appointment' : 'settlement',
    createdAt: now,
    updatedAt: now,
  };
  const addResult = await db.collection('consumption_records').add({ data: consumptionData });
  if (memberDoc) {
    const memberUpdate = {
      totalConsumption: _.inc(amounts.actualAmount),
      consumptionCount: _.inc(1),
      lastConsumptionAt: serviceTime,
      updatedAt: now,
    };
    if (pointsEarned > 0) {
      memberUpdate.points = _.inc(pointsEarned);
    }
    await db.collection('members').doc(memberDoc._id).update({ data: memberUpdate });
  }
  if (memberDoc && pointsEarned > 0) {
    await db.collection('points_records').add({
      data: {
        memberId,
        consumptionId: addResult._id,
        appointmentId: appointmentId || '',
        type: 'earn',
        amount: pointsEarned,
        reason: appointmentId ? 'service_complete' : 'settlement',
        createdAt: now,
      },
    });
  }
  const commissionRate = await getCommissionRate(technicianId);
  const commissionAmount = Math.floor((amounts.commissionableAmount * commissionRate) / 100);
  await db.collection('commission_records').add({
    data: {
      technicianId,
      technicianName: technicianDoc.name || '',
      appointmentId: appointmentId || '',
      consumptionId: addResult._id,
      serviceAmount: amounts.commissionableAmount,
      commissionRate,
      commissionAmount,
      createdAt: now,
    },
  });
  if (appointment) {
    await db.collection('appointments').doc(appointmentId).update({
      data: {
        status: 'completed',
        actualAmount: amounts.actualAmount,
        pointsEarned,
        completedAt: now,
        updatedAt: now,
      },
    });
  }
  const adjustLog = adjustAmount !== 0
    ? `；改价 ${adjustAmount} 分（改前 ${amounts.receivableAmount} 分，改后 ${amounts.actualAmount} 分，原因：${adjustReason}）`
    : '';
  await db.collection('operation_logs').add({
    data: {
      adminId: adminInfo.adminId,
      adminName: adminInfo.username || '',
      action: appointmentId ? 'complete_service' : 'create_settlement',
      targetType: 'consumption_record',
      targetId: addResult._id,
      detail: `结算 ${amounts.actualAmount} 分（原价 ${amounts.originalAmount} 分，折扣 ${amounts.discountAmount} 分），分类 ${category.name || ''}，基础项目 ${baseItem.name}，技师 ${technicianDoc.name || ''}，积分 +${pointsEarned}，提成 ${commissionAmount} 分（${commissionRate}%）${adjustLog}`,
      createdAt: now,
    },
  });
  return {
    consumptionId: addResult._id,
    originalAmount: amounts.originalAmount,
    discountAmount: amounts.discountAmount,
    receivableAmount: amounts.receivableAmount,
    adjustAmount,
    amount: amounts.actualAmount,
    pointsEarned,
    commissionAmount,
  };
}

module.exports = {
  executeSettlement,
  validatePaymentDetails,
  computeAmounts,
};
