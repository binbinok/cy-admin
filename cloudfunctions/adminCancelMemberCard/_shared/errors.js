'use strict';

/**
 * 管理端错误码枚举
 */
const AdminErrorCode = {
  // 认证
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  AUTH_FAILED: 'AUTH_FAILED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',

  // 通用
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // 会员
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  PHONE_ALREADY_BOUND: 'PHONE_ALREADY_BOUND',

  // 技师
  TECHNICIAN_HAS_PENDING_APPOINTMENTS: 'TECHNICIAN_HAS_PENDING_APPOINTMENTS',

  // 预约
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',

  // 会员卡
  CARD_BALANCE_INSUFFICIENT: 'CARD_BALANCE_INSUFFICIENT',
  DISCOUNT_LEVEL_IN_USE: 'DISCOUNT_LEVEL_IN_USE',

  // 提成
  INVALID_COMMISSION_RATE: 'INVALID_COMMISSION_RATE',

  // 生日通知
  BIRTHDAY_NOTIFICATION_ALREADY_SENT: 'BIRTHDAY_NOTIFICATION_ALREADY_SENT',
};

/**
 * 自定义管理端错误类
 */
class AdminError extends Error {
  /**
   * @param {string} code - AdminErrorCode 中的错误码
   * @param {string} message - 用户友好的错误描述
   */
  constructor(code, message) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
  }
}

module.exports = {
  AdminErrorCode,
  AdminError,
};
