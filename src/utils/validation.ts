/**
 * 输入验证纯函数
 * 所有验证函数返回 { valid: boolean, errors: string[] }
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 验证管理员凭据（用户名 4–20 字符，密码 8–32 字符）
 */
export function validateAdminCredentials(
  username: string,
  password: string,
): ValidationResult {
  const errors: string[] = [];

  if (username.length < 4 || username.length > 20) {
    errors.push('用户名长度必须为 4–20 个字符');
  }

  if (password.length < 8 || password.length > 32) {
    errors.push('密码长度必须为 8–32 个字符');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证手机号（1[3-9]\d{9}）
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];
  const phoneRegex = /^1[3-9]\d{9}$/;

  if (!phoneRegex.test(phone)) {
    errors.push('手机号格式不正确');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证会员信息（昵称 2–20 字符，手机号合法，生日 YYYY-MM-DD）
 */
export function validateMemberInfo(info: {
  nickName: string;
  phone: string;
  birthday: string;
}): ValidationResult {
  const errors: string[] = [];

  if (info.nickName.length < 2 || info.nickName.length > 20) {
    errors.push('昵称长度必须为 2–20 个字符');
  }

  const phoneResult = validatePhone(info.phone);
  if (!phoneResult.valid) {
    errors.push(...phoneResult.errors);
  }

  const birthdayRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!birthdayRegex.test(info.birthday)) {
    errors.push('生日格式必须为 YYYY-MM-DD');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证服务项目（名称 2–30 字符，价格 > 0，时长 > 0 整数）
 */
export function validateServiceItem(item: {
  name: string;
  price: number;
  duration: number;
}): ValidationResult {
  const errors: string[] = [];

  if (item.name.length < 2 || item.name.length > 30) {
    errors.push('服务名称长度必须为 2–30 个字符');
  }

  if (typeof item.price !== 'number' || item.price <= 0) {
    errors.push('价格必须大于 0');
  }

  if (
    typeof item.duration !== 'number' ||
    item.duration <= 0 ||
    !Number.isInteger(item.duration)
  ) {
    errors.push('时长必须为大于 0 的整数');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证折扣等级（名称 2–20 字符，折扣比例 1–99 整数，最低充值门槛 >= 0）
 */
export function validateDiscountLevel(level: {
  name: string;
  discountRate: number;
  minRechargeAmount: number;
}): ValidationResult {
  const errors: string[] = [];

  if (level.name.length < 2 || level.name.length > 20) {
    errors.push('等级名称长度必须为 2–20 个字符');
  }

  if (
    typeof level.discountRate !== 'number' ||
    !Number.isInteger(level.discountRate) ||
    level.discountRate < 1 ||
    level.discountRate > 99
  ) {
    errors.push('折扣比例必须为 1–99 的整数');
  }

  if (
    typeof level.minRechargeAmount !== 'number' ||
    level.minRechargeAmount < 0
  ) {
    errors.push('最低充值门槛必须大于等于 0');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 验证提成比例（1–100 整数）
 */
export function validateCommissionRate(rate: number): ValidationResult {
  const errors: string[] = [];

  if (
    typeof rate !== 'number' ||
    !Number.isInteger(rate) ||
    rate < 1 ||
    rate > 100
  ) {
    errors.push('提成比例必须为 1–100 的整数');
  }

  return { valid: errors.length === 0, errors };
}
