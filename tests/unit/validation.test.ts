import { describe, it, expect } from 'vitest';
import {
  validateAdminCredentials,
  validatePhone,
  validateMemberInfo,
  validateServiceItem,
  validateDiscountLevel,
  validateCommissionRate,
} from '@/utils/validation';

describe('validateAdminCredentials', () => {
  it('should accept valid credentials', () => {
    const result = validateAdminCredentials('admin', 'password1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject username shorter than 4 chars', () => {
    const result = validateAdminCredentials('abc', 'password1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('用户名长度必须为 4–20 个字符');
  });

  it('should reject username longer than 20 chars', () => {
    const result = validateAdminCredentials('a'.repeat(21), 'password1');
    expect(result.valid).toBe(false);
  });

  it('should reject password shorter than 8 chars', () => {
    const result = validateAdminCredentials('admin', 'short');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('密码长度必须为 8–32 个字符');
  });

  it('should reject password longer than 32 chars', () => {
    const result = validateAdminCredentials('admin', 'a'.repeat(33));
    expect(result.valid).toBe(false);
  });

  it('should return multiple errors for both invalid', () => {
    const result = validateAdminCredentials('ab', 'short');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('should accept boundary values (4 char username, 8 char password)', () => {
    expect(validateAdminCredentials('abcd', 'abcdefgh').valid).toBe(true);
  });

  it('should accept boundary values (20 char username, 32 char password)', () => {
    expect(validateAdminCredentials('a'.repeat(20), 'a'.repeat(32)).valid).toBe(true);
  });
});

describe('validatePhone', () => {
  it('should accept valid phone numbers', () => {
    expect(validatePhone('13812345678').valid).toBe(true);
    expect(validatePhone('19900001111').valid).toBe(true);
  });

  it('should reject phone not starting with 1[3-9]', () => {
    expect(validatePhone('12345678901').valid).toBe(false);
    expect(validatePhone('10345678901').valid).toBe(false);
  });

  it('should reject phone with wrong length', () => {
    expect(validatePhone('1381234567').valid).toBe(false);
    expect(validatePhone('138123456789').valid).toBe(false);
  });

  it('should reject non-numeric phone', () => {
    expect(validatePhone('1381234abcd').valid).toBe(false);
  });

  it('should reject empty string', () => {
    expect(validatePhone('').valid).toBe(false);
  });
});

describe('validateMemberInfo', () => {
  const validInfo = {
    nickName: '小明',
    phone: '13812345678',
    birthday: '1990-01-15',
  };

  it('should accept valid member info', () => {
    const result = validateMemberInfo(validInfo);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject nickName shorter than 2 chars', () => {
    const result = validateMemberInfo({ ...validInfo, nickName: 'A' });
    expect(result.valid).toBe(false);
  });

  it('should reject nickName longer than 20 chars', () => {
    const result = validateMemberInfo({ ...validInfo, nickName: 'A'.repeat(21) });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid phone', () => {
    const result = validateMemberInfo({ ...validInfo, phone: '12345' });
    expect(result.valid).toBe(false);
  });

  it('should reject invalid birthday format', () => {
    const result = validateMemberInfo({ ...validInfo, birthday: '01-15-1990' });
    expect(result.valid).toBe(false);
  });

  it('should collect all errors', () => {
    const result = validateMemberInfo({
      nickName: 'A',
      phone: '123',
      birthday: 'bad',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateServiceItem', () => {
  const validItem = { name: '美甲基础款', price: 9900, duration: 60 };

  it('should accept valid service item', () => {
    const result = validateServiceItem(validItem);
    expect(result.valid).toBe(true);
  });

  it('should reject name shorter than 2 chars', () => {
    expect(validateServiceItem({ ...validItem, name: 'A' }).valid).toBe(false);
  });

  it('should reject name longer than 30 chars', () => {
    expect(validateServiceItem({ ...validItem, name: 'A'.repeat(31) }).valid).toBe(false);
  });

  it('should reject price <= 0', () => {
    expect(validateServiceItem({ ...validItem, price: 0 }).valid).toBe(false);
    expect(validateServiceItem({ ...validItem, price: -100 }).valid).toBe(false);
  });

  it('should reject non-integer duration', () => {
    expect(validateServiceItem({ ...validItem, duration: 30.5 }).valid).toBe(false);
  });

  it('should reject duration <= 0', () => {
    expect(validateServiceItem({ ...validItem, duration: 0 }).valid).toBe(false);
    expect(validateServiceItem({ ...validItem, duration: -1 }).valid).toBe(false);
  });
});

describe('validateDiscountLevel', () => {
  const validLevel = { name: '银卡折扣', discountRate: 90, minRechargeAmount: 100000 };

  it('should accept valid discount level', () => {
    expect(validateDiscountLevel(validLevel).valid).toBe(true);
  });

  it('should reject name shorter than 2 chars', () => {
    expect(validateDiscountLevel({ ...validLevel, name: 'A' }).valid).toBe(false);
  });

  it('should reject name longer than 20 chars', () => {
    expect(validateDiscountLevel({ ...validLevel, name: 'A'.repeat(21) }).valid).toBe(false);
  });

  it('should reject discountRate < 1', () => {
    expect(validateDiscountLevel({ ...validLevel, discountRate: 0 }).valid).toBe(false);
  });

  it('should reject discountRate > 99', () => {
    expect(validateDiscountLevel({ ...validLevel, discountRate: 100 }).valid).toBe(false);
  });

  it('should reject non-integer discountRate', () => {
    expect(validateDiscountLevel({ ...validLevel, discountRate: 50.5 }).valid).toBe(false);
  });

  it('should reject minRechargeAmount < 0', () => {
    expect(validateDiscountLevel({ ...validLevel, minRechargeAmount: -1 }).valid).toBe(false);
  });

  it('should accept minRechargeAmount = 0', () => {
    expect(validateDiscountLevel({ ...validLevel, minRechargeAmount: 0 }).valid).toBe(true);
  });

  it('should accept boundary discountRate values (1 and 99)', () => {
    expect(validateDiscountLevel({ ...validLevel, discountRate: 1 }).valid).toBe(true);
    expect(validateDiscountLevel({ ...validLevel, discountRate: 99 }).valid).toBe(true);
  });
});

describe('validateCommissionRate', () => {
  it('should accept valid rates (1–100 integer)', () => {
    expect(validateCommissionRate(1).valid).toBe(true);
    expect(validateCommissionRate(30).valid).toBe(true);
    expect(validateCommissionRate(100).valid).toBe(true);
  });

  it('should reject rate < 1', () => {
    expect(validateCommissionRate(0).valid).toBe(false);
  });

  it('should reject rate > 100', () => {
    expect(validateCommissionRate(101).valid).toBe(false);
  });

  it('should reject non-integer rate', () => {
    expect(validateCommissionRate(50.5).valid).toBe(false);
  });
});
