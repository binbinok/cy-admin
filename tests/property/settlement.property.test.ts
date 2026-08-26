import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
  computeSettlementAmounts,
  calculateSettlementPoints,
  calculateSettlementCommission,
} from '@/utils/settlement';

const priceArb = fc.integer({ min: 0, max: 1000000 });
const flagArb = fc.boolean();
const discountRateArb = fc.integer({ min: 1, max: 100 });

const priceItemArb = fc.record({
  price: priceArb,
  discountable: flagArb,
  commissionable: flagArb,
});

const customAddonArb = fc.record({ price: fc.integer({ min: 1, max: 100000 }) });

describe('结算价格规则不变量', () => {
  it('原价 = 基础项目金额 + 附加项目金额 + 自定义附加项金额', () => {
    fc.assert(
      fc.property(priceItemArb, fc.array(priceItemArb), fc.array(customAddonArb), (base, addons, customs) => {
        const result = computeSettlementAmounts({
          baseItem: base,
          addons,
          customAddons: customs,
          discountRate: 100,
          adjustAmount: 0,
        });
        const expected =
          base.price +
          addons.reduce((sum, item) => sum + item.price, 0) +
          customs.reduce((sum, item) => sum + item.price, 0);
        return result.originalAmount === expected;
      }),
    );
  });

  it('应收 = 原价 - 折扣，且折扣金额不超过可折扣项目总额', () => {
    fc.assert(
      fc.property(priceItemArb, fc.array(priceItemArb), discountRateArb, (base, addons, rate) => {
        const result = computeSettlementAmounts({
          baseItem: base,
          addons,
          customAddons: [],
          discountRate: rate,
          adjustAmount: 0,
        });
        const discountableTotal =
          (base.discountable ? base.price : 0) +
          addons.filter((a) => a.discountable).reduce((sum, a) => sum + a.price, 0);
        return (
          result.receivableAmount === result.originalAmount - result.discountAmount &&
          result.discountAmount >= 0 &&
          result.discountAmount <= discountableTotal
        );
      }),
    );
  });

  it('实收 = 应收 + 改价调整', () => {
    fc.assert(
      fc.property(
        priceItemArb,
        fc.array(priceItemArb),
        discountRateArb,
        fc.integer({ min: -100000, max: 100000 }),
        (base, addons, rate, adjust) => {
          const result = computeSettlementAmounts({
            baseItem: base,
            addons,
            customAddons: [],
            discountRate: rate,
            adjustAmount: adjust,
          });
          return result.actualAmount === result.receivableAmount + adjust;
        },
      ),
    );
  });

  it('折扣率 100 时折扣金额恒为 0', () => {
    fc.assert(
      fc.property(priceItemArb, fc.array(priceItemArb), (base, addons) => {
        const result = computeSettlementAmounts({
          baseItem: base,
          addons,
          customAddons: [],
          discountRate: 100,
          adjustAmount: 0,
        });
        return result.discountAmount === 0 && result.receivableAmount === result.originalAmount;
      }),
    );
  });

  it('不可折扣项目的金额不进入折扣基数', () => {
    fc.assert(
      fc.property(priceArb, priceArb, discountRateArb, (basePrice, addonPrice, rate) => {
        const result = computeSettlementAmounts({
          baseItem: { price: basePrice, discountable: false, commissionable: true },
          addons: [{ price: addonPrice, discountable: false, commissionable: true }],
          customAddons: [],
          discountRate: rate,
          adjustAmount: 0,
        });
        const withDiscountable = computeSettlementAmounts({
          baseItem: { price: basePrice, discountable: true, commissionable: true },
          addons: [{ price: addonPrice, discountable: false, commissionable: true }],
          customAddons: [],
          discountRate: rate,
          adjustAmount: 0,
        });
        return (
          result.discountAmount === 0 &&
          withDiscountable.discountAmount === basePrice - Math.floor((basePrice * rate) / 100)
        );
      }),
    );
  });
});

describe('积分与提成规则不变量', () => {
  it('积分 = floor(实收 / 10)，实收为 0 或负数时不产生积分', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000000 }), (amount) => {
        const points = calculateSettlementPoints(amount);
        if (amount <= 0) {
          return points === 0;
        }
        return points === Math.floor(amount / 10) && points >= 0;
      }),
    );
  });

  it('提成仅作用于可提成项目金额，不可提成项目不影响提成', () => {
    fc.assert(
      fc.property(
        priceArb,
        priceArb,
        fc.integer({ min: 1, max: 100 }),
        (basePrice, nonCommissionablePrice, rate) => {
          const withExtra = computeSettlementAmounts({
            baseItem: { price: basePrice, discountable: true, commissionable: true },
            addons: [
              { price: nonCommissionablePrice, discountable: true, commissionable: false },
            ],
            customAddons: [],
            discountRate: 100,
            adjustAmount: 0,
          });
          const withoutExtra = computeSettlementAmounts({
            baseItem: { price: basePrice, discountable: true, commissionable: true },
            addons: [],
            customAddons: [],
            discountRate: 100,
            adjustAmount: 0,
          });
          const commissionWithExtra = calculateSettlementCommission(
            withExtra.commissionableAmount,
            rate,
          );
          const commissionWithoutExtra = calculateSettlementCommission(
            withoutExtra.commissionableAmount,
            rate,
          );
          return (
            withExtra.commissionableAmount === withoutExtra.commissionableAmount &&
            withExtra.commissionableAmount === basePrice &&
            commissionWithExtra === commissionWithoutExtra
          );
        },
      ),
    );
  });

  it('提成金额 = floor(可提成金额 × 比例 / 100)，且不超过可提成金额', () => {
    fc.assert(
      fc.property(priceArb, fc.integer({ min: 1, max: 100 }), (amount, rate) => {
        const commission = calculateSettlementCommission(amount, rate);
        if (amount <= 0) {
          return commission === 0;
        }
        return commission === Math.floor((amount * rate) / 100) && commission <= amount;
      }),
    );
  });
});
