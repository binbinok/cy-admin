'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 编辑折扣等级
 *
 * 入参：{ levelId, name?, discountRate?, minRechargeAmount? }
 *   - name：2–20 字符
 *   - discountRate：1–99 整数
 *   - minRechargeAmount：>= 0（单位：分）
 *
 * 返回：{ level }
 *
 * 需求：10.3
 */
exports.main = async (event = {}) => {
  try {
    verifyAuth(event);

    const { levelId, name, discountRate, minRechargeAmount } = event;

    if (!levelId) {
      return error(AdminErrorCode.VALIDATION_ERROR, '折扣等级 ID 不能为空');
    }

    const updateData = { updatedAt: new Date() };

    // 验证并收集可选字段
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length < 2 || trimmedName.length > 20) {
        return error(AdminErrorCode.VALIDATION_ERROR, '等级名称长度必须为 2–20 字符');
      }
      updateData.name = trimmedName;
    }

    if (discountRate !== undefined) {
      if (
        !Number.isInteger(discountRate) ||
        discountRate < 1 ||
        discountRate > 99
      ) {
        return error(AdminErrorCode.VALIDATION_ERROR, '折扣比例必须为 1–99 的整数');
      }
      updateData.discountRate = discountRate;
    }

    if (minRechargeAmount !== undefined) {
      const minAmount = Number(minRechargeAmount);
      if (isNaN(minAmount) || minAmount < 0) {
        return error(AdminErrorCode.VALIDATION_ERROR, '最低充值门槛必须大于等于 0');
      }
      updateData.minRechargeAmount = minAmount;
    }

    await db.collection('card_discount_levels').doc(levelId).update({
      data: updateData,
    });

    // 返回更新后的记录
    const { data: level } = await db.collection('card_discount_levels').doc(levelId).get();

    return success({ level });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminUpdateDiscountLevel error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '更新折扣等级失败，请稍后重试');
  }
};
