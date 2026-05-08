import { describe, it, expect } from 'vitest';
import { calculateDiscountedAmount } from '@/utils/discount';

describe('calculateDiscountedAmount', () => {
  it('should calculate 80% discount (8折) correctly', () => {
    // 100元 (10000分) * 80% = 80元 (8000分)
    expect(calculateDiscountedAmount(10000, 80)).toBe(8000);
  });

  it('should calculate 90% discount (9折) correctly', () => {
    // 100元 (10000分) * 90% = 90元 (9000分)
    expect(calculateDiscountedAmount(10000, 90)).toBe(9000);
  });

  it('should floor the result for non-exact divisions', () => {
    // 33分 * 80% = 26.4 → 26
    expect(calculateDiscountedAmount(33, 80)).toBe(26);
    // 1分 * 50% = 0.5 → 0
    expect(calculateDiscountedAmount(1, 50)).toBe(0);
  });

  it('should return 0 when originalAmount is 0', () => {
    expect(calculateDiscountedAmount(0, 80)).toBe(0);
  });

  it('should return 0 when originalAmount is negative', () => {
    expect(calculateDiscountedAmount(-100, 80)).toBe(0);
  });

  it('should handle discountRate of 1 (1折)', () => {
    // 10000分 * 1% = 100分
    expect(calculateDiscountedAmount(10000, 1)).toBe(100);
  });

  it('should handle discountRate of 99 (9.9折)', () => {
    // 10000分 * 99% = 9900分
    expect(calculateDiscountedAmount(10000, 99)).toBe(9900);
  });

  it('should handle large amounts correctly', () => {
    // 1000000分 (10000元) * 80% = 800000分
    expect(calculateDiscountedAmount(1000000, 80)).toBe(800000);
  });
});
