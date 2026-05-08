import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { calculateDiscountedAmount } from '@/utils/discount';
import { validateDiscountLevel } from '@/utils/validation';

// Feature: cy-admin, Property 19: 会员卡折扣消费计算正确性
// **Validates: Requirements 10.6, 10.7**
describe('cy-admin 会员卡折扣消费计算属性测试', () => {
  it('Property 19: 任意非负金额和有效折扣比例的折后金额等于 Math.floor(amount * rate / 100)', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        fc.integer({ min: 1, max: 99 }),
        (originalAmount, discountRate) => {
          const discounted = calculateDiscountedAmount(originalAmount, discountRate);
          return discounted === Math.floor(originalAmount * discountRate / 100);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 19: 折后金额始终 <= 原始金额', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        fc.integer({ min: 1, max: 99 }),
        (originalAmount, discountRate) => {
          return calculateDiscountedAmount(originalAmount, discountRate) <= originalAmount;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 19: 折后金额始终为非负整数', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        fc.integer({ min: 1, max: 99 }),
        (originalAmount, discountRate) => {
          const discounted = calculateDiscountedAmount(originalAmount, discountRate);
          return discounted >= 0 && Number.isInteger(discounted);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 19: 固定折扣比例下折后金额随原始金额单调非递减', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        fc.nat({ max: 10_000_000 }),
        fc.integer({ min: 1, max: 99 }),
        (a, b, discountRate) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          return calculateDiscountedAmount(hi, discountRate) >= calculateDiscountedAmount(lo, discountRate);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 19: 固定金额下更低折扣比例产生更低折后金额', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        fc.integer({ min: 1, max: 99 }),
        fc.integer({ min: 1, max: 99 }),
        (originalAmount, rateA, rateB) => {
          const [loRate, hiRate] = rateA <= rateB ? [rateA, rateB] : [rateB, rateA];
          return calculateDiscountedAmount(originalAmount, hiRate) >= calculateDiscountedAmount(originalAmount, loRate);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('cy-admin 折扣等级验证属性测试', () => {
  it('Property 18: 合法折扣等级输入应通过校验', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }),
        fc.integer({ min: 1, max: 99 }),
        fc.nat({ max: 10_000_000 }),
        (name, discountRate, minRechargeAmount) => {
          const result = validateDiscountLevel({
            name,
            discountRate,
            minRechargeAmount,
          });
          return result.valid === true && result.errors.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 18: 非法折扣比例应被拒绝', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -1000, max: 0 }),
          fc.integer({ min: 100, max: 1000 }),
        ),
        (discountRate) => {
          const result = validateDiscountLevel({
            name: '金卡会员',
            discountRate,
            minRechargeAmount: 0,
          });
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});
