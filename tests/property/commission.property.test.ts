import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { calculateCommission } from '@/utils/commission';
import { validateCommissionRate } from '@/utils/validation';
import {
  MIN_COMMISSION_RATE,
  MAX_COMMISSION_RATE,
  DEFAULT_COMMISSION_RATE,
} from '@/constants/business';

// Feature: cy-admin, Property 15: 提成计算正确性
// **Validates: Requirements 7.2**
describe('cy-admin 提成计算属性测试', () => {
  it('Property 15: 任意非负金额和有效比例的提成等于 Math.floor(amount * rate / 100)', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        fc.integer({ min: MIN_COMMISSION_RATE, max: MAX_COMMISSION_RATE }),
        (serviceAmount, rate) => {
          const commission = calculateCommission(serviceAmount, rate);
          return commission === Math.floor(serviceAmount * rate / 100);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 15: 提成始终 <= 服务金额', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        fc.integer({ min: MIN_COMMISSION_RATE, max: MAX_COMMISSION_RATE }),
        (serviceAmount, rate) => {
          return calculateCommission(serviceAmount, rate) <= serviceAmount;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 15: 提成始终为非负整数', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 10_000_000 }),
        fc.integer({ min: MIN_COMMISSION_RATE, max: MAX_COMMISSION_RATE }),
        (serviceAmount, rate) => {
          const commission = calculateCommission(serviceAmount, rate);
          return commission >= 0 && Number.isInteger(commission);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 15: 固定比例下提成随金额单调非递减', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        fc.nat({ max: 10_000_000 }),
        fc.integer({ min: MIN_COMMISSION_RATE, max: MAX_COMMISSION_RATE }),
        (a, b, rate) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          return calculateCommission(hi, rate) >= calculateCommission(lo, rate);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 15: 默认提成比例为 30%', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10_000_000 }),
        (serviceAmount) => {
          const withDefault = calculateCommission(serviceAmount);
          const withExplicit = calculateCommission(serviceAmount, DEFAULT_COMMISSION_RATE);
          return withDefault === withExplicit;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: cy-admin, Property 16: 提成比例验证正确性
// **Validates: Requirements 7.3, 7.4**
describe('cy-admin 提成比例验证属性测试', () => {
  it('Property 16: 1–100 范围内的整数应被接受', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_COMMISSION_RATE, max: MAX_COMMISSION_RATE }),
        (rate) => {
          const result = validateCommissionRate(rate);
          return result.valid === true && result.errors.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 16: 小于 1 的整数应被拒绝', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 0 }),
        (rate) => {
          const result = validateCommissionRate(rate);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 16: 大于 100 的整数应被拒绝', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 101, max: 1_000_000 }),
        (rate) => {
          const result = validateCommissionRate(rate);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 16: 非整数浮点数应被拒绝', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true })
          .filter((n) => !Number.isInteger(n)),
        (rate) => {
          const result = validateCommissionRate(rate);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});
