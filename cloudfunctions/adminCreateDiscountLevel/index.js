'use strict';

const { verifyAuth } = require('./_shared/auth');
const { success, error } = require('./_shared/response');
const { AdminErrorCode } = require('./_shared/errors');
const { db } = require('./_shared/db');

/**
 * 创建折扣等级
 *
 * 入参：{ name, discountRate, minRechargeAmount }
 *   - name：2–20 字符
 *   - discountRate：1–99 整数
 *   - minRechargeAmount：>= 0（单位：分）
 *
 * 返回：{ level }
 *
 * 需求：10.2
 */
exports.main = async (event = {}) => {
  try {
    const adminInfo = verifyAuth(event);
    if (adminInfo.role !== 'super_admin') {
      return error(AdminErrorCode.FORBIDDEN, '权限不足，仅超级管理员可执行此操作');
    }

    const { name, discountRate, minRechargeAmount } = event;

    // 验证 name
    const trimmedName = String(name || '').trim();
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      return error(AdminErrorCode.VALIDATION_ERROR, '等级名称长度必须为 2–20 字符');
    }

    // 验证 discountRate
    if (
      discountRate === undefined ||
      discountRate === null ||
      !Number.isInteger(discountRate) ||
      discountRate < 1 ||
      discountRate > 99
    ) {
      return error(AdminErrorCode.VALIDATION_ERROR, '折扣比例必须为 1–99 的整数');
    }

    // 验证 minRechargeAmount
    const minAmount = Number(minRechargeAmount);
    if (isNaN(minAmount) || minAmount < 0) {
      return error(AdminErrorCode.VALIDATION_ERROR, '最低充值门槛必须大于等于 0');
    }

    const now = new Date();
    const levelData = {
      name: trimmedName,
      discountRate,
      minRechargeAmount: minAmount,
      createdAt: now,
      updatedAt: now,
    };

    const res = await db.collection('card_discount_levels').add({ data: levelData });

    return success({ level: { _id: res._id, ...levelData } });
  } catch (err) {
    if (err.code) {
      return error(err.code, err.message);
    }
    console.error('adminCreateDiscountLevel error:', err);
    return error(AdminErrorCode.INTERNAL_ERROR, '创建折扣等级失败，请稍后重试');
  }
};
